import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, KeyRound, Save } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { useServerFn } from "@tanstack/react-start";
import { adminListAllKeys, adminUpdateKeyLimit } from "@/server/admin.functions";

export const Route = createFileRoute("/admin/keys")({
  component: () => (
    <RequireAuth requireAdmin>
      <AppShell>
        <AdminKeysPage />
      </AppShell>
    </RequireAuth>
  ),
});

function AdminKeysPage() {
  const list = useServerFn(adminListAllKeys);
  const update = useServerFn(adminUpdateKeyLimit);
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState<Record<string, number>>({});

  async function reload() {
    setLoading(true);
    try {
      const ks = (await list()) as any[];
      setKeys(ks);
      setEdits(Object.fromEntries(ks.map((k) => [k.id, k.rate_limit_per_minute])));
    } finally { setLoading(false); }
  }
  useEffect(() => { reload(); }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center gap-3 mb-6">
        <KeyRound className="h-6 w-6 text-primary" />
        <h1 className="font-display text-2xl sm:text-3xl font-bold">Quản lý API keys</h1>
      </div>
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      ) : (
        <div className="space-y-3">
          {keys.map((k) => (
            <Card key={k.id} className="p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{k.name}</div>
                <div className="font-mono-vin text-xs text-muted-foreground truncate">{k.key_prefix}… · {k.owner_email}</div>
                {!k.is_active && <span className="text-[10px] px-2 py-0.5 rounded bg-destructive/15 text-destructive uppercase tracking-wider mt-1 inline-block">Tắt</span>}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number" min={1} max={100000}
                  value={edits[k.id] ?? k.rate_limit_per_minute}
                  onChange={(e) => setEdits({ ...edits, [k.id]: Number(e.target.value) })}
                  className="w-24 font-mono-vin"
                />
                <span className="text-xs text-muted-foreground">req/phút</span>
                <Button
                  size="sm"
                  onClick={async () => {
                    try {
                      await update({ data: { id: k.id, rate_limit_per_minute: edits[k.id] } });
                      toast.success("Đã cập nhật");
                      reload();
                    } catch (e) { toast.error((e as Error).message); }
                  }}
                >
                  <Save className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
