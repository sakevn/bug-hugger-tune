import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { decodeVin, VIN_REGEX } from "@/lib/vin-decoder";
import { z } from "zod";

const VinInput = z.object({
  vin: z.string().trim().min(11).max(17).regex(VIN_REGEX, "VIN không hợp lệ"),
});

// Authenticated user calls this from the dashboard. Logged with user_id via RLS-authed client.
export const decodeVinForUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => VinInput.parse(d))
  .handler(async ({ data, context }) => {
    const result = await decodeVin(data.vin);
    // Best-effort log; ignore failures (RLS may block direct insert without policy).
    try {
      await context.supabase.from("decode_logs").insert({
        user_id: context.userId,
        vin: result.vin,
        status_code: 200,
        source: result.source,
        result: result as any,
      });
    } catch {
      /* ignore logging errors */
    }
    return result;
  });

// Anonymous public decode (no auth, no API key). No logging since service role
// is not available in the server function runtime.
export const decodeVinPublic = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => VinInput.parse(d))
  .handler(async ({ data }) => {
    return await decodeVin(data.vin);
  });
