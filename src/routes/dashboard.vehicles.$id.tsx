import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2, Save, Upload, Trash2, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { VehicleRow } from "@/lib/vehicle-export";

export const Route = createFileRoute("/dashboard/vehicles/$id")({
  component: () => (
    <RequireAuth>
      <AppShell>
        <EditVehiclePage />
      </AppShell>
    </RequireAuth>
  ),
});

function EditVehiclePage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [v, setV] = useState<VehicleRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("vehicles").select("*").eq("id", id).maybeSingle();
    if (error) toast.error(error.message);
    setV((data as any) ?? null);
    setLoading(false);
    if (data?.registration_photo_url) {
      const { data: signed } = await supabase.storage
        .from("vehicle-docs")
        .createSignedUrl(data.registration_photo_url, 3600);
      setPhotoPreview(signed?.signedUrl ?? null);
    }
  }
  useEffect(() => { load(); }, [id]);

  function patch(p: Partial<VehicleRow>) {
    setV((prev) => (prev ? { ...prev, ...p } : prev));
  }

  async function save() {
    if (!v || !user) return;
    setSaving(true);
    const { error } = await supabase
      .from("vehicles")
      .update({
        owner_name: v.owner_name,
        address: v.address,
        engine_number: v.engine_number,
        color: v.color,
        license_plate: v.license_plate,
        seats: v.seats,
        registration_date: v.registration_date,
        notes: v.notes,
      })
      .eq("id", v.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Đã lưu");
  }

  async function uploadPhoto(file: File) {
    if (!user || !v) return;
    if (file.size > 10 * 1024 * 1024) return toast.error("Ảnh tối đa 10MB");
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/${v.id}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("vehicle-docs")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) return toast.error(upErr.message);
    const { error: dbErr } = await supabase
      .from("vehicles")
      .update({ registration_photo_url: path })
      .eq("id", v.id);
    if (dbErr) return toast.error(dbErr.message);
    patch({ registration_photo_url: path });
    const { data: signed } = await supabase.storage
      .from("vehicle-docs")
      .createSignedUrl(path, 3600);
    setPhotoPreview(signed?.signedUrl ?? null);
    toast.success("Đã tải ảnh giấy đăng ký");
  }

  async function removePhoto() {
    if (!v?.registration_photo_url) return;
    await supabase.storage.from("vehicle-docs").remove([v.registration_photo_url]);
    await supabase.from("vehicles").update({ registration_photo_url: null }).eq("id", v.id);
    patch({ registration_photo_url: null });
    setPhotoPreview(null);
    toast.success("Đã xoá ảnh");
  }

  async function deleteVehicle() {
    if (!v) return;
    if (!confirm("Xoá xe này khỏi tài sản?")) return;
    if (v.registration_photo_url) {
      await supabase.storage.from("vehicle-docs").remove([v.registration_photo_url]);
    }
    const { error } = await supabase.from("vehicles").delete().eq("id", v.id);
    if (error) return toast.error(error.message);
    toast.success("Đã xoá");
    nav({ to: "/dashboard/vehicles" });
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 text-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mx-auto" />
      </div>
    );
  }
  if (!v) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 text-center">
        <p>Không tìm thấy xe.</p>
        <Link to="/dashboard/vehicles" className="text-primary underline mt-4 inline-block">Quay lại</Link>
      </div>
    );
  }

  const d = (v.decoded ?? {}) as any;
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <Link to="/dashboard/vehicles" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> Tài sản của tôi
      </Link>

      <Card className="p-5 mb-6 bg-gradient-to-br from-primary/10 via-transparent to-transparent">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-md bg-primary/15 flex items-center justify-center text-primary">
            <Car className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display text-2xl font-bold truncate">
              {[d.make, d.model, d.model_year].filter(Boolean).join(" ") || "Không xác định"}
            </div>
            <div className="font-mono-vin text-xs text-muted-foreground break-all">{v.vin}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {[d.country, d.manufacturer].filter(Boolean).join(" · ") || "—"}
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="font-display font-semibold text-lg mb-4">Thông tin chủ xe</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FieldInput label="Tên chủ xe" value={v.owner_name} onChange={(s) => patch({ owner_name: s })} />
          <FieldInput label="Biển số xe" value={v.license_plate} onChange={(s) => patch({ license_plate: s })} mono />
          <FieldInput label="Số máy" value={v.engine_number} onChange={(s) => patch({ engine_number: s })} mono />
          <FieldInput label="Màu xe" value={v.color} onChange={(s) => patch({ color: s })} />
          <FieldInput
            label="Số chỗ ngồi"
            value={v.seats?.toString() ?? null}
            onChange={(s) => patch({ seats: s ? Number(s) : null })}
            type="number"
          />
          <FieldInput
            label="Ngày đăng ký"
            value={v.registration_date}
            onChange={(s) => patch({ registration_date: s || null })}
            type="date"
          />
          <div className="sm:col-span-2">
            <Label>Địa chỉ</Label>
            <Input
              value={v.address ?? ""}
              onChange={(e) => patch({ address: e.target.value })}
              className="mt-1.5"
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Ghi chú</Label>
            <Textarea
              value={v.notes ?? ""}
              onChange={(e) => patch({ notes: e.target.value })}
              className="mt-1.5"
              rows={3}
            />
          </div>
        </div>

        <div className="mt-6">
          <Label>Ảnh giấy đăng ký xe</Label>
          <div className="mt-2 flex items-start gap-4">
            {photoPreview ? (
              <div className="relative">
                <img
                  src={photoPreview}
                  alt="Giấy đăng ký"
                  className="h-40 w-auto rounded-md border border-border/60 object-cover"
                />
              </div>
            ) : (
              <div className="h-40 w-56 rounded-md border border-dashed border-border/60 flex items-center justify-center text-muted-foreground text-xs">
                Chưa có ảnh
              </div>
            )}
            <div className="flex flex-col gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadPhoto(f);
                  e.target.value = "";
                }}
              />
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4 mr-1.5" /> {v.registration_photo_url ? "Thay ảnh" : "Tải lên"}
              </Button>
              {v.registration_photo_url && (
                <Button variant="ghost" size="sm" onClick={removePhoto} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-1.5" /> Xoá ảnh
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-2 justify-end border-t border-border/60 pt-5">
          <Button variant="ghost" className="text-destructive" onClick={deleteVehicle}>
            <Trash2 className="h-4 w-4 mr-1.5" /> Xoá xe
          </Button>
          <Button onClick={save} disabled={saving} className="bg-gradient-primary text-primary-foreground">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
            Lưu thay đổi
          </Button>
        </div>
      </Card>
    </div>
  );
}

function FieldInput({
  label, value, onChange, mono, type = "text",
}: {
  label: string;
  value: string | null | undefined;
  onChange: (s: string) => void;
  mono?: boolean;
  type?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        className={`mt-1.5 ${mono ? "font-mono-vin" : ""}`}
      />
    </div>
  );
}
