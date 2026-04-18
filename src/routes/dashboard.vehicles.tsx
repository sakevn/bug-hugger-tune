import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Car, Plus, Pencil, Trash2, Download, FileJson, FileSpreadsheet, FileText,
  FileType, Loader2, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { exportVehicles, type VehicleRow } from "@/lib/vehicle-export";

export const Route = createFileRoute("/dashboard/vehicles")({
  component: () => (
    <RequireAuth>
      <AppShell>
        <VehiclesPage />
      </AppShell>
    </RequireAuth>
  ),
});

function VehiclesPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<VehicleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data as any) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      [r.vin, r.owner_name, r.license_plate, r.color, (r.decoded as any)?.make, (r.decoded as any)?.model]
        .filter(Boolean)
        .some((v: any) => String(v).toLowerCase().includes(s))
    );
  }, [rows, q]);

  async function remove(id: string) {
    if (!confirm("Xoá xe này khỏi tài sản của bạn?")) return;
    const { error } = await supabase.from("vehicles").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Đã xoá");
    load();
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-6">
        <div>
          <div className="inline-block text-[11px] uppercase tracking-[0.3em] text-primary font-semibold mb-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5">
            Tài sản của tôi
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold flex items-center gap-3">
            <Car className="h-8 w-8 text-primary" /> Xe đã lưu
          </h1>
          <p className="text-muted-foreground mt-1">Lưu thông tin VIN làm tài sản và xuất ra nhiều định dạng.</p>
        </div>
        <div className="sm:ml-auto flex items-center gap-2">
          <Input
            placeholder="Tìm theo VIN, biển số, chủ xe…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full sm:w-64"
          />
          <ExportMenu rows={filtered} disabled={!filtered.length} />
          <Link to="/dashboard">
            <Button className="bg-gradient-primary text-primary-foreground">
              <Plus className="h-4 w-4 mr-1" /> Quét thêm
            </Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Đang tải…
        </div>
      ) : !filtered.length ? (
        <Card className="p-10 text-center text-muted-foreground border-dashed">
          {rows.length === 0 ? (
            <>
              <Car className="h-10 w-10 mx-auto mb-3 opacity-50" />
              Chưa có xe nào. Hãy <Link to="/dashboard" className="text-primary underline">quét VIN</Link> rồi nhấn “Lưu vào tài sản”.
            </>
          ) : "Không có kết quả phù hợp."}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((v) => (
            <motion.div key={v.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="p-5 h-full flex flex-col hover:border-primary/40 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                    <Car className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-display font-semibold truncate">
                      {[(v.decoded as any)?.make, (v.decoded as any)?.model, (v.decoded as any)?.model_year]
                        .filter(Boolean).join(" ") || "Không xác định"}
                    </div>
                    <div className="font-mono-vin text-xs text-muted-foreground truncate">{v.vin}</div>
                  </div>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
                  <Field label="Chủ xe" value={v.owner_name} />
                  <Field label="Biển số" value={v.license_plate} mono />
                  <Field label="Màu xe" value={v.color} />
                  <Field label="Số chỗ" value={v.seats?.toString() ?? null} />
                </dl>
                <div className="mt-auto pt-4 flex gap-2">
                  <Link
                    to="/dashboard/vehicles/$id"
                    params={{ id: v.id }}
                    className="flex-1"
                  >
                    <Button variant="outline" size="sm" className="w-full">
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Cập nhật
                      <ChevronRight className="h-3.5 w-3.5 ml-auto" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(v.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
  return (
    <>
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground self-center">{label}</dt>
      <dd className={`text-right truncate ${mono ? "font-mono-vin text-xs" : ""}`}>
        {value || <span className="text-muted-foreground">—</span>}
      </dd>
    </>
  );
}

function ExportMenu({ rows, disabled }: { rows: VehicleRow[]; disabled: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={disabled}>
          <Download className="h-4 w-4 mr-1" /> Xuất
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => exportVehicles(rows, "csv")}>
          <FileSpreadsheet className="h-4 w-4 mr-2" /> CSV (UTF-8)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportVehicles(rows, "json")}>
          <FileJson className="h-4 w-4 mr-2" /> JSON
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportVehicles(rows, "xlsx")}>
          <FileType className="h-4 w-4 mr-2" /> Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportVehicles(rows, "pdf")}>
          <FileText className="h-4 w-4 mr-2" /> PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
