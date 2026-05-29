import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

const KYC_BASE = "https://kyc.baylenvietnam.com";

const StartInput = z.object({
  full_name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(6).max(20),
  document_type: z.enum(["national_id", "passport", "driver_license"]).default("national_id"),
});

export const startKycVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => StartInput.parse(d))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.BAYLEN_KYC_API_KEY ?? process.env.KYC_API_KEY;
    if (!apiKey) throw new Error("KYC_API_KEY chưa được cấu hình");
    const publicBase = process.env.PUBLIC_APP_URL ?? "https://bug-hugger-tune.lovable.app";
    const flowId = process.env.KYC_FLOW_ID;

    const res = await fetch(`${KYC_BASE}/api/public/v1/sessions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        vendor_data: context.userId,
        callback_url: `${publicBase}/dashboard/kyc`,
        language: "vi",
        ...(flowId ? { flow_id: flowId } : {}),
      }),
    });

    const text = await res.text();
    let body: any = null;
    try { body = JSON.parse(text); } catch { /* ignore */ }

    if (!res.ok) {
      throw new Error(
        `KYC API lỗi (${res.status}): ${body?.message || body?.error || text.slice(0, 200)}`
      );
    }
    if (!body?.session_id || !body?.url) {
      throw new Error("Phản hồi KYC thiếu session_id/url");
    }

    const { error } = await supabaseAdmin.from("kyc_verifications").insert({
      user_id: context.userId,
      verification_id: body.session_id,
      status: body.status ?? "Not Started",
      full_name: data.full_name,
      email: data.email,
      phone: data.phone,
      document_type: data.document_type,
      verification_url: body.url,
      payload: body,
    });
    if (error) throw new Error(error.message);

    return {
      verification_id: body.session_id as string,
      verification_url: body.url as string,
      status: (body.status as string) ?? "Not Started",
    };
  });

export const listMyKyc = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await supabaseAdmin
      .from("kyc_verifications")
      .select(
        "id, verification_id, status, full_name, country, risk_score, verification_url, created_at, verified_at"
      )
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return data ?? [];
  });