import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";

type MacroTargets = {
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
};

const MODEL_CANDIDATES = [
  "gemini-2.0-flash-001",
  "gemini-2.0-flash",
  "gemini-1.5-flash-002",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
  "gemini-1.0-pro",
  "gemini-pro",
];

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const normalizeStringList = (value: unknown, max = 12) =>
  Array.isArray(value)
    ? value.map(String).map((item) => item.trim()).filter(Boolean).slice(0, max)
    : [];

const parseJsonFromText = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed) return {};

  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const withoutCodeFence = trimmed
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/, "")
      .trim();

    try {
      return JSON.parse(withoutCodeFence) as Record<string, unknown>;
    } catch {
      const match = withoutCodeFence.match(/\{[\s\S]*\}/);
      if (!match) return {};
      return JSON.parse(match[0]) as Record<string, unknown>;
    }
  }
};

const normalizeTargets = (value: Record<string, unknown>): MacroTargets => ({
  protein_g: clamp(Math.round(toNumber(value.protein_g, 160)), 60, 350),
  carbs_g: clamp(Math.round(toNumber(value.carbs_g, 220)), 80, 600),
  fat_g: clamp(Math.round(toNumber(value.fat_g, 70)), 30, 220),
  fiber_g: clamp(Math.round(toNumber(value.fiber_g, 30)), 10, 80),
});

const toWeekly = (targets: MacroTargets) => ({
  protein_g: targets.protein_g * 7,
  carbs_g: targets.carbs_g * 7,
  fat_g: targets.fat_g * 7,
  fiber_g: targets.fiber_g * 7,
});

const buildFallbackPlan = (targets: MacroTargets) => {
  const weekly = toWeekly(targets);
  const proteinServings = clamp(Math.round(weekly.protein_g / 30), 14, 42);
  const carbServings = clamp(Math.round(weekly.carbs_g / 45), 14, 42);
  const fiberServings = clamp(Math.round(weekly.fiber_g / 8), 14, 42);

  return {
    summary: "Simple weekly staples to cover your protein, carbs, fat, and fiber targets.",
    items: [
      `Lean protein base (chicken, turkey, tuna, tofu, or tempeh): ${proteinServings} servings`,
      "Eggs or egg whites: 1-2 cartons/dozen",
      "Greek yogurt or cottage cheese: 4-7 single servings",
      `Carb base (rice, potatoes, oats, or whole-grain wraps): ${carbServings} servings`,
      `Beans or lentils (canned works): ${Math.max(6, Math.round(fiberServings / 2))} cans`,
      "Frozen vegetables (any mix): 4-7 bags",
      "Fruit (banana, apple, berries, or frozen fruit): 14-21 servings",
      "Healthy fats (olive oil, avocado, nuts/seeds): 7-14 servings",
    ],
    weekly_macros: weekly,
    source: "fallback" as const,
  };
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const payload = toRecord(body);
  const profile = toRecord(payload.profile);
  const targets = normalizeTargets(toRecord(payload.targets));
  const weekly = toWeekly(targets);

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(buildFallbackPlan(targets));
  }

  const context = {
    profile: {
      sex: String(profile.sex ?? "other"),
      average_steps_day: clamp(
        Math.round(toNumber(profile.average_steps_day ?? profile.avgSteps, 8000)),
        1000,
        40000,
      ),
    },
    daily_macro_targets: targets,
    weekly_macro_targets: weekly,
    preferences: {
      simple: true,
      low_cook_time: true,
    },
  };

  const prompt = `You are a practical nutrition coach.

Create a simple weekly grocery list to help hit macro targets.

Rules:
- Keep this STUPID SIMPLE.
- Do not assume specific pantry items.
- Use flexible wording with options (e.g., "chicken or tofu").
- Focus on protein, carbs, fat, fiber coverage.
- Keep prep low-cook and busy-person friendly.

Return STRICT JSON only:
{
  "summary": "1 sentence",
  "items": [
    "simple grocery line item with quantity guidance",
    "..."
  ]
}

Context:
${JSON.stringify(context, null, 2)}`;

  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      apiVersion: "v1beta",
    });

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
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("404") || message.includes("NOT_FOUND")) {
          lastError = error;
          continue;
        }
        throw error;
      }
    }

    if (!responseText) {
      throw lastError ?? new Error("No available Gemini model for this API key.");
    }

    const parsed = parseJsonFromText(responseText);
    const items = normalizeStringList(parsed.items, 14);
    const summary =
      typeof parsed.summary === "string"
        ? parsed.summary.trim()
        : "Simple weekly staples to support your macro targets.";

    if (!items.length) {
      return NextResponse.json(buildFallbackPlan(targets));
    }

    return NextResponse.json({
      summary,
      items,
      weekly_macros: weekly,
      source: "gemini",
    });
  } catch {
    return NextResponse.json(buildFallbackPlan(targets));
  }
}
