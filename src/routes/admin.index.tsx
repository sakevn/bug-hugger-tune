import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, ShieldOff, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { useServerFn } from "@tanstack/react-start";
import { adminListUsers, adminToggleRole } from "@/server/admin.functions";
import { useAccessToken } from "@/hooks/useAccessToken";

export const Route = createFileRoute("/admin/")({
  component: () => (
    <RequireAuth requireAdmin>
      <AppShell>
        <UsersAdmin />
      </AppShell>
    </RequireAuth>
  ),
});

function UsersAdmin() {
  const list = useServerFn(adminListUsers);
  const toggle = useServerFn(adminToggleRole);
  const { withAuth } = useAccessToken();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function reload() {
    setLoading(true);
    try { 
      setUsers((await list({ data: await withAuth({}) })) as any[]); 
    } catch (e) {
      toast.error((e as Error).message);
    } finally { 
      setLoading(false); 
    }
  }
  useEffect(() => { reload(); }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center gap-3 mb-6">
        <Users className="h-6 w-6 text-primary" />
        <h1 className="font-display text-2xl sm:text-3xl font-bold">Người dùng</h1>
      </div>
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      ) : (
        <div className="space-y-3">
          {users.map((u) => {
            const isAdmin = u.roles.includes("admin");
            return (
              <Card key={u.id} className="p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{u.display_name || u.email}</div>
                  <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    {u.key_count} key · Tham gia {new Date(u.created_at).toLocaleDateString("vi-VN")}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <span className="text-[10px] px-2 py-1 rounded bg-primary/15 text-primary uppercase tracking-wider">Admin</span>
                  )}
                  <Button
                    size="sm"
                    variant={isAdmin ? "outline" : "default"}
                    onClick={async () => {
                      try {
                        await toggle({ data: { user_id: u.id, make_admin: !isAdmin } });
                        reload();
                      } catch (e) { toast.error((e as Error).message); }
                    }}
                  >
                    {isAdmin ? <><ShieldOff className="h-4 w-4 mr-1" /> Bỏ admin</> : <><ShieldCheck className="h-4 w-4 mr-1" /> Cấp admin</>}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
