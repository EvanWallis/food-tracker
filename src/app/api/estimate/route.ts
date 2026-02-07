import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";

type NutrientTotals = {
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  saturated_fat_g: number;
  added_sugar_g: number;
  omega3_g: number;
  sodium_mg: number;
  cholesterol_mg: number;
  potassium_mg: number;
  magnesium_mg: number;
  calcium_mg: number;
  iron_mg: number;
  zinc_mg: number;
  choline_mg: number;
  vitamin_c_mg: number;
  vitamin_d_mcg: number;
  vitamin_b12_mcg: number;
  vitamin_b6_mg: number;
  folate_mcg: number;
  iodine_mcg: number;
  selenium_mcg: number;
  vitamin_a_mcg_rae: number;
  vitamin_e_mg: number;
  vitamin_k_mcg: number;
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

const NUTRIENT_KEYS: Array<keyof NutrientTotals> = [
  "protein_g",
  "carbs_g",
  "fat_g",
  "fiber_g",
  "saturated_fat_g",
  "added_sugar_g",
  "omega3_g",
  "sodium_mg",
  "cholesterol_mg",
  "potassium_mg",
  "magnesium_mg",
  "calcium_mg",
  "iron_mg",
  "zinc_mg",
  "choline_mg",
  "vitamin_c_mg",
  "vitamin_d_mcg",
  "vitamin_b12_mcg",
  "vitamin_b6_mg",
  "folate_mcg",
  "iodine_mcg",
  "selenium_mcg",
  "vitamin_a_mcg_rae",
  "vitamin_e_mg",
  "vitamin_k_mcg",
];

const NUTRIENT_LIMITS: Record<keyof NutrientTotals, { min: number; max: number }> = {
  protein_g: { min: 0, max: 400 },
  carbs_g: { min: 0, max: 800 },
  fat_g: { min: 0, max: 300 },
  fiber_g: { min: 0, max: 120 },
  saturated_fat_g: { min: 0, max: 120 },
  added_sugar_g: { min: 0, max: 300 },
  omega3_g: { min: 0, max: 20 },
  sodium_mg: { min: 0, max: 12000 },
  cholesterol_mg: { min: 0, max: 1200 },
  potassium_mg: { min: 0, max: 10000 },
  magnesium_mg: { min: 0, max: 2000 },
  calcium_mg: { min: 0, max: 3000 },
  iron_mg: { min: 0, max: 100 },
  zinc_mg: { min: 0, max: 80 },
  choline_mg: { min: 0, max: 2000 },
  vitamin_c_mg: { min: 0, max: 2000 },
  vitamin_d_mcg: { min: 0, max: 250 },
  vitamin_b12_mcg: { min: 0, max: 200 },
  vitamin_b6_mg: { min: 0, max: 50 },
  folate_mcg: { min: 0, max: 2000 },
  iodine_mcg: { min: 0, max: 2000 },
  selenium_mcg: { min: 0, max: 1000 },
  vitamin_a_mcg_rae: { min: 0, max: 4000 },
  vitamin_e_mg: { min: 0, max: 1000 },
  vitamin_k_mcg: { min: 0, max: 1500 },
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const sanitizeNutrients = (value: Record<string, unknown>): NutrientTotals => {
  const nutrients = {} as NutrientTotals;
  for (const key of NUTRIENT_KEYS) {
    const limits = NUTRIENT_LIMITS[key];
    nutrients[key] = clamp(toNumber(value[key], 0), limits.min, limits.max);
  }
  return nutrients;
};

const normalizeStringList = (value: unknown, max = 4) =>
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

const sizeWeightDefault: Record<string, number> = {
  small: 0.7,
  medium: 1.0,
  large: 1.3,
  "very large": 1.6,
};

const normalizeSizeLabel = (value: unknown) => {
  const raw = String(value ?? "").toLowerCase().trim();
  if (raw in sizeWeightDefault) return raw;
  return "medium";
};

const normalizeConfidence = (value: unknown) => {
  const raw = String(value ?? "").toLowerCase().trim();
  if (raw === "low" || raw === "high") return raw;
  return "medium";
};

export async function POST(request: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "Missing GEMINI_API_KEY on the server." },
      { status: 500 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const payload = toRecord(body);
  const mealText = typeof payload.mealText === "string" ? payload.mealText.trim() : "";

  if (!mealText) {
    return NextResponse.json({ error: "Meal text is required." }, { status: 400 });
  }

  const profile = toRecord(payload.profile);
  const targets = toRecord(payload.targets);
  const dayContext = toRecord(payload.day_context);
  const recommendationPreferences = toRecord(payload.recommendation_preferences);

  const heightCmFromImperial = (() => {
    const feet = clamp(Math.round(toNumber(profile.height_ft ?? profile.heightFt, 5)), 3, 8);
    const inches = clamp(Math.round(toNumber(profile.height_in ?? profile.heightIn, 8)), 0, 11);
    return Math.round((feet * 12 + inches) * 2.54);
  })();
  const weightKgFromImperial = toNumber(profile.weight_lbs ?? profile.weightLbs, 180) * 0.45359237;
  const avgStepsDay = clamp(
    Math.round(toNumber(profile.average_steps_day ?? profile.avgSteps, 8000)),
    1000,
    40000,
  );

  const normalizedProfile = {
    age: clamp(Math.round(toNumber(profile.age, 30)), 13, 100),
    height_cm: clamp(
      Math.round(toNumber(profile.height_cm ?? profile.heightCm, heightCmFromImperial)),
      120,
      230,
    ),
    weight_kg: clamp(
      Number(toNumber(profile.weight_kg ?? profile.weightKg, weightKgFromImperial).toFixed(1)),
      35,
      250,
    ),
    average_steps_day: avgStepsDay,
    sex:
      profile.sex === "female" || profile.sex === "male" || profile.sex === "other"
        ? profile.sex
        : "other",
    activity_band: avgStepsDay >= 12000 ? "high" : avgStepsDay >= 7000 ? "moderate" : "low",
  };

  const normalizedTargets = sanitizeNutrients(targets);
  const normalizedConsumed = sanitizeNutrients(toRecord(dayContext.nutrients_consumed));
  const optimalGoal = clamp(Math.round(toNumber(targets.optimal_goal, 80)), 50, 100);
  const recentMeals = Array.isArray(dayContext.recent_meals)
    ? dayContext.recent_meals
        .map((item) => toRecord(item))
        .map((item) => ({
          meal_text: typeof item.meal_text === "string" ? item.meal_text.trim() : "",
          optimal_score: clamp(Math.round(toNumber(item.optimal_score, 0)), 0, 100),
          feel_after:
            item.feel_after === null
              ? null
              : clamp(Math.round(toNumber(item.feel_after, 0)), 0, 5),
        }))
        .filter((item) => item.meal_text)
        .slice(0, 8)
    : [];

  const normalizedContext = {
    date: typeof dayContext.date === "string" ? dayContext.date : "",
    meal_count: clamp(Math.round(toNumber(dayContext.meal_count, 0)), 0, 50),
    daily_optimal_average: clamp(
      Math.round(toNumber(dayContext.daily_optimal_average, 0)),
      0,
      100,
    ),
    feel_average:
      dayContext.feel_average === null ? null : clamp(toNumber(dayContext.feel_average, 0), 0, 5),
    nutrients_consumed: normalizedConsumed,
    recent_meals: recentMeals,
  };

  const prompt = `You are a practical nutrition coach.

Your task:
Estimate this meal's nutrients and score how well it fits today's needs.

Important:
- Be directionally useful, not medically exact.
- Use the user's profile, targets, and what they already ate today.
- The recommendation must be tailored to today's gaps/excesses after this meal.
- Keep wording clear and actionable.
- For recommendation, default to SIMPLE and LOW COOK TIME meals.
- Prefer fast options: minimal ingredients, short prep, microwave/assembly/no-cook if possible.
- Treat saturated_fat_g, added_sugar_g, sodium_mg, and cholesterol_mg as upper-limit nutrients (lower is usually better).

Return STRICT JSON only with this exact shape:
{
  "optimal_score": 0-100 integer,
  "summary": "1-2 sentence explanation",
  "positive": ["up to 3 short bullets"],
  "improve": ["up to 3 short bullets"],
  "nutrients": {
    "protein_g": number,
    "carbs_g": number,
    "fat_g": number,
    "fiber_g": number,
    "saturated_fat_g": number,
    "added_sugar_g": number,
    "omega3_g": number,
    "sodium_mg": number,
    "cholesterol_mg": number,
    "potassium_mg": number,
    "magnesium_mg": number,
    "calcium_mg": number,
    "iron_mg": number,
    "zinc_mg": number,
    "choline_mg": number,
    "vitamin_c_mg": number,
    "vitamin_d_mcg": number,
    "vitamin_b12_mcg": number,
    "vitamin_b6_mg": number,
    "folate_mcg": number,
    "iodine_mcg": number,
    "selenium_mcg": number,
    "vitamin_a_mcg_rae": number,
    "vitamin_e_mg": number,
    "vitamin_k_mcg": number
  },
  "recommendation": "specific next meal suggestion for this user today",
  "size_label": "small | medium | large | very large",
  "size_weight": number,
  "confidence": "low | medium | high"
}

Context JSON:
${JSON.stringify(
  {
    meal_text: mealText,
    profile: normalizedProfile,
    targets: { ...normalizedTargets, optimal_goal: optimalGoal },
    day_context: normalizedContext,
    recommendation_preferences: {
      simple: recommendationPreferences.simple !== false,
      low_cook_time: recommendationPreferences.low_cook_time !== false,
    },
  },
  null,
  2,
)}`;

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
    const nutrients = sanitizeNutrients(toRecord(parsed.nutrients));
    const optimalScore = clamp(Math.round(toNumber(parsed.optimal_score, 0)), 0, 100);
    const summary =
      typeof parsed.summary === "string"
        ? parsed.summary.trim()
        : "Meal analyzed against your day targets.";
    const positive = normalizeStringList(parsed.positive, 3);
    const improve = normalizeStringList(parsed.improve, 3);
    const recommendation =
      typeof parsed.recommendation === "string" ? parsed.recommendation.trim() : "";
    const sizeLabel = normalizeSizeLabel(parsed.size_label);
    const sizeWeight = clamp(
      toNumber(parsed.size_weight, sizeWeightDefault[sizeLabel]),
      0.5,
      2,
    );
    const confidence = normalizeConfidence(parsed.confidence);

    return NextResponse.json({
      optimal_score: optimalScore,
      summary,
      positive,
      improve,
      nutrients,
      recommendation,
      size_label: sizeLabel,
      size_weight: sizeWeight,
      confidence,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Gemini estimate failed:", message);
    return NextResponse.json(
      { error: message || "Failed to estimate meal quality." },
      { status: 500 },
    );
  }
}
