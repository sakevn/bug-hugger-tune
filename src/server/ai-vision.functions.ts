// AI Vision: đọc VIN từ ảnh thông qua Vercel AI Gateway (Gemini Flash)
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  // data URL "data:image/jpeg;base64,..." hoặc base64 thuần
  imageBase64: z.string().min(50).max(20_000_000),
});

interface AiResult {
  vin: string | null;
  confidence: string | null;
  notes: string | null;
}

export const scanVinAi = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<AiResult> => {
    // Lovable AI Gateway - tự động dùng LOVABLE_API_KEY
    const gatewayUrl = "https://ai.gateway.lovable.dev/v1";
    const apiKey = process.env.LOVABLE_API_KEY;

    if (!apiKey) {
      throw new Error(
        "AI Vision chưa được cấu hình. LOVABLE_API_KEY không khả dụng."
      );
    }

    // Chuẩn hoá thành data URL
    const imageUrl = data.imageBase64.startsWith("data:")
      ? data.imageBase64
      : `data:image/jpeg;base64,${data.imageBase64}`;

    const systemPrompt =
      "Bạn là chuyên gia đọc số VIN (Vehicle Identification Number) từ ảnh. " +
      "VIN gồm đúng 17 ký tự A-Z (trừ I, O, Q) và số 0-9. " +
      "Trả về kết quả qua tool extract_vin. Nếu không đọc được, đặt vin=null và mô tả lý do trong notes.";

    const res = await fetch(`${gatewayUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Đọc VIN trong ảnh này." },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_vin",
              description: "Trả về kết quả VIN đọc được từ ảnh.",
              parameters: {
                type: "object",
                properties: {
                  vin: {
                    type: ["string", "null"],
                    description: "Đúng 17 ký tự VIN, hoặc null nếu không đọc được rõ",
                  },
                  confidence: {
                    type: ["string", "null"],
                    enum: ["low", "medium", "high", null],
                  },
                  notes: { type: ["string", "null"] },
                },
                required: ["vin", "confidence", "notes"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_vin" } },
      }),
    });

    if (res.status === 429) throw new Error("Quá nhiều yêu cầu, thử lại sau ít phút.");
    if (res.status === 402) throw new Error("Hết credit AI. Vui lòng nạp thêm credit Lovable AI.");
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`AI Gateway lỗi ${res.status}: ${t.slice(0, 200)}`);
    }

    const json = await res.json();
    const call = json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!call) {
      const text = json?.choices?.[0]?.message?.content;
      return { vin: null, confidence: null, notes: text || "AI không trả lời đúng định dạng." };
    }
    try {
      const parsed = JSON.parse(call);
      return {
        vin: typeof parsed.vin === "string" ? parsed.vin : null,
        confidence: parsed.confidence ?? null,
        notes: parsed.notes ?? null,
      };
    } catch {
      return { vin: null, confidence: null, notes: "Không phân tích được phản hồi AI." };
    }
  });
