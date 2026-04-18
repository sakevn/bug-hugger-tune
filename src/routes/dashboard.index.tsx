import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Loader2, Car, MapPin, Calendar, Factory, Hash, Wrench, Building2, Cpu, Fingerprint, ScanLine, Clock, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { VinScanner } from "@/components/VinScanner";
import { decodeVinForUser } from "@/server/decode.functions";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { VinResult } from "@/lib/vin-decoder";

export const Route = createFileRoute("/dashboard/")({
  component: () => (
    <RequireAuth>
      <AppShell>
        <DashboardPage />
      </AppShell>
    </RequireAuth>
  ),
});

interface HistoryRow {
  id: string;
  vin: string;
  source: string | null;
  result: any;
  created_at: string;
}

function DashboardPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [vin, setVin] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VinResult | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [saving, setSaving] = useState(false);
  const decodeFn = useServerFn(decodeVinForUser);

  async function saveToVehicles() {
    if (!result || !user) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("vehicles")
      .insert({
        user_id: user.id,
        vin: result.vin,
        decoded: result as any,
      })
      .select("id")
      .single();
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Đã lưu vào tài sản", { description: "Bạn có thể cập nhật chi tiết & ảnh đăng ký." });
    nav({ to: "/dashboard/vehicles/$id", params: { id: data!.id } });
  }

  async function loadHistory() {
    const { data } = await supabase
      .from("decode_logs")
      .select("id, vin, source, result, created_at")
      .order("created_at", { ascending: false })
      .limit(12);
    setHistory(data ?? []);
  }
  useEffect(() => { loadHistory(); }, []);

  async function handleDecode(input?: string) {
    const v = (input ?? vin).trim().toUpperCase();
    if (v.length < 11) return toast.error("VIN cần tối thiểu 11 ký tự");
    setLoading(true);
    setResult(null);
    try {
      const r = await decodeFn({ data: { vin: v } });
      setResult(r);
      loadHistory();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <div className="text-center mb-8">
        <div className="inline-block text-[11px] uppercase tracking-[0.3em] text-primary font-semibold mb-3 px-3 py-1 rounded-full border border-primary/30 bg-primary/5">
          Vehicle Identification Number
        </div>
        <h1 className="font-display text-3xl sm:text-5xl font-bold">
          Giải mã <span className="bg-gradient-primary bg-clip-text text-transparent">VIN</span>
        </h1>
        <p className="text-muted-foreground mt-3">Nhập 17 ký tự hoặc quét bằng camera.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
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
          disabled={loading}
          size="lg"
          className="h-14 px-8 bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-amber"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
          <span className="ml-2 font-semibold">Tra cứu</span>
        </Button>
      </div>

      <VinScanner
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onDetected={(v) => { setVin(v); handleDecode(v); }}
      />

      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            key={result.vin}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-8"
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
                  Lưu xe này vào tài sản để cập nhật biển số, chủ xe, tải ảnh đăng ký…
                </div>
                <Button
                  size="sm"
                  onClick={saveToVehicles}
                  disabled={saving}
                  className="bg-gradient-primary text-primary-foreground"
                >
                  {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Bookmark className="h-4 w-4 mr-1.5" />}
                  Lưu vào tài sản
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {history.length > 0 && (
        <div className="mt-14">
          <div className="flex items-center gap-2 mb-4 text-xs uppercase tracking-widest text-muted-foreground font-semibold">
            <Clock className="h-4 w-4" /> Tra cứu gần đây
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {history.map((r) => (
              <Card key={r.id} className="p-4 hover:border-primary/40 transition-colors">
                <div className="font-mono-vin text-xs text-muted-foreground truncate">{r.vin}</div>
                <div className="font-display font-semibold mt-1 truncate">
                  {[r.result?.make, r.result?.model, r.result?.model_year].filter(Boolean).join(" ") || "Không xác định"}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{r.result?.country || "—"}</div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
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
