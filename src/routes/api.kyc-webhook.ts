import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import crypto from "node:crypto";

function safeEq(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export const Route = createFileRoute("/api/kyc-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.KYC_WEBHOOK_SECRET;
        if (!secret) return new Response("Server misconfigured", { status: 500 });

        const raw = await request.text();
        const headerSig = request.headers.get("x-signature") ?? "";
        const sig = headerSig.startsWith("sha256=") ? headerSig.slice(7) : headerSig;
        const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
        if (!sig || !safeEq(sig, expected)) {
          return new Response("Invalid signature", { status: 401 });
        }

        let payload: any;
        try { payload = JSON.parse(raw); } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const verification_id = payload?.verification_id;
        if (!verification_id) return new Response("Missing verification_id", { status: 400 });

        const event: string = payload?.event ?? "";
        const newStatus: string =
          payload?.status ??
          (event === "verification.completed" ? "approved"
            : event === "verification.failed" ? "failed"
            : event === "verification.review_required" ? "review"
            : event === "verification.expired" ? "expired"
            : "pending");

        const update: Record<string, unknown> = {
          status: newStatus,
          payload,
        };
        if (payload?.country) update.country = payload.country;
        if (typeof payload?.risk_score === "number") update.risk_score = payload.risk_score;
        if (payload?.full_name) update.full_name = payload.full_name;
        if (payload?.verified_at) update.verified_at = payload.verified_at;

        const { data: row, error } = await supabaseAdmin
          .from("kyc_verifications")
          .update(update)
          .eq("verification_id", verification_id)
          .select("user_id")
          .maybeSingle();

        if (error) return new Response(error.message, { status: 500 });
        if (!row) return new Response("Not found", { status: 404 });

        // Sync quick status on profile
        const profileStatus =
          newStatus === "approved" ? "verified"
            : newStatus === "failed" ? "failed"
            : newStatus === "review" ? "review"
            : newStatus === "expired" ? "expired"
            : "pending";
        await supabaseAdmin.from("profiles").update({ kyc_status: profileStatus }).eq("id", row.user_id);

        return Response.json({ ok: true });
      },
    },
  },
});