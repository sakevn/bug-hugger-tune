import { createFileRoute } from "@tanstack/react-router";
import { Code2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/dashboard/docs")({
  component: () => (
    <RequireAuth>
      <AppShell>
        <DocsPage />
      </AppShell>
    </RequireAuth>
  ),
});

function DocsPage() {
  const base = typeof window !== "undefined" ? window.location.origin : "https://your-app.lovable.app";
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center gap-3 mb-2">
        <Code2 className="h-6 w-6 text-primary" />
        <h1 className="font-display text-2xl sm:text-3xl font-bold">Tài liệu API</h1>
      </div>
      <p className="text-muted-foreground mb-8">
        Endpoint công khai cho ứng dụng của bạn. Auth bằng header <code className="font-mono-vin text-primary">X-Api-Key</code>.
      </p>

      <Section title="Endpoint">
        <Code>{`POST ${base}/api/decode
GET  ${base}/api/decode?vin=XXXX`}</Code>
      </Section>

      <Section title="Headers">
        <Code>{`X-Api-Key: vsk_xxxxxxxxxxxx
Content-Type: application/json    (cho POST)`}</Code>
      </Section>

      <Section title="Body (POST)">
        <Code>{`{ "vin": "5YJ3E1EA7KF317000" }`}</Code>
      </Section>

      <Section title="Phản hồi 200">
        <Code>{`{
  "vin": "5YJ3E1EA7KF317000",
  "make": "Tesla",
  "model": "Model 3",
  "model_year": "2019",
  "country": "United States",
  "manufacturer": "Tesla, Inc.",
  "body_class": "Sedan/Saloon",
  "vehicle_type": "PASSENGER CAR",
  "plant": "Fremont, United States",
  "engine": "Electric",
  "serial_number": "F317000",
  "source": "nhtsa+wmi"
}`}</Code>
      </Section>

      <Section title="Lỗi">
        <Code>{`401  { "error": "Missing X-Api-Key header" }
401  { "error": "Invalid API key" }
403  { "error": "API key is disabled" }
400  { "error": "VIN không hợp lệ" }
429  { "error": "Rate limit exceeded (60/phút)..." }
        Header: Retry-After, X-RateLimit-Limit, X-RateLimit-Remaining`}</Code>
      </Section>

      <Section title="Ví dụ curl">
        <Code>{`curl -X POST ${base}/api/decode \\
  -H "X-Api-Key: vsk_..." \\
  -H "Content-Type: application/json" \\
  -d '{"vin":"5YJ3E1EA7KF317000"}'`}</Code>
      </Section>

      <Section title="Ví dụ JavaScript">
        <Code>{`const res = await fetch("${base}/api/decode", {
  method: "POST",
  headers: {
    "X-Api-Key": "vsk_...",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ vin: "5YJ3E1EA7KF317000" })
});
const data = await res.json();
console.log(data.make, data.model);`}</Code>
      </Section>

      <Card className="p-5 mt-6 border-primary/30 bg-primary/5">
        <div className="text-sm">
          <strong>Rate limit:</strong> Mặc định 60 requests/phút mỗi key. Khi vượt giới hạn, API trả về <code className="font-mono-vin">HTTP 429</code>. Liên hệ admin để nâng giới hạn.
        </div>
      </Card>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="font-display text-lg font-semibold mb-2">{title}</h2>
      {children}
    </div>
  );
}
function Code({ children }: { children: React.ReactNode }) {
  return (
    <pre className="font-mono-vin text-xs sm:text-sm overflow-x-auto bg-card border border-border/60 rounded-lg p-4 whitespace-pre">
      {children}
    </pre>
  );
}
