import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

async function ensureAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden: admin only");
}

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.userId);
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, email, display_name, created_at")
      .order("created_at", { ascending: false });
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role");
    const { data: keys } = await supabaseAdmin
      .from("api_keys")
      .select("user_id");
    const keyCounts = new Map<string, number>();
    keys?.forEach((k) => keyCounts.set(k.user_id, (keyCounts.get(k.user_id) ?? 0) + 1));
    return (profiles ?? []).map((p) => ({
      ...p,
      roles: (roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role),
      key_count: keyCounts.get(p.id) ?? 0,
    }));
  });

export const adminListAllKeys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.userId);
    const { data: keys } = await supabaseAdmin
      .from("api_keys")
      .select("id, name, key_prefix, rate_limit_per_minute, is_active, user_id, created_at, last_used_at")
      .order("created_at", { ascending: false });
    const ids = Array.from(new Set((keys ?? []).map((k) => k.user_id)));
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const emailById = new Map(profiles?.map((p) => [p.id, p.email]) ?? []);
    return (keys ?? []).map((k) => ({ ...k, owner_email: emailById.get(k.user_id) ?? "" }));
  });

export const adminUpdateKeyLimit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), rate_limit_per_minute: z.number().int().min(1).max(100000) }).parse(d)
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("api_keys")
      .update({ rate_limit_per_minute: data.rate_limit_per_minute })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const adminToggleRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ user_id: z.string().uuid(), make_admin: z.boolean() }).parse(d)
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.userId);
    if (data.make_admin) {
      await supabaseAdmin.from("user_roles").upsert(
        { user_id: data.user_id, role: "admin" },
        { onConflict: "user_id,role" }
      );
    } else {
      // Prevent removing last admin
      const { count } = await supabaseAdmin
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role", "admin");
      if ((count ?? 0) <= 1) throw new Error("Không thể bỏ admin cuối cùng");
      await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.user_id)
        .eq("role", "admin");
    }
    return { success: true };
  });

export const adminListLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.userId);
    const { data } = await supabaseAdmin
      .from("decode_logs")
      .select("id, vin, status_code, source, created_at, user_id, api_key_id")
      .order("created_at", { ascending: false })
      .limit(100);
    return data ?? [];
  });
