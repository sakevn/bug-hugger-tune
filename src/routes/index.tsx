import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, ScanLine, KeyRound, Gauge, ShieldCheck, Code2,
  Search, Loader2, Hash, Car, MapPin, Calendar, Factory, Wrench,
  Building2, Cpu, Fingerprint, LogIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/useAuth";
import { VinScanner } from "@/components/VinScanner";
import { decodeVinPublic } from "@/server/decode.functions";
import type { VinResult } from "@/lib/vin-decoder";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const nav = useNavigate();

  const [vin, setVin] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<VinResult | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const decodeFn = useServerFn(decodeVinPublic);

  useEffect(() => {
    if (!loading && user) nav({ to: "/dashboard" });
  }, [user, loading, nav]);

  async function handleDecode(input?: string) {
    const v = (input ?? vin).trim().toUpperCase();
    if (v.length < 11) return toast.error("VIN cần tối thiểu 11 ký tự");
    setBusy(true);
    setResult(null);
    try {
      const r = await decodeFn({ data: { vin: v } });
      setResult(r);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      <header className="relative z-10 max-w-6xl mx-auto px-6 pt-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-display font-bold">
          <span className="h-8 w-8 rounded-md bg-gradient-primary flex items-center justify-center text-primary-foreground text-xs">VIN</span>
          Vin Decode Hub
        </Link>
        <Link to="/auth">
          <Button variant="ghost"><LogIn className="h-4 w-4 mr-1.5" /> Đăng nhập</Button>
        </Link>
      </header>

      <section className="relative z-10 max-w-4xl mx-auto px-6 pt-16 sm:pt-20 pb-10 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="inline-block text-[11px] uppercase tracking-[0.3em] text-primary font-semibold mb-5 px-3 py-1 rounded-full border border-primary/30 bg-primary/5">
            VIN Decoder · NHTSA + WMI Việt Nam · AI Vision
          </div>
          <h1 className="font-display text-4xl sm:text-6xl font-bold leading-[1.05]">
            Giải mã <span className="bg-gradient-primary bg-clip-text text-transparent">mọi mã VIN</span>
            <br className="hidden sm:block" /> chỉ trong vài giây
          </h1>
          <p className="mt-5 text-muted-foreground max-w-2xl mx-auto text-base sm:text-lg">
            Nhập VIN, quét bằng camera (mã vạch / OCR / AI Vision) hoặc tích hợp endpoint{" "}
            <code className="font-mono-vin text-primary">/api/decode</code>.
          </p>
        </motion.div>

        {/* VIN input — public, no login needed */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto">
          <div className="relative flex-1">
            <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              value={vin}
              onChange={(e) => setVin(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleDecode()}
              placeholder="VD: 5YJ3E1EA7KF317000"
              maxLength={17}
              className="font-mono-vin h-14 pl-12 pr-14 text-base"
            />
            <button
              type="button"
              onClick={() => setScannerOpen(true)}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-md flex items-center justify-center text-primary hover:bg-primary/10"
              aria-label="Quét bằng camera"
            >
              <ScanLine className="h-5 w-5" />
            </button>
          </div>
          <Button
            onClick={() => handleDecode()}
            disabled={busy}
            size="lg"
            className="h-14 px-8 bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-amber"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
            <span className="ml-2 font-semibold">Tra cứu</span>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Miễn phí · Không cần đăng nhập · <Link to="/auth" className="text-primary hover:underline">Đăng nhập</Link> để lưu xe và quản lý API keys
        </p>

        <VinScanner
          open={scannerOpen}
          onOpenChange={setScannerOpen}
          onDetected={(v) => { setVin(v); handleDecode(v); }}
        />
      </section>

      <AnimatePresence mode="wait">
        {result && (
          <motion.section
            key={result.vin}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="relative z-10 max-w-4xl mx-auto px-6 pb-12"
          >
            <Card className="overflow-hidden border-border/60 bg-card/80 backdrop-blur shadow-card">
              <div className="p-6 sm:p-8 bg-gradient-to-br from-primary/15 via-transparent to-transparent border-b border-border/60">
                <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-primary font-semibold">
                  <Car className="h-4 w-4" /> Thông tin xe
                </div>
                <h2 className="font-display text-3xl sm:text-4xl font-bold mt-2">
                  {[result.make, result.model, result.model_year].filter(Boolean).join(" ") || "Không xác định"}
                </h2>
                <p className="font-mono-vin text-sm text-muted-foreground mt-2 break-all">{result.vin}</p>
                <div className="mt-3 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-secondary border border-border/60 text-muted-foreground">
                  <span className={`w-1.5 h-1.5 rounded-full ${result.source.includes("nhtsa") ? "bg-green-400" : "bg-amber-400"}`} />
                  {result.source}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border/60">
                <InfoRow icon={<Factory className="h-4 w-4" />} label="Hãng" value={result.manufacturer} />
                <InfoRow icon={<MapPin className="h-4 w-4" />} label="Quốc gia" value={result.country} />
                <InfoRow icon={<Calendar className="h-4 w-4" />} label="Năm" value={result.model_year} />
                <InfoRow icon={<Wrench className="h-4 w-4" />} label="Loại xe" value={result.vehicle_type || result.body_class} />
                <InfoRow icon={<Building2 className="h-4 w-4" />} label="Nhà máy" value={result.plant} />
                <InfoRow icon={<Cpu className="h-4 w-4" />} label="Động cơ" value={result.engine} />
                <InfoRow icon={<Fingerprint className="h-4 w-4" />} label="Serial" value={result.serial_number} mono />
              </div>
              <div className="p-5 border-t border-border/60 bg-secondary/30 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-muted-foreground">
                  Muốn lưu xe này làm tài sản và tải ảnh đăng ký?
                </div>
                <Link to="/auth">
                  <Button size="sm" className="bg-gradient-primary text-primary-foreground">
                    Đăng nhập để lưu <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </Card>
          </motion.section>
        )}
      </AnimatePresence>

      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: ScanLine, title: "Quét VIN", desc: "Mã vạch · OCR · AI Vision (Gemini) cho ảnh khó." },
          { icon: KeyRound, title: "API Keys", desc: "Tạo nhiều key cho mỗi ứng dụng, vô hiệu khi cần." },
          { icon: Gauge, title: "Rate limit", desc: "60 req/phút mặc định, admin có thể nâng cấp." },
          { icon: ShieldCheck, title: "Bảo mật", desc: "Key chỉ hiển thị 1 lần, lưu dưới dạng SHA-256." },
        ].map((f) => (
          <div key={f.title} className="rounded-xl border border-border/60 bg-card/50 p-5">
            <f.icon className="h-6 w-6 text-primary mb-3" />
            <div className="font-semibold">{f.title}</div>
            <div className="text-sm text-muted-foreground mt-1">{f.desc}</div>
          </div>
        ))}
      </section>

      <section className="relative z-10 max-w-3xl mx-auto px-6 pb-24">
        <div className="rounded-xl border border-border/60 bg-card/60 p-5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground mb-3">
            <Code2 className="h-4 w-4" /> Ví dụ gọi API
          </div>
          <pre className="font-mono-vin text-xs sm:text-sm overflow-x-auto bg-background/60 rounded-lg p-4 border border-border/60">{`curl -X POST https://your-app.lovable.app/api/decode \\
  -H "X-Api-Key: vsk_..." \\
  -H "Content-Type: application/json" \\
  -d '{"vin":"5YJ3E1EA7KF317000"}'`}</pre>
        </div>
      </section>
    </main>
  );
}

function InfoRow({
  icon, label, value, mono,
}: { icon: React.ReactNode; label: string; value: string | null; mono?: boolean }) {
  return (
    <div className="p-5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        {icon} {label}
      </div>
      <div className={`mt-1.5 text-base ${mono ? "font-mono-vin" : "font-medium"}`}>
        {value || <span className="text-muted-foreground">—</span>}
      </div>
    </div>
  );
}
