import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Loader2, ShieldCheck, ExternalLink, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { startKycVerification, listMyKyc } from "@/server/kyc.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/kyc")({
  component: () => (
    <RequireAuth>
      <AppShell>
        <KycPage />
      </AppShell>
    </RequireAuth>
  ),
});

type Row = Awaited<ReturnType<typeof listMyKyc>>[number];

function statusVariant(s: string) {
  if (s === "approved" || s === "verified") return "default" as const;
  if (s === "failed" || s === "expired") return "destructive" as const;
  return "secondary" as const;
}

function KycPage() {
  const { user, displayName } = useAuth();
  const start = useServerFn(startKycVerification);
  const list = useServerFn(listMyKyc);

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [docType, setDocType] = useState<"national_id" | "passport" | "driver_license">("national_id");

  async function refresh() {
    setLoading(true);
    try {
      const data = await list();
      setRows(data);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setFullName(displayName ?? "");
    setEmail(user?.email ?? "");
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await start({
        data: { full_name: fullName, email, phone, document_type: docType },
      });
      toast.success("Đã tạo phiên xác minh, mở cửa sổ KYC…");
      window.open(r.verification_url, "_blank", "noopener,noreferrer");
      refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur p-6 sm:p-8 shadow-card"
      >
        <div className="flex items-center gap-3 mb-1">
          <span className="h-9 w-9 rounded-lg bg-gradient-primary flex items-center justify-center text-primary-foreground">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold">Xác thực danh tính (KYC)</h1>
            <p className="text-sm text-muted-foreground">
              Tích hợp Baylen KYC — xác minh CCCD, hộ chiếu hoặc GPLX qua quy trình an toàn.
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          <div>
            <Label htmlFor="full_name">Họ và tên</Label>
            <Input id="full_name" required maxLength={120} value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="phone">Số điện thoại</Label>
            <Input id="phone" required placeholder="+8498xxxxxxx" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="doc">Loại giấy tờ</Label>
            <select
              id="doc"
              value={docType}
              onChange={(e) => setDocType(e.target.value as typeof docType)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="national_id">CCCD / CMND</option>
              <option value="passport">Hộ chiếu</option>
              <option value="driver_license">GPLX</option>
            </select>
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <Button type="submit" disabled={busy} className="bg-gradient-primary text-primary-foreground hover:opacity-90">
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Bắt đầu xác minh
            </Button>
          </div>
        </form>
      </motion.div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-semibold">Phiên xác minh gần đây</h2>
          <Button variant="ghost" size="sm" onClick={refresh}>
            <RefreshCw className="h-4 w-4 mr-1.5" /> Làm mới
          </Button>
        </div>
        <div className="rounded-xl border border-border/60 bg-card/40 divide-y divide-border/60">
          {loading ? (
            <div className="p-6 flex items-center justify-center text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Đang tải…
            </div>
          ) : rows.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Chưa có phiên xác minh nào.
            </div>
          ) : (
            rows.map((r) => (
              <div key={r.id} className="p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{r.full_name || r.verification_id}</span>
                    <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                    {typeof r.risk_score === "number" && (
                      <span className="text-xs text-muted-foreground">Rủi ro: {r.risk_score}</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 truncate">
                    ID: {r.verification_id} · {new Date(r.created_at).toLocaleString("vi-VN")}
                  </div>
                </div>
                {r.verification_url && (
                  <a
                    href={r.verification_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Mở <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}