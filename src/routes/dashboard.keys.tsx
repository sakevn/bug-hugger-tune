import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2, Copy, Check, KeyRound, Loader2, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { useServerFn } from "@tanstack/react-start";
import { createApiKey, listApiKeys, deleteApiKey, toggleApiKey } from "@/server/api-keys.functions";
import { useAccessToken } from "@/hooks/useAccessToken";

export const Route = createFileRoute("/dashboard/keys")({
  component: () => (
    <RequireAuth>
      <AppShell>
        <KeysPage />
      </AppShell>
    </RequireAuth>
  ),
});

interface Key {
  id: string;
  name: string;
  key_prefix: string;
  rate_limit_per_minute: number;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
}

function KeysPage() {
  const list = useServerFn(listApiKeys);
  const create = useServerFn(createApiKey);
  const del = useServerFn(deleteApiKey);
  const toggle = useServerFn(toggleApiKey);
  const { withAuth } = useAccessToken();

  const [keys, setKeys] = useState<Key[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<{ key: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function reload() {
    setLoading(true);
    try { 
      const authData = await withAuth({});
      setKeys((await list({ data: authData })) as Key[]); 
    } catch (e) {
      toast.error((e as Error).message);
    } finally { 
      setLoading(false); 
    }
  }
  useEffect(() => { reload(); }, []);

  async function handleCreate() {
    if (!name.trim()) return toast.error("Nhập tên cho key");
    setCreating(true);
    try {
      const r = await create({ data: await withAuth({ name: name.trim() }) });
      setNewKey({ key: r.full_key });
      setName("");
      reload();
    } catch (e) { toast.error((e as Error).message); }
    finally { setCreating(false); }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center gap-3 mb-2">
        <KeyRound className="h-6 w-6 text-primary" />
        <h1 className="font-display text-2xl sm:text-3xl font-bold">API Keys</h1>
      </div>
      <p className="text-muted-foreground mb-8">
        Tạo key cho mỗi ứng dụng. Mặc định 60 requests/phút. Khi vượt giới hạn, API trả về HTTP 429.
      </p>

      <Card className="p-5 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Label htmlFor="kn">Tên key mới</Label>
            <Input id="kn" value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Mobile app production" />
          </div>
          <Button onClick={handleCreate} disabled={creating} className="self-end bg-gradient-primary text-primary-foreground hover:opacity-90">
            {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            Tạo key
          </Button>
        </div>
      </Card>

      {loading ? (
        <div className="text-center py-10 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline" /></div>
      ) : keys.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">Chưa có key nào.</Card>
      ) : (
        <div className="space-y-3">
          {keys.map((k) => (
            <Card key={k.id} className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:items-center">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="font-semibold">{k.name}</div>
                  {!k.is_active && <span className="text-[10px] px-2 py-0.5 rounded bg-destructive/15 text-destructive uppercase tracking-wider">Đã tắt</span>}
                </div>
                <div className="font-mono-vin text-xs text-muted-foreground mt-1 truncate">{k.key_prefix}…</div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  {k.rate_limit_per_minute} req/phút · Tạo {new Date(k.created_at).toLocaleString("vi-VN")}
                  {k.last_used_at && ` · Dùng lần cuối ${new Date(k.last_used_at).toLocaleString("vi-VN")}`}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs">
                  <Power className="h-3.5 w-3.5" />
                  <Switch
                    checked={k.is_active}
                    onCheckedChange={async (v) => {
                      try {
                        await toggle({ data: await withAuth({ id: k.id, is_active: v }) });
                        reload();
                      } catch (e) { toast.error((e as Error).message); }
                    }}
                  />
                </div>
                <Button
                  variant="ghost" size="icon"
                  onClick={async () => {
                    if (!confirm(`Xoá key "${k.name}"?`)) return;
                    try {
                      await del({ data: await withAuth({ id: k.id }) });
                      reload();
                    } catch (e) { toast.error((e as Error).message); }
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!newKey} onOpenChange={(o) => !o && setNewKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Key đã được tạo</DialogTitle>
            <DialogDescription>
              Đây là lần duy nhất key đầy đủ được hiển thị. Hãy lưu lại ngay.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-background border border-border/60 rounded-md p-3 font-mono-vin text-xs sm:text-sm break-all">
            {newKey?.key}
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                navigator.clipboard.writeText(newKey?.key ?? "");
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="bg-gradient-primary text-primary-foreground"
            >
              {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              {copied ? "Đã copy" : "Copy key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
