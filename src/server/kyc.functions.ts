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
    const apiKey = process.env.KYC_API_KEY;
    if (!apiKey) throw new Error("KYC_API_KEY chưa được cấu hình");

    const res = await fetch(`${KYC_BASE}/api/v1/verifications`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        full_name: data.full_name,
        email: data.email,
        phone: data.phone,
        document_type: data.document_type,
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
    if (!body?.verification_id || !body?.verification_url) {
      throw new Error("Phản hồi KYC thiếu verification_id/verification_url");
    }

    const { error } = await supabaseAdmin.from("kyc_verifications").insert({
      user_id: context.userId,
      verification_id: body.verification_id,
      status: body.status ?? "pending",
      full_name: data.full_name,
      email: data.email,
      phone: data.phone,
      document_type: data.document_type,
      verification_url: body.verification_url,
      payload: body,
    });
    if (error) throw new Error(error.message);

    return {
      verification_id: body.verification_id as string,
      verification_url: body.verification_url as string,
      status: (body.status as string) ?? "pending",
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