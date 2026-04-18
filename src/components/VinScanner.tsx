import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, X, Loader2, ScanLine, ImagePlus, Zap, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import Tesseract from "tesseract.js";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { scanVinAi } from "@/server/ai-vision.functions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDetected: (vin: string) => void;
}

const VIN_REGEX = /\b[A-HJ-NPR-Z0-9]{17}\b/;
const VIN_CHARSET = /[A-HJ-NPR-Z0-9]/g;

const sanitizeVinCandidate = (text: string): string | null => {
  const upper = text.toUpperCase().replace(/[IO]/g, "0").replace(/Q/g, "0");
  const cleaned = (upper.match(VIN_CHARSET) || []).join("");
  for (let i = 0; i + 17 <= cleaned.length; i++) {
    const window = cleaned.slice(i, i + 17);
    if (VIN_REGEX.test(window)) return window;
  }
  return null;
};

const fileToDataUrl = (file: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

const captureVideoFrame = (video: HTMLVideoElement, maxW = 1280): string | null => {
  if (video.readyState < 2 || video.videoWidth === 0) return null;
  const ratio = video.videoHeight / video.videoWidth;
  const w = Math.min(maxW, video.videoWidth);
  const h = Math.round(w * ratio);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.85);
};

export function VinScanner({ open, onOpenChange, onDetected }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const ocrRunningRef = useRef(false);
  const lastOcrAtRef = useRef(0);

  const [mode, setMode] = useState<"barcode" | "ocr" | "ai">("barcode");
  const [status, setStatus] = useState("Đang khởi động camera...");
  const [error, setError] = useState<string | null>(null);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);

  const scanAi = useServerFn(scanVinAi);

  const stopAll = useCallback(() => {
    try { controlsRef.current?.stop(); } catch { /* noop */ }
    controlsRef.current = null;
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const handleSuccess = useCallback((vin: string) => {
    stopAll();
    toast.success("Đã quét được VIN", { description: vin });
    onDetected(vin);
    onOpenChange(false);
  }, [onDetected, onOpenChange, stopAll]);

  const runAiOnDataUrl = useCallback(async (dataUrl: string) => {
    setAiBusy(true);
    setStatus("AI Vision đang phân tích ảnh...");
    try {
      const result = await scanAi({ data: { imageBase64: dataUrl } });
      const vin = sanitizeVinCandidate(result?.vin || "");
      if (vin) {
        const conf = result?.confidence ? ` (độ tin cậy: ${result.confidence})` : "";
        toast.success("AI đã đọc được VIN" + conf, { description: vin });
        handleSuccess(vin);
      } else {
        toast.error("AI không đọc rõ VIN", {
          description: result?.notes || "Hãy chụp gần hơn, đủ sáng và VIN nằm thẳng trong khung.",
        });
        setStatus("Đưa mã VIN vào trong khung");
      }
    } catch (e) {
      toast.error("Lỗi AI Vision", { description: (e as Error).message || "Không gọi được AI" });
      setStatus("Đưa mã VIN vào trong khung");
    } finally {
      setAiBusy(false);
    }
  }, [handleSuccess, scanAi]);

  const handleAiSnap = useCallback(async () => {
    if (!videoRef.current) return;
    const dataUrl = captureVideoFrame(videoRef.current);
    if (!dataUrl) {
      toast.error("Camera chưa sẵn sàng");
      return;
    }
    await runAiOnDataUrl(dataUrl);
  }, [runAiOnDataUrl]);

  const runOcrFrame = useCallback(async () => {
    if (ocrRunningRef.current || !videoRef.current) return;
    const video = videoRef.current;
    if (video.readyState < 2 || video.videoWidth === 0) return;
    ocrRunningRef.current = true;
    setOcrBusy(true);
    try {
      const w = video.videoWidth, h = video.videoHeight;
      const cropW = Math.floor(w * 0.86), cropH = Math.floor(h * 0.18);
      const cropX = Math.floor((w - cropW) / 2), cropY = Math.floor((h - cropH) / 2);
      const canvas = document.createElement("canvas");
      canvas.width = cropW; canvas.height = cropH;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
      const img = ctx.getImageData(0, 0, cropW, cropH);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const gray = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2];
        const v = gray > 130 ? 255 : 0;
        d[i] = d[i + 1] = d[i + 2] = v;
      }
      ctx.putImageData(img, 0, 0);
      const { data } = await Tesseract.recognize(canvas, "eng", {
        // @ts-expect-error tesseract param
        tessedit_char_whitelist: "ABCDEFGHJKLMNPRSTUVWXYZ0123456789",
      });
      const vin = sanitizeVinCandidate(data.text || "");
      if (vin) handleSuccess(vin);
    } catch (e) {
      console.error("OCR error", e);
    } finally {
      ocrRunningRef.current = false;
      setOcrBusy(false);
      lastOcrAtRef.current = Date.now();
    }
  }, [handleSuccess]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);
    setStatus("Đang khởi động camera...");
    (async () => {
      try {
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.CODE_39, BarcodeFormat.CODE_128, BarcodeFormat.DATA_MATRIX,
          BarcodeFormat.QR_CODE, BarcodeFormat.PDF_417,
        ]);
        hints.set(DecodeHintType.TRY_HARDER, true);
        const reader = new BrowserMultiFormatReader(hints);
        const controls = await reader.decodeFromConstraints(
          {
            video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
            audio: false,
          },
          videoRef.current!,
          (result) => {
            if (cancelled || !result) return;
            const vin = sanitizeVinCandidate(result.getText());
            if (vin) handleSuccess(vin);
          },
        );
        if (cancelled) { controls.stop(); return; }
        controlsRef.current = controls;
        setStatus("Đưa mã VIN vào trong khung");
      } catch (e) {
        setError((e as Error).message || "Không truy cập được camera");
        setStatus("");
      }
    })();
    return () => { cancelled = true; stopAll(); };
  }, [open, handleSuccess, stopAll]);

  useEffect(() => {
    if (!open || mode !== "ocr") return;
    const interval = setInterval(() => {
      if (Date.now() - lastOcrAtRef.current > 1200) runOcrFrame();
    }, 800);
    return () => clearInterval(interval);
  }, [open, mode, runOcrFrame]);

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (mode === "ai") {
      try {
        const dataUrl = await fileToDataUrl(file);
        await runAiOnDataUrl(dataUrl);
      } finally {
        if (e.target) e.target.value = "";
      }
      return;
    }

    setOcrBusy(true);
    setStatus("Đang nhận dạng VIN từ ảnh...");
    try {
      const reader = new BrowserMultiFormatReader();
      const url = URL.createObjectURL(file);
      try {
        const result = await reader.decodeFromImageUrl(url);
        const vin = sanitizeVinCandidate(result.getText());
        if (vin) { URL.revokeObjectURL(url); handleSuccess(vin); return; }
      } catch { /* fallback OCR */ }
      const { data } = await Tesseract.recognize(file, "eng", {
        // @ts-expect-error tesseract param
        tessedit_char_whitelist: "ABCDEFGHJKLMNPRSTUVWXYZ0123456789",
      });
      URL.revokeObjectURL(url);
      const vin = sanitizeVinCandidate(data.text || "");
      if (vin) handleSuccess(vin);
      else toast.error("Không tìm thấy VIN", { description: "Hãy thử chế độ AI Vision (chính xác hơn cho ảnh khó)." });
    } finally {
      setOcrBusy(false);
      setStatus("Đưa mã VIN vào trong khung");
      if (e.target) e.target.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) stopAll(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden bg-card border-border/60">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" /> Quét mã VIN bằng camera
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Hỗ trợ mã vạch, OCR chữ in và <span className="text-primary font-semibold">AI Vision</span> cho ảnh khó.
          </DialogDescription>
        </DialogHeader>

        <div className="relative aspect-[4/3] sm:aspect-video bg-black">
          <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted autoPlay />
          <div className="absolute inset-0 pointer-events-none">
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg border-2 border-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]"
              style={{ width: "86%", height: "18%" }}
            >
              <motion.div
                className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent"
                animate={{ top: ["0%", "100%", "0%"] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              />
              <span className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-primary" />
              <span className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-primary" />
              <span className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-primary" />
              <span className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-primary" />
            </div>
          </div>

          <AnimatePresence>
            {status && !error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-background/80 backdrop-blur text-xs text-foreground border border-border/60 flex items-center gap-1.5"
              >
                {ocrBusy || aiBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3 text-primary" />}
                {status}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 p-1 rounded-full bg-background/80 backdrop-blur border border-border/60">
            <ModeBtn active={mode === "barcode"} onClick={() => setMode("barcode")} icon={<Zap className="h-3 w-3" />} label="Mã vạch" />
            <ModeBtn active={mode === "ocr"} onClick={() => setMode("ocr")} icon={<ScanLine className="h-3 w-3" />} label="OCR" />
            <ModeBtn active={mode === "ai"} onClick={() => setMode("ai")} icon={<Sparkles className="h-3 w-3" />} label="AI Vision" />
          </div>

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/90 p-6 text-center">
              <div className="max-w-sm">
                <div className="text-destructive font-semibold mb-2">Không truy cập được camera</div>
                <p className="text-sm text-muted-foreground mb-4">{error}</p>
                <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
                  <X className="h-4 w-4 mr-1" /> Đóng
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-border/60 bg-secondary/30">
          <div className="text-xs text-muted-foreground hidden sm:block">
            {mode === "ai"
              ? "AI Vision: chụp/tải ảnh → Gemini đọc VIN cực chính xác."
              : "Mẹo: bật đèn pin, giữ máy cách tem VIN ~15cm."}
          </div>
          <div className="flex flex-wrap gap-2 ml-auto">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFilePick}
            />
            {mode === "ai" && (
              <Button
                size="sm"
                onClick={handleAiSnap}
                disabled={aiBusy || !!error}
                className="bg-gradient-to-r from-primary to-[var(--primary-glow)] text-primary-foreground"
              >
                {aiBusy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
                Quét bằng AI
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={ocrBusy || aiBusy}>
              <ImagePlus className="h-4 w-4 mr-1" /> Tải ảnh
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4 mr-1" /> Đóng
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ModeBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors flex items-center gap-1 ${
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon} {label}
    </button>
  );
}
