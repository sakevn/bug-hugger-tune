import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ScrollText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { useServerFn } from "@tanstack/react-start";
import { adminListLogs } from "@/server/admin.functions";

export const Route = createFileRoute("/admin/logs")({
  component: () => (
    <RequireAuth requireAdmin>
      <AppShell>
        <AdminLogsPage />
      </AppShell>
    </RequireAuth>
  ),
});

function AdminLogsPage() {
  const list = useServerFn(adminListLogs);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    list().then((d) => setLogs(d as any[])).finally(() => setLoading(false));
  }, [list]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center gap-3 mb-6">
        <ScrollText className="h-6 w-6 text-primary" />
        <h1 className="font-display text-2xl sm:text-3xl font-bold">Logs (100 gần nhất)</h1>
      </div>
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left p-3">Thời gian</th>
                  <th className="text-left p-3">VIN</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Source</th>
                  <th className="text-left p-3">Key</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-t border-border/60">
                    <td className="p-3 whitespace-nowrap">{new Date(l.created_at).toLocaleString("vi-VN")}</td>
                    <td className="p-3 font-mono-vin text-xs">{l.vin}</td>
                    <td className={`p-3 font-mono-vin ${l.status_code >= 400 ? "text-destructive" : "text-primary"}`}>{l.status_code}</td>
                    <td className="p-3 text-xs">{l.source || "—"}</td>
                    <td className="p-3 text-xs">{l.api_key_id ? "API" : "Web"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
