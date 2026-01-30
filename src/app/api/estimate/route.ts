import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";

const MODEL_CANDIDATES = [
  "gemini-2.0-flash-001",
  "gemini-2.0-flash",
  "gemini-1.5-flash-002",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
  "gemini-1.0-pro",
  "gemini-pro",
  "text-bison-001",
  "chat-bison-001",
];

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export async function POST(request: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "Missing GEMINI_API_KEY on the server." },
      { status: 500 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const mealText = typeof body.mealText === "string" ? body.mealText.trim() : "";

  if (!mealText) {
    return NextResponse.json({ error: "Meal text is required." }, { status: 400 });
  }

  const prompt = `You are a nutrition assistant. Estimate how much of a meal counts as whole foods.

Definition: Whole foods are minimally processed, mostly single-ingredient foods (fruit, vegetables, eggs, plain meat, beans, plain oats, nuts). Processed foods (chips, candy, soda, refined desserts) count as 0. Mixed foods (sandwich, pizza, cereal, burrito) should be estimated by component proportions. Be conservative.

Also estimate meal size based on the description and map it to a numeric weight:
- small = 0.7
- medium = 1.0
- large = 1.3
- very large = 1.6

Return strict JSON with keys:
percent (0-100 integer), reason (one sentence), whole_foods_items (array), non_whole_foods_items (array), size_label (small/medium/large/very large), size_weight (number).

Meal: "${mealText}"
`;

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    apiVersion: "v1beta",
  });

  try {
    let responseText = "";
    let lastError: unknown = null;

    for (const model of MODEL_CANDIDATES) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        });
        responseText = response.text ?? "";
        break;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes("404") || message.includes("NOT_FOUND")) {
          lastError = err;
          continue;
        }
        throw err;
      }
    }

    if (!responseText) {
      throw lastError ?? new Error("No available Gemini model for this API key.");
    }

    const parsed = (() => {
      try {
        return JSON.parse(responseText);
      } catch {
        const match = responseText.match(/\{[\s\S]*\}/);
        if (!match) return {};
        return JSON.parse(match[0]);
      }
    })();

    const percent = clamp(Number(parsed.percent) || 0, 0, 100);
    const sizeWeight = clamp(Number(parsed.size_weight) || 1, 0.5, 2);
    const sizeLabel = typeof parsed.size_label === "string" ? parsed.size_label : "medium";

    return NextResponse.json({
      percent,
      reason: typeof parsed.reason === "string" ? parsed.reason : "",
      whole_foods_items: Array.isArray(parsed.whole_foods_items)
        ? parsed.whole_foods_items.map(String)
        : [],
      non_whole_foods_items: Array.isArray(parsed.non_whole_foods_items)
        ? parsed.non_whole_foods_items.map(String)
        : [],
      size_label: sizeLabel,
      size_weight: sizeWeight,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Gemini estimate failed:", message);
    return NextResponse.json(
      { error: message || "Failed to estimate whole foods percent." },
      { status: 500 },
    );
  }
}
