import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";
import crypto from "node:crypto";

const NameInput = z.object({
  name: z.string().trim().min(1).max(80),
});

const IdInput = z.object({ id: z.string().uuid() });

function sha256(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

export const createApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => NameInput.parse(d))
  .handler(async ({ data, context }) => {
    const random = crypto.randomBytes(24).toString("base64url");
    const fullKey = `vsk_${random}`;
    const prefix = fullKey.slice(0, 12);
    const hash = sha256(fullKey);
    const { data: row, error } = await supabaseAdmin
      .from("api_keys")
      .insert({
        user_id: context.userId,
        name: data.name,
        key_prefix: prefix,
        key_hash: hash,
      })
      .select("id, name, key_prefix, rate_limit_per_minute, is_active, created_at")
      .single();
    if (error) throw new Error(error.message);
    // Return full key ONCE.
    return { ...row, full_key: fullKey };
  });

export const listApiKeys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await supabaseAdmin
      .from("api_keys")
      .select("id, name, key_prefix, rate_limit_per_minute, is_active, last_used_at, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const deleteApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => IdInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin
      .from("api_keys")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const toggleApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), is_active: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin
      .from("api_keys")
      .update({ is_active: data.is_active })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { success: true };
  });
