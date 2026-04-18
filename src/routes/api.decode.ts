import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { decodeVin, VIN_REGEX } from "@/lib/vin-decoder";
import crypto from "node:crypto";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Api-Key, Authorization",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS, ...extra },
  });
}

function sha256(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

async function checkRateLimit(apiKeyId: string, limit: number) {
  // 1-minute sliding bucket
  const now = new Date();
  const bucket = new Date(Math.floor(now.getTime() / 60000) * 60000).toISOString();

  // Try increment via upsert + RPC-less approach:
  // Insert if not exists, then increment.
  const { data: existing } = await supabaseAdmin
    .from("rate_limit_counters")
    .select("count")
    .eq("api_key_id", apiKeyId)
    .eq("minute_bucket", bucket)
    .maybeSingle();

  const next = (existing?.count ?? 0) + 1;
  if (next > limit) {
    return { allowed: false, remaining: 0, retryAfter: 60 - now.getSeconds() };
  }
  await supabaseAdmin.from("rate_limit_counters").upsert(
    { api_key_id: apiKeyId, minute_bucket: bucket, count: next },
    { onConflict: "api_key_id,minute_bucket" }
  );

  // Best-effort cleanup of old buckets (older than 5 min)
  const cutoff = new Date(now.getTime() - 5 * 60000).toISOString();
  void supabaseAdmin
    .from("rate_limit_counters")
    .delete()
    .lt("minute_bucket", cutoff);

  return { allowed: true, remaining: limit - next, retryAfter: 0 };
}

async function handle(request: Request, vinInput: string | null) {
  const apiKey = request.headers.get("x-api-key") || request.headers.get("X-Api-Key");
  if (!apiKey) {
    return json({ error: "Missing X-Api-Key header" }, 401);
  }
  const hash = sha256(apiKey);
  const { data: key, error: keyErr } = await supabaseAdmin
    .from("api_keys")
    .select("id, user_id, rate_limit_per_minute, is_active")
    .eq("key_hash", hash)
    .maybeSingle();

  if (keyErr || !key) return json({ error: "Invalid API key" }, 401);
  if (!key.is_active) return json({ error: "API key is disabled" }, 403);

  const vin = (vinInput ?? "").trim().toUpperCase();
  if (vin.length < 11 || vin.length > 17 || !VIN_REGEX.test(vin)) {
    return json({ error: "VIN không hợp lệ (11-17 ký tự, không I/O/Q)" }, 400);
  }

  const rl = await checkRateLimit(key.id, key.rate_limit_per_minute);
  const rlHeaders = {
    "X-RateLimit-Limit": String(key.rate_limit_per_minute),
    "X-RateLimit-Remaining": String(rl.remaining),
  };
  if (!rl.allowed) {
    await supabaseAdmin.from("decode_logs").insert({
      user_id: key.user_id,
      api_key_id: key.id,
      vin,
      status_code: 429,
      source: null,
      result: null,
      ip: request.headers.get("x-forwarded-for") || null,
    });
    return json(
      { error: `Rate limit exceeded (${key.rate_limit_per_minute}/phút). Liên hệ để nâng cấp giới hạn.` },
      429,
      { ...rlHeaders, "Retry-After": String(rl.retryAfter || 1) }
    );
  }

  const result = await decodeVin(vin);

  await Promise.all([
    supabaseAdmin.from("decode_logs").insert({
      user_id: key.user_id,
      api_key_id: key.id,
      vin: result.vin,
      status_code: 200,
      source: result.source,
      result: result as any,
      ip: request.headers.get("x-forwarded-for") || null,
    }),
    supabaseAdmin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", key.id),
  ]);

  return json(result, 200, rlHeaders);
}

export const Route = createFileRoute("/api/decode")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        return handle(request, url.searchParams.get("vin"));
      },
      POST: async ({ request }) => {
        let vin: string | null = null;
        try {
          const body = await request.json();
          vin = body?.vin ?? null;
        } catch {
          return json({ error: "Body phải là JSON { vin: string }" }, 400);
        }
        return handle(request, vin);
      },
    },
  },
});
