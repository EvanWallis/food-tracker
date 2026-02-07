"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";

type MealEntry = {
  id: string;
  mealText: string;
  timestamp: string;
  mood: string;
  wholeFoodsPercent: number;
  llmReason: string;
  notes: string | null;
  sizeLabel: string | null;
  sizeWeight: number | null;
};

type Sex = "female" | "male" | "other";
type ConfidenceLevel = "low" | "medium" | "high";

type NutritionProfile = {
  age: number;
  heightFt: number;
  heightIn: number;
  weightLbs: number;
  sex: Sex;
  avgSteps: number;
};

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

type EntryMetaV2 = {
  version: 2;
  feel_after: number | null;
  nutrients: NutrientTotals;
  positive: string[];
  improve: string[];
  recommendation: string;
  recommendation_options: string[];
  confidence: ConfidenceLevel;
};

type Estimate = {
  optimal_score: number;
  summary: string;
  positive: string[];
  improve: string[];
  nutrients: NutrientTotals;
  recommendation: string;
  recommendation_options: string[];
  size_label: string;
  size_weight: number;
  confidence: ConfidenceLevel;
};

type Draft = {
  mealText: string;
  optimalScore: number;
  llmReason: string;
  sizeLabel: string | null;
  sizeWeight: number | null;
  feelAfter: number | null;
  meta: EntryMetaV2 | null;
};

type WeeklyMacros = {
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
};

type GroceryPlan = {
  summary: string;
  items: string[];
  weekly_macros: WeeklyMacros;
  source: "gemini" | "fallback";
};

type NumericProfileField = "age" | "heightFt" | "heightIn" | "weightLbs" | "avgSteps";
type ProfileInputs = Record<NumericProfileField, string>;
type TargetInputs = Record<keyof NutrientTotals, string>;

const PROFILE_STORAGE_KEY = "food-tracker-profile-v1";
const TARGETS_STORAGE_KEY = "food-tracker-targets-v1";

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

const PRIMARY_NUTRIENT_KEYS: Array<keyof NutrientTotals> = [
  "protein_g",
  "carbs_g",
  "fat_g",
  "fiber_g",
  "saturated_fat_g",
  "added_sugar_g",
  "omega3_g",
  "sodium_mg",
  "cholesterol_mg",
];

const MICRONUTRIENT_KEYS: Array<keyof NutrientTotals> = [
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

const ESTIMATE_HIGHLIGHT_KEYS: Array<keyof NutrientTotals> = [
  "protein_g",
  "carbs_g",
  "fat_g",
  "fiber_g",
  "saturated_fat_g",
  "added_sugar_g",
  "omega3_g",
];

const UPPER_BOUND_KEYS = new Set<keyof NutrientTotals>([
  "saturated_fat_g",
  "added_sugar_g",
  "sodium_mg",
  "cholesterol_mg",
]);

const NUTRIENT_LABELS: Record<keyof NutrientTotals, string> = {
  protein_g: "Protein",
  carbs_g: "Carbs",
  fat_g: "Fat",
  fiber_g: "Fiber",
  saturated_fat_g: "Sat Fat",
  added_sugar_g: "Added Sugar",
  omega3_g: "Omega-3",
  sodium_mg: "Sodium",
  cholesterol_mg: "Cholesterol",
  potassium_mg: "Potassium",
  magnesium_mg: "Magnesium",
  calcium_mg: "Calcium",
  iron_mg: "Iron",
  zinc_mg: "Zinc",
  choline_mg: "Choline",
  vitamin_c_mg: "Vitamin C",
  vitamin_d_mcg: "Vitamin D",
  vitamin_b12_mcg: "Vitamin B12",
  vitamin_b6_mg: "Vitamin B6",
  folate_mcg: "Folate",
  iodine_mcg: "Iodine",
  selenium_mcg: "Selenium",
  vitamin_a_mcg_rae: "Vitamin A",
  vitamin_e_mg: "Vitamin E",
  vitamin_k_mcg: "Vitamin K",
};

const NUTRIENT_UNITS: Record<keyof NutrientTotals, string> = {
  protein_g: "g",
  carbs_g: "g",
  fat_g: "g",
  fiber_g: "g",
  saturated_fat_g: "g",
  added_sugar_g: "g",
  omega3_g: "g",
  sodium_mg: "mg",
  cholesterol_mg: "mg",
  potassium_mg: "mg",
  magnesium_mg: "mg",
  calcium_mg: "mg",
  iron_mg: "mg",
  zinc_mg: "mg",
  choline_mg: "mg",
  vitamin_c_mg: "mg",
  vitamin_d_mcg: "mcg",
  vitamin_b12_mcg: "mcg",
  vitamin_b6_mg: "mg",
  folate_mcg: "mcg",
  iodine_mcg: "mcg",
  selenium_mcg: "mcg",
  vitamin_a_mcg_rae: "mcg RAE",
  vitamin_e_mg: "mg",
  vitamin_k_mcg: "mcg",
};

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

const DEFAULT_PROFILE: NutritionProfile = {
  age: 34,
  heightFt: 5,
  heightIn: 10,
  weightLbs: 180,
  sex: "male",
  avgSteps: 8000,
};

const PROFILE_LIMITS: Record<NumericProfileField, { min: number; max: number }> = {
  age: { min: 13, max: 100 },
  heightFt: { min: 3, max: 8 },
  heightIn: { min: 0, max: 11 },
  weightLbs: { min: 80, max: 550 },
  avgSteps: { min: 1000, max: 40000 },
};

const toInputString = (value: number) =>
  Number.isFinite(value) ? String(Math.round(value * 10) / 10) : "";

const profileToInputs = (profile: NutritionProfile): ProfileInputs => ({
  age: toInputString(profile.age),
  heightFt: toInputString(profile.heightFt),
  heightIn: toInputString(profile.heightIn),
  weightLbs: toInputString(profile.weightLbs),
  avgSteps: toInputString(profile.avgSteps),
});

const targetsToInputs = (targets: NutrientTotals): TargetInputs => {
  const next = {} as TargetInputs;
  for (const key of NUTRIENT_KEYS) {
    next[key] = toInputString(targets[key]);
  }
  return next;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const lbsToKg = (lbs: number) => lbs * 0.45359237;
const kgToLbs = (kg: number) => kg * 2.20462262;
const feetInchesToCm = (feet: number, inches: number) => (feet * 12 + inches) * 2.54;
const cmToFeetInches = (cm: number) => {
  const totalInches = cm / 2.54;
  let feet = Math.floor(totalInches / 12);
  let inches = Math.round(totalInches - feet * 12);
  if (inches === 12) {
    feet += 1;
    inches = 0;
  }
  return { feet, inches };
};

const activityToSteps = (value: unknown) => {
  if (value === "low") return 5000;
  if (value === "high") return 12000;
  if (value === "moderate") return 8000;
  return 8000;
};

const emptyNutrients = (): NutrientTotals => ({
  protein_g: 0,
  carbs_g: 0,
  fat_g: 0,
  fiber_g: 0,
  saturated_fat_g: 0,
  added_sugar_g: 0,
  omega3_g: 0,
  sodium_mg: 0,
  cholesterol_mg: 0,
  potassium_mg: 0,
  magnesium_mg: 0,
  calcium_mg: 0,
  iron_mg: 0,
  zinc_mg: 0,
  choline_mg: 0,
  vitamin_c_mg: 0,
  vitamin_d_mcg: 0,
  vitamin_b12_mcg: 0,
  vitamin_b6_mg: 0,
  folate_mcg: 0,
  iodine_mcg: 0,
  selenium_mcg: 0,
  vitamin_a_mcg_rae: 0,
  vitamin_e_mg: 0,
  vitamin_k_mcg: 0,
});

const sanitizeNutrients = (
  value: Partial<Record<keyof NutrientTotals, unknown>> | null | undefined,
): NutrientTotals => {
  const base = emptyNutrients();
  for (const key of NUTRIENT_KEYS) {
    const limits = NUTRIENT_LIMITS[key];
    base[key] = clamp(toNumber(value?.[key], 0), limits.min, limits.max);
  }
  return base;
};

const mergeTargetsWithDefaults = (
  defaults: NutrientTotals,
  value: Partial<Record<keyof NutrientTotals, unknown>> | null | undefined,
): NutrientTotals => {
  const merged = { ...defaults };
  for (const key of NUTRIENT_KEYS) {
    const parsed = Number(value?.[key]);
    if (!Number.isFinite(parsed)) continue;
    const limits = NUTRIENT_LIMITS[key];
    merged[key] = clamp(parsed, limits.min, limits.max);
  }
  return merged;
};

const addNutrients = (a: NutrientTotals, b: NutrientTotals): NutrientTotals => {
  const combined = emptyNutrients();
  for (const key of NUTRIENT_KEYS) {
    const limits = NUTRIENT_LIMITS[key];
    combined[key] = clamp(a[key] + b[key], limits.min, limits.max);
  }
  return combined;
};

const computeDefaultTargets = (profile: NutritionProfile): NutrientTotals => {
  const weightKg = lbsToKg(profile.weightLbs);
  const protein = clamp(Math.round(weightKg * 1.6), 80, 220);
  const fat = clamp(Math.round(weightKg * 0.8), 45, 120);
  const carbsMultiplier =
    profile.avgSteps >= 12000 ? 3.1 : profile.avgSteps >= 7000 ? 2.4 : 1.8;
  const carbs = clamp(Math.round(weightKg * carbsMultiplier), 120, 420);
  const fiber = profile.sex === "male" ? 38 : profile.sex === "female" ? 28 : 33;
  const iron = profile.sex === "female" ? 18 : 11;
  const zinc = profile.sex === "female" ? 8 : 11;
  const magnesium = profile.sex === "female" ? 320 : profile.sex === "male" ? 420 : 370;
  const vitaminC =
    profile.sex === "female" ? 75 : profile.sex === "male" ? 90 : 82;
  const omega3 = profile.sex === "female" ? 1.1 : profile.sex === "male" ? 1.6 : 1.3;
  const choline = profile.sex === "female" ? 425 : profile.sex === "male" ? 550 : 500;
  const vitaminA = profile.sex === "female" ? 700 : profile.sex === "male" ? 900 : 800;
  const vitaminK = profile.sex === "female" ? 90 : profile.sex === "male" ? 120 : 105;

  return {
    protein_g: protein,
    carbs_g: carbs,
    fat_g: fat,
    fiber_g: fiber,
    saturated_fat_g: 20,
    added_sugar_g: 50,
    omega3_g: omega3,
    sodium_mg: 2300,
    cholesterol_mg: 300,
    potassium_mg: 3500,
    magnesium_mg: magnesium,
    calcium_mg: 1000,
    iron_mg: iron,
    zinc_mg: zinc,
    choline_mg: choline,
    vitamin_c_mg: vitaminC,
    vitamin_d_mcg: 15,
    vitamin_b12_mcg: 2.4,
    vitamin_b6_mg: 1.7,
    folate_mcg: 400,
    iodine_mcg: 150,
    selenium_mcg: 55,
    vitamin_a_mcg_rae: vitaminA,
    vitamin_e_mg: 15,
    vitamin_k_mcg: vitaminK,
  };
};

const parseEntryMeta = (notes: string | null): EntryMetaV2 | null => {
  if (!notes) return null;
  try {
    const parsed = JSON.parse(notes) as Partial<EntryMetaV2>;
    if (parsed.version !== 2) return null;
    const feelRaw = toNumber(parsed.feel_after, -1);
    const feelAfter = feelRaw >= 1 ? clamp(Math.round(feelRaw), 1, 5) : null;
    const positive = Array.isArray(parsed.positive)
      ? parsed.positive.map(String).map((item) => item.trim()).filter(Boolean).slice(0, 4)
      : [];
    const improve = Array.isArray(parsed.improve)
      ? parsed.improve.map(String).map((item) => item.trim()).filter(Boolean).slice(0, 4)
      : [];
    const confidenceRaw = String(parsed.confidence ?? "medium").toLowerCase();
    const confidence: ConfidenceLevel =
      confidenceRaw === "low" || confidenceRaw === "high" ? confidenceRaw : "medium";

    return {
      version: 2,
      feel_after: feelAfter,
      nutrients: sanitizeNutrients(parsed.nutrients),
      positive,
      improve,
      recommendation:
        typeof parsed.recommendation === "string" ? parsed.recommendation.trim() : "",
      recommendation_options: normalizeStringList(parsed.recommendation_options, 4),
      confidence,
    };
  } catch {
    return null;
  }
};

const normalizeStringList = (value: unknown, max = 4) =>
  Array.isArray(value)
    ? value.map(String).map((item) => item.trim()).filter(Boolean).slice(0, max)
    : [];

const normalizeEstimate = (value: unknown): Estimate => {
  const record =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const confidenceRaw = String(record.confidence ?? "medium").toLowerCase();
  const confidence: ConfidenceLevel =
    confidenceRaw === "low" || confidenceRaw === "high" ? confidenceRaw : "medium";

  return {
    optimal_score: clamp(Math.round(toNumber(record.optimal_score, 0)), 0, 100),
    summary: typeof record.summary === "string" ? record.summary.trim() : "",
    positive: normalizeStringList(record.positive, 3),
    improve: normalizeStringList(record.improve, 3),
    nutrients: sanitizeNutrients(
      record.nutrients && typeof record.nutrients === "object"
        ? (record.nutrients as Partial<Record<keyof NutrientTotals, unknown>>)
        : null,
    ),
    recommendation:
      typeof record.recommendation === "string" ? record.recommendation.trim() : "",
    recommendation_options: normalizeStringList(record.recommendation_options, 4),
    size_label: typeof record.size_label === "string" ? record.size_label : "medium",
    size_weight: clamp(toNumber(record.size_weight, 1), 0.5, 2),
    confidence,
  };
};

const getDayKey = (value: Date | string) => {
  const date = typeof value === "string" ? new Date(value) : value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDisplayTime = (value: string) => {
  const date = new Date(value);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

const weightedAverage = (entries: MealEntry[]) => {
  if (!entries.length) return 0;
  let weightSum = 0;
  let total = 0;
  for (const entry of entries) {
    const weight = entry.sizeWeight ?? 1;
    total += entry.wholeFoodsPercent * weight;
    weightSum += weight;
  }
  return weightSum ? Math.round(total / weightSum) : 0;
};

const getTrafficColor = (coverage: number) => {
  if (coverage >= 100) return "bg-emerald-500";
  if (coverage >= 75) return "bg-amber-400";
  return "bg-rose-500";
};

const sumNutrientsForEntries = (entries: MealEntry[]) =>
  entries.reduce((acc, entry) => {
    const meta = parseEntryMeta(entry.notes);
    if (!meta) return acc;
    return addNutrients(acc, meta.nutrients);
  }, emptyNutrients());

const getCoveragePercent = (actual: number, target: number) => {
  if (!target) return 0;
  return clamp(Math.round((actual / target) * 100), 0, 140);
};

const getUpperBoundCoveragePercent = (actual: number, target: number) => {
  if (!target) return 0;
  return clamp(Math.round((actual / target) * 100), 0, 140);
};

const getUpperBoundTrafficColor = (actual: number, target: number) => {
  if (!target) return "bg-slate-300";
  const ratio = (actual / target) * 100;
  if (ratio <= 70) return "bg-emerald-500";
  if (ratio <= 100) return "bg-amber-400";
  return "bg-rose-500";
};

const formatFeelLabel = (value: number | null) => {
  if (!value) return "Not rated";
  if (value <= 2) return `${value}/5 (low energy)`;
  if (value === 3) return "3/5 (neutral)";
  return `${value}/5 (good)`;
};

export default function Home() {
  const [entries, setEntries] = useState<MealEntry[]>([]);
  const [optimalGoal, setOptimalGoal] = useState(80);
  const [profile, setProfile] = useState<NutritionProfile>(DEFAULT_PROFILE);
  const [profileInputs, setProfileInputs] = useState<ProfileInputs>(() =>
    profileToInputs(DEFAULT_PROFILE),
  );
  const [targets, setTargets] = useState<NutrientTotals>(() =>
    computeDefaultTargets(DEFAULT_PROFILE),
  );
  const [targetInputs, setTargetInputs] = useState<TargetInputs>(() =>
    targetsToInputs(computeDefaultTargets(DEFAULT_PROFILE)),
  );
  const [prefsHydrated, setPrefsHydrated] = useState(false);
  const [draft, setDraft] = useState<Draft>({
    mealText: "",
    optimalScore: 80,
    llmReason: "",
    sizeLabel: null,
    sizeWeight: null,
    feelAfter: null,
    meta: null,
  });
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [readyToSave, setReadyToSave] = useState(false);
  const [isEstimating, setIsEstimating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groceryPlan, setGroceryPlan] = useState<GroceryPlan | null>(null);
  const [isGeneratingGrocery, setIsGeneratingGrocery] = useState(false);
  const [groceryError, setGroceryError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const loadData = async () => {
    const [entriesResponse, settingsResponse] = await Promise.all([
      fetch("/api/entries"),
      fetch("/api/settings"),
    ]);

    if (entriesResponse.ok) {
      const data = (await entriesResponse.json()) as MealEntry[];
      setEntries(data);
    }
    if (settingsResponse.ok) {
      const settings = (await settingsResponse.json()) as { goalPercent: number };
      setOptimalGoal(clamp(Math.round(toNumber(settings.goalPercent, 80)), 0, 100));
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      let resolvedProfile = DEFAULT_PROFILE;
      const profileRaw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
      if (profileRaw) {
        const parsed = JSON.parse(profileRaw) as Record<string, unknown>;
        const legacyHeightCm = clamp(
          Math.round(toNumber(parsed.heightCm, feetInchesToCm(5, 10))),
          120,
          230,
        );
        const legacyFeetInches = cmToFeetInches(legacyHeightCm);
        const legacyWeightKg = clamp(toNumber(parsed.weightKg, lbsToKg(180)), 35, 250);
        resolvedProfile = {
          age: clamp(Math.round(toNumber(parsed.age, DEFAULT_PROFILE.age)), 13, 100),
          heightFt: clamp(
            Math.round(toNumber(parsed.heightFt, legacyFeetInches.feet)),
            3,
            8,
          ),
          heightIn: clamp(
            Math.round(toNumber(parsed.heightIn, legacyFeetInches.inches)),
            0,
            11,
          ),
          weightLbs: clamp(
            Math.round(toNumber(parsed.weightLbs, kgToLbs(legacyWeightKg))),
            80,
            550,
          ),
          sex:
            parsed.sex === "female" || parsed.sex === "male" || parsed.sex === "other"
              ? parsed.sex
              : DEFAULT_PROFILE.sex,
          avgSteps: clamp(
            Math.round(
              toNumber(parsed.avgSteps, activityToSteps(parsed.activity)),
            ),
            1000,
            40000,
          ),
        };
      }
      setProfile(resolvedProfile);
      const defaultTargets = computeDefaultTargets(resolvedProfile);

      const targetsRaw = window.localStorage.getItem(TARGETS_STORAGE_KEY);
      if (targetsRaw) {
        const parsed = JSON.parse(targetsRaw) as Partial<
          Record<keyof NutrientTotals, unknown>
        >;
        setTargets(mergeTargetsWithDefaults(defaultTargets, parsed));
      } else {
        setTargets(defaultTargets);
      }
    } catch {
      setProfile(DEFAULT_PROFILE);
      setTargets(computeDefaultTargets(DEFAULT_PROFILE));
    } finally {
      setPrefsHydrated(true);
    }
  }, []);

  useEffect(() => {
    setProfileInputs(profileToInputs(profile));
  }, [profile]);

  useEffect(() => {
    setTargetInputs(targetsToInputs(targets));
  }, [targets]);

  useEffect(() => {
    if (!prefsHydrated || typeof window === "undefined") return;
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    window.localStorage.setItem(TARGETS_STORAGE_KEY, JSON.stringify(targets));
  }, [prefsHydrated, profile, targets]);

  const todayKey = getDayKey(new Date());
  const selectedKey = getDayKey(selectedDate);
  const isToday = selectedKey === todayKey;

  const selectedEntries = useMemo(
    () => entries.filter((entry) => getDayKey(entry.timestamp) === selectedKey),
    [entries, selectedKey],
  );

  const todayEntries = useMemo(
    () => entries.filter((entry) => getDayKey(entry.timestamp) === todayKey),
    [entries, todayKey],
  );

  const selectedAverage = useMemo(() => weightedAverage(selectedEntries), [selectedEntries]);
  const todayAverage = useMemo(() => weightedAverage(todayEntries), [todayEntries]);
  const selectedTotals = useMemo(
    () => sumNutrientsForEntries(selectedEntries),
    [selectedEntries],
  );
  const todayTotals = useMemo(() => sumNutrientsForEntries(todayEntries), [todayEntries]);

  const todayFeelAverage = useMemo(() => {
    const ratings = todayEntries
      .map((entry) => parseEntryMeta(entry.notes)?.feel_after ?? null)
      .filter((value): value is number => typeof value === "number");
    if (!ratings.length) return null;
    const total = ratings.reduce((sum, rating) => sum + rating, 0);
    return Number((total / ratings.length).toFixed(1));
  }, [todayEntries]);

  const selectedDateLabel = selectedDate.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const coverageTotals = useMemo(() => {
    if (isToday && estimate) return addNutrients(todayTotals, estimate.nutrients);
    return selectedTotals;
  }, [estimate, isToday, selectedTotals, todayTotals]);

  const dayOptimalCoverage = useMemo(() => {
    if (!optimalGoal) return 0;
    return clamp(Math.round((selectedAverage / optimalGoal) * 100), 0, 160);
  }, [optimalGoal, selectedAverage]);

  const estimateCoverage = useMemo(() => {
    if (!estimate || !optimalGoal) return 0;
    return clamp(Math.round((estimate.optimal_score / optimalGoal) * 100), 0, 160);
  }, [estimate, optimalGoal]);

  const selectedEntryRows = useMemo(
    () =>
      selectedEntries.map((entry) => ({
        entry,
        meta: parseEntryMeta(entry.notes),
      })),
    [selectedEntries],
  );

  const resetDraft = () => {
    setDraft({
      mealText: "",
      optimalScore: optimalGoal,
      llmReason: "",
      sizeLabel: null,
      sizeWeight: null,
      feelAfter: null,
      meta: null,
    });
    setEstimate(null);
    setReadyToSave(false);
  };

  const commitProfileInputs = () => {
    const next: NutritionProfile = {
      ...profile,
      age: profile.age,
      heightFt: profile.heightFt,
      heightIn: profile.heightIn,
      weightLbs: profile.weightLbs,
      avgSteps: profile.avgSteps,
    };

    (Object.keys(PROFILE_LIMITS) as NumericProfileField[]).forEach((field) => {
      const parsed = Number(profileInputs[field].trim());
      if (!Number.isFinite(parsed)) return;
      const limits = PROFILE_LIMITS[field];
      next[field] = clamp(Math.round(parsed), limits.min, limits.max);
    });

    setProfile(next);
    setProfileInputs(profileToInputs(next));
    return next;
  };

  const commitTargetInputs = () => {
    const next = { ...targets };

    NUTRIENT_KEYS.forEach((key) => {
      const parsed = Number(targetInputs[key].trim());
      if (!Number.isFinite(parsed)) return;
      const limits = NUTRIENT_LIMITS[key];
      next[key] = clamp(parsed, limits.min, limits.max);
    });

    setTargets(next);
    setTargetInputs(targetsToInputs(next));
    return next;
  };

  const runEstimate = async () => {
    setError(null);
    const committedProfile = commitProfileInputs();
    const committedTargets = commitTargetInputs();
    const mealText = draft.mealText.trim();
    if (!mealText) return;

    const recentMeals = todayEntries.slice(0, 6).map((entry) => ({
      meal_text: entry.mealText,
      optimal_score: entry.wholeFoodsPercent,
      feel_after: parseEntryMeta(entry.notes)?.feel_after ?? null,
    }));

    setIsEstimating(true);

    const response = await fetch("/api/estimate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mealText,
        profile: {
          age: committedProfile.age,
          sex: committedProfile.sex,
          height_ft: committedProfile.heightFt,
          height_in: committedProfile.heightIn,
          weight_lbs: committedProfile.weightLbs,
          average_steps_day: committedProfile.avgSteps,
        },
        targets: { ...committedTargets, optimal_goal: optimalGoal },
        day_context: {
          date: todayKey,
          meal_count: todayEntries.length,
          daily_optimal_average: todayAverage,
          nutrients_consumed: todayTotals,
          feel_average: todayFeelAverage,
          recent_meals: recentMeals,
        },
        recommendation_preferences: {
          simple: true,
          low_cook_time: true,
        },
      }),
    });

    setIsEstimating(false);

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      const message =
        typeof payload.error === "string"
          ? payload.error
          : "Could not estimate this meal right now.";
      setError(message);
      return;
    }

    const normalized = normalizeEstimate(await response.json());
    setEstimate(normalized);
    setDraft((prev) => ({
      ...prev,
      optimalScore: normalized.optimal_score,
      llmReason: normalized.summary,
      sizeLabel: normalized.size_label,
      sizeWeight: normalized.size_weight,
      meta: {
        version: 2,
        feel_after: prev.feelAfter,
        nutrients: normalized.nutrients,
        positive: normalized.positive,
        improve: normalized.improve,
        recommendation: normalized.recommendation,
        recommendation_options: normalized.recommendation_options,
        confidence: normalized.confidence,
      },
    }));
    setReadyToSave(true);
  };

  const runGroceryPlan = async () => {
    setGroceryError(null);
    const committedProfile = commitProfileInputs();
    const committedTargets = commitTargetInputs();

    setIsGeneratingGrocery(true);
    const response = await fetch("/api/grocery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile: {
          age: committedProfile.age,
          sex: committedProfile.sex,
          height_ft: committedProfile.heightFt,
          height_in: committedProfile.heightIn,
          weight_lbs: committedProfile.weightLbs,
          average_steps_day: committedProfile.avgSteps,
        },
        targets: committedTargets,
        excluded_ingredients: ["fish", "tuna", "salmon", "tofu", "tempeh", "beans", "lentils", "chickpeas"],
      }),
    });
    setIsGeneratingGrocery(false);

    const payload = toRecord(await response.json().catch(() => ({})));
    if (!response.ok) {
      const message =
        typeof payload.error === "string"
          ? payload.error
          : "Could not generate a grocery list right now.";
      setGroceryError(message);
      return;
    }

    const weeklyDefaults = {
      protein_g: committedTargets.protein_g * 7,
      carbs_g: committedTargets.carbs_g * 7,
      fat_g: committedTargets.fat_g * 7,
      fiber_g: committedTargets.fiber_g * 7,
    };
    const weeklyRaw = toRecord(payload.weekly_macros);
    const items = normalizeStringList(payload.items, 14);

    setGroceryPlan({
      summary:
        typeof payload.summary === "string"
          ? payload.summary.trim()
          : "Simple weekly staples to support your macro targets.",
      items: items.length ? items : ["No list items returned."],
      weekly_macros: {
        protein_g: clamp(Math.round(toNumber(weeklyRaw.protein_g, weeklyDefaults.protein_g)), 0, 5000),
        carbs_g: clamp(Math.round(toNumber(weeklyRaw.carbs_g, weeklyDefaults.carbs_g)), 0, 7000),
        fat_g: clamp(Math.round(toNumber(weeklyRaw.fat_g, weeklyDefaults.fat_g)), 0, 3000),
        fiber_g: clamp(Math.round(toNumber(weeklyRaw.fiber_g, weeklyDefaults.fiber_g)), 0, 1500),
      },
      source: payload.source === "fallback" ? "fallback" : "gemini",
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!readyToSave) {
      await runEstimate();
      return;
    }

    const mealText = draft.mealText.trim();
    if (!mealText) return;

    const meta: EntryMetaV2 = {
      version: 2,
      feel_after: draft.feelAfter,
      nutrients: draft.meta?.nutrients ?? emptyNutrients(),
      positive: draft.meta?.positive ?? [],
      improve: draft.meta?.improve ?? [],
      recommendation: draft.meta?.recommendation ?? "",
      recommendation_options: draft.meta?.recommendation_options ?? [],
      confidence: draft.meta?.confidence ?? "medium",
    };

    const payload = {
      mealText,
      timestamp: new Date().toISOString(),
      mood: draft.feelAfter ? `${draft.feelAfter}/5` : "Not rated",
      wholeFoodsPercent: draft.optimalScore,
      llmReason: draft.llmReason,
      notes: JSON.stringify(meta),
      sizeLabel: draft.sizeLabel,
      sizeWeight: draft.sizeWeight,
    };

    const response = await fetch("/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      setError("Could not save the entry. Try again.");
      return;
    }

    await loadData();
    resetDraft();
  };

  const handleMealChange = (value: string) => {
    setDraft((prev) => ({
      ...prev,
      mealText: value,
    }));

    if (readyToSave) {
      setReadyToSave(false);
      setEstimate(null);
      setDraft((prev) => ({
        ...prev,
        llmReason: "",
        sizeLabel: null,
        sizeWeight: null,
        meta: null,
      }));
    }
  };

  const handleGoalSave = async () => {
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goalPercent: optimalGoal }),
    });
  };

  const deleteEntry = async (id: string) => {
    const confirmDelete = window.confirm("Delete this entry?");
    if (!confirmDelete) return;
    const response = await fetch(`/api/entries/${id}`, { method: "DELETE" });
    if (response.ok) {
      await loadData();
    }
  };

  const shiftSelectedDate = (days: number) => {
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + days);
      return next;
    });
  };

  const recalcTargetsFromProfile = () => {
    const committedProfile = commitProfileInputs();
    setTargets(computeDefaultTargets(committedProfile));
  };

  const renderTargetInput = (key: keyof NutrientTotals) => (
    <label key={key} className="flex flex-col gap-1 text-xs text-slate-500">
      {NUTRIENT_LABELS[key]} ({NUTRIENT_UNITS[key]})
      <input
        type="number"
        value={targetInputs[key]}
        min={NUTRIENT_LIMITS[key].min}
        max={NUTRIENT_LIMITS[key].max}
        inputMode="decimal"
        onChange={(event) =>
          setTargetInputs((prev) => ({
            ...prev,
            [key]: event.target.value,
          }))
        }
        onBlur={commitTargetInputs}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
      />
    </label>
  );

  const grocerySection = (
    <details className="rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.1)]">
      <summary className="cursor-pointer list-none">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl text-slate-900">Weekly Grocery List</h2>
          <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-500">
            open
          </span>
        </div>
      </summary>

      <p className="mt-2 text-xs text-slate-500">
        One tap list from your macro targets. No fish, tofu, or beans.
      </p>

      <div className="mt-3">
        <button
          type="button"
          onClick={runGroceryPlan}
          disabled={isGeneratingGrocery}
          className={clsx(
            "rounded-full px-4 py-2 text-xs uppercase tracking-[0.2em] text-white transition",
            isGeneratingGrocery
              ? "cursor-not-allowed bg-slate-400"
              : "bg-slate-900 hover:bg-slate-800",
          )}
        >
          {isGeneratingGrocery ? "Building..." : "Suggest grocery list"}
        </button>
      </div>

      {groceryError ? <p className="mt-3 text-sm text-rose-600">{groceryError}</p> : null}

      {groceryPlan ? (
        <div className="mt-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-3">
          <p className="text-sm text-slate-900">{groceryPlan.summary}</p>
          <p className="mt-1 text-xs text-slate-500">
            Weekly macro target: {Math.round(groceryPlan.weekly_macros.protein_g)}g protein ·{" "}
            {Math.round(groceryPlan.weekly_macros.carbs_g)}g carbs ·{" "}
            {Math.round(groceryPlan.weekly_macros.fat_g)}g fat ·{" "}
            {Math.round(groceryPlan.weekly_macros.fiber_g)}g fiber
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-800">
            {groceryPlan.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-500">No list yet.</p>
      )}
    </details>
  );

  const profileTargetsSection = (
    <details className="group rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-[0_22px_55px_rgba(15,23,42,0.12)]">
      <summary className="cursor-pointer list-none">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl text-slate-900">Profile & Targets</h2>
          <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-500">
            edit
          </span>
        </div>
      </summary>

      <div className="mt-5 space-y-5">
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Profile</p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-xs text-slate-500">
              Age
              <input
                type="number"
                value={profileInputs.age}
                min={13}
                max={100}
                inputMode="numeric"
                onChange={(event) =>
                  setProfileInputs((prev) => ({
                    ...prev,
                    age: event.target.value,
                  }))
                }
                onBlur={commitProfileInputs}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-500">
              Height (ft)
              <input
                type="number"
                value={profileInputs.heightFt}
                min={3}
                max={8}
                inputMode="numeric"
                onChange={(event) =>
                  setProfileInputs((prev) => ({
                    ...prev,
                    heightFt: event.target.value,
                  }))
                }
                onBlur={commitProfileInputs}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-500">
              Height (in)
              <input
                type="number"
                value={profileInputs.heightIn}
                min={0}
                max={11}
                inputMode="numeric"
                onChange={(event) =>
                  setProfileInputs((prev) => ({
                    ...prev,
                    heightIn: event.target.value,
                  }))
                }
                onBlur={commitProfileInputs}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-500">
              Weight (lbs)
              <input
                type="number"
                value={profileInputs.weightLbs}
                min={80}
                max={550}
                inputMode="numeric"
                onChange={(event) =>
                  setProfileInputs((prev) => ({
                    ...prev,
                    weightLbs: event.target.value,
                  }))
                }
                onBlur={commitProfileInputs}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-500">
              Sex
              <select
                value={profile.sex}
                onChange={(event) =>
                  setProfile((prev) => ({
                    ...prev,
                    sex: event.target.value as Sex,
                  }))
                }
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-500">
              Avg steps/day
              <input
                type="number"
                value={profileInputs.avgSteps}
                min={1000}
                max={40000}
                step={100}
                inputMode="numeric"
                onChange={(event) =>
                  setProfileInputs((prev) => ({
                    ...prev,
                    avgSteps: event.target.value,
                  }))
                }
                onBlur={commitProfileInputs}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
              />
            </label>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Daily Targets</p>
            <button
              type="button"
              onClick={recalcTargetsFromProfile}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-500 hover:bg-slate-100"
            >
              Auto-fill
            </button>
          </div>
          <p className="mt-3 text-[11px] uppercase tracking-[0.2em] text-slate-500">
            Core & Macros
          </p>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {PRIMARY_NUTRIENT_KEYS.map((key) => renderTargetInput(key))}
          </div>

          <details className="mt-4 rounded-xl border border-slate-200/80 bg-white px-3 py-2">
            <summary className="cursor-pointer list-none text-[11px] uppercase tracking-[0.2em] text-slate-500">
              Micronutrient Targets
            </summary>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {MICRONUTRIENT_KEYS.map((key) => renderTargetInput(key))}
            </div>
          </details>

          <div className="mt-3 rounded-xl border border-slate-200/80 bg-white px-3 py-2">
            <p className="text-[11px] text-slate-500">
              Upper-limit targets: Saturated fat, Added sugar, Sodium, Cholesterol.
            </p>
          </div>
        </div>
      </div>
    </details>
  );

  return (
    <div className="relative min-h-screen overflow-x-clip bg-gradient-to-br from-amber-50 via-stone-50 to-emerald-50 px-4 py-6 sm:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-16 -top-24 h-64 w-64 rounded-full bg-emerald-200/45 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 top-24 h-72 w-72 rounded-full bg-amber-200/50 blur-3xl"
      />

      <main className="relative mx-auto flex w-full max-w-3xl flex-col gap-6">
        <header className="rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-[0_24px_55px_rgba(15,23,42,0.12)]">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Daily Nutrition</p>
          <h1 className="mt-2 font-display text-4xl text-slate-900">Optimal Tracker</h1>
          <p className="mt-2 text-sm text-slate-600">
            AI estimates are directional, not medical-grade measurements.
          </p>
          <div className="mt-4 h-1 w-28 rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500" />
        </header>

        <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.1)]">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-3 py-3">
              <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">
                Meals
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{selectedEntries.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-3 py-3 sm:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">
                  Day Optimal
                </p>
                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                  <span>Goal</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={optimalGoal}
                    onChange={(event) =>
                      setOptimalGoal(
                        clamp(Math.round(toNumber(event.target.value, optimalGoal)), 0, 100),
                      )
                    }
                    onBlur={handleGoalSave}
                    className="w-14 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-right text-base text-slate-900"
                  />
                  <span>%</span>
                </div>
              </div>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{selectedAverage}%</p>
              <div className="mt-2 h-2.5 w-full rounded-full bg-slate-200/70">
                <div
                  className={clsx(
                    "h-2.5 rounded-full transition-colors",
                    getTrafficColor(dayOptimalCoverage),
                  )}
                  style={{ width: `${Math.min(dayOptimalCoverage, 100)}%` }}
                />
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-3 py-3 sm:col-span-3">
              <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">
                Average feel
              </p>
              <p className="mt-1 text-xl font-semibold text-slate-900">
                {todayFeelAverage ? `${todayFeelAverage}/5` : "--"}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Today average: {todayAverage}% optimal
                {todayFeelAverage ? ` · Avg feel ${todayFeelAverage}/5` : ""}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-[0_22px_50px_rgba(15,23,42,0.1)]">
          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.2em] text-slate-500">
              Meal
              <textarea
                rows={5}
                value={draft.mealText}
                onChange={(event) => handleMealChange(event.target.value)}
                placeholder="Type what you ate in plain English..."
                required
                className="min-h-[150px] rounded-2xl border border-slate-200 bg-slate-50/40 px-4 py-3 text-base text-slate-900"
              />
            </label>

            <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.2em] text-slate-500">
              How did you feel after this meal?
              <select
                value={draft.feelAfter ?? ""}
                onChange={(event) => {
                  const value = event.target.value ? Number(event.target.value) : null;
                  setDraft((prev) => ({
                    ...prev,
                    feelAfter: value && Number.isFinite(value) ? clamp(value, 1, 5) : null,
                    meta: prev.meta
                      ? {
                          ...prev.meta,
                          feel_after:
                            value && Number.isFinite(value) ? clamp(value, 1, 5) : null,
                        }
                      : prev.meta,
                  }));
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
              >
                <option value="">Not rated</option>
                <option value="1">1 - Very bad</option>
                <option value="2">2 - Low energy</option>
                <option value="3">3 - Neutral</option>
                <option value="4">4 - Pretty good</option>
                <option value="5">5 - Great</option>
              </select>
            </label>

            <p className="text-xs text-slate-600">
              AI uses your profile, nutrient targets, and today&apos;s logged meals for tailored
              recommendations (defaulting to simple, low-cook next meals).
            </p>

            {estimate ? (
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-4 text-sm text-slate-900">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">AI Insight</p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-lg font-semibold text-slate-900">
                    {estimate.optimal_score}% optimal
                  </p>
                  <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-500">
                    {estimate.confidence} confidence
                  </span>
                </div>
                <div className="mt-2 h-2.5 w-full rounded-full bg-slate-200/70">
                  <div
                    className={clsx(
                      "h-2.5 rounded-full transition-colors",
                      getTrafficColor(estimateCoverage),
                    )}
                    style={{ width: `${Math.min(estimateCoverage, 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-sm text-slate-900">{estimate.summary}</p>

                <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                  <div>
                    <p className="uppercase tracking-[0.2em]">Good</p>
                    <p className="mt-1 text-sm text-slate-900">
                      {estimate.positive.length ? estimate.positive.join(", ") : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="uppercase tracking-[0.2em]">Improve</p>
                    <p className="mt-1 text-sm text-slate-900">
                      {estimate.improve.length ? estimate.improve.join(", ") : "-"}
                    </p>
                  </div>
                </div>

                <div className="mt-3 rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-3 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">
                    Next meal recommendation
                  </p>
                  <p className="mt-1 text-sm text-slate-900">
                    {estimate.recommendation || "No recommendation returned."}
                  </p>
                  {estimate.recommendation_options.length ? (
                    <div className="mt-2 space-y-1">
                      {estimate.recommendation_options.map((option, index) => (
                        <p key={option} className="text-xs text-slate-700">
                          {index + 1}. {option}
                        </p>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                  {ESTIMATE_HIGHLIGHT_KEYS.map((key) => (
                    <div
                      key={key}
                      className="rounded-xl border border-slate-200/80 bg-white px-2 py-2"
                    >
                      <p className="uppercase tracking-[0.15em] text-slate-500">
                        {NUTRIENT_LABELS[key]}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {Math.round(estimate.nutrients[key])} {NUTRIENT_UNITS[key]}
                      </p>
                    </div>
                  ))}
                </div>

                <details className="mt-3 rounded-xl border border-slate-200/80 bg-white px-3 py-2">
                  <summary className="cursor-pointer list-none text-xs uppercase tracking-[0.2em] text-slate-500">
                    Micronutrient estimate
                  </summary>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                    {MICRONUTRIENT_KEYS.map((key) => (
                      <div
                        key={key}
                        className="rounded-xl border border-slate-200/80 bg-slate-50/70 px-2 py-2"
                      >
                        <p className="uppercase tracking-[0.15em] text-slate-500">
                          {NUTRIENT_LABELS[key]}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {Math.round(estimate.nutrients[key])} {NUTRIENT_UNITS[key]}
                        </p>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            ) : null}

            {error ? <p className="text-sm text-rose-600">{error}</p> : null}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={isEstimating}
                className={clsx(
                  "rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm transition",
                  readyToSave
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-slate-900 hover:bg-slate-800",
                )}
              >
                {isEstimating ? "Analyzing..." : readyToSave ? "Save meal" : "Analyze meal"}
              </button>
              {readyToSave ? (
                <button
                  type="button"
                  onClick={runEstimate}
                  className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs uppercase tracking-[0.2em] text-slate-600 hover:bg-slate-100"
                >
                  Re-estimate
                </button>
              ) : null}
              <button
                type="button"
                onClick={resetDraft}
                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs uppercase tracking-[0.2em] text-slate-600 hover:bg-slate-100"
              >
                Clear
              </button>
            </div>
          </form>
        </section>

        <details className="rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.1)]">
          <summary className="cursor-pointer list-none">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-2xl text-slate-900">Daily Coverage</h2>
              <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                open
              </span>
            </div>
          </summary>
          <p className="mt-2 text-xs text-slate-500">
            {selectedDateLabel}
            {isToday ? " · Today" : ""}
            {isToday && estimate ? " · projected with current draft meal" : ""}
          </p>

          <div className="mt-4 grid gap-2">
            {PRIMARY_NUTRIENT_KEYS.map((key) => {
              const isUpperBound = UPPER_BOUND_KEYS.has(key);
              const actual = coverageTotals[key];
              const target = targets[key];
              const coverage = isUpperBound
                ? getUpperBoundCoveragePercent(actual, target)
                : getCoveragePercent(actual, target);
              const color = isUpperBound
                ? getUpperBoundTrafficColor(actual, target)
                : getTrafficColor(coverage);

              return (
                <div
                  key={key}
                  className="rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      {NUTRIENT_LABELS[key]}
                    </p>
                    <p className="text-xs text-slate-500">
                      {Math.round(actual)} / {Math.round(target)} {NUTRIENT_UNITS[key]}
                      {isUpperBound ? " max" : ""}
                    </p>
                  </div>
                  <div className="mt-2 h-2.5 w-full rounded-full bg-slate-200/70">
                    <div
                      className={clsx("h-2.5 rounded-full transition-colors", color)}
                      style={{ width: `${Math.min(coverage, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <details className="mt-4 rounded-xl border border-slate-200/80 bg-slate-50/60 px-3 py-2">
            <summary className="cursor-pointer list-none text-[11px] uppercase tracking-[0.2em] text-slate-500">
              Micronutrient Coverage
            </summary>
            <div className="mt-3 grid gap-2">
              {MICRONUTRIENT_KEYS.map((key) => {
                const actual = coverageTotals[key];
                const target = targets[key];
                const coverage = getCoveragePercent(actual, target);

                return (
                  <div
                    key={key}
                    className="rounded-xl border border-slate-200/80 bg-white px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                        {NUTRIENT_LABELS[key]}
                      </p>
                      <p className="text-xs text-slate-500">
                        {Math.round(actual)} / {Math.round(target)} {NUTRIENT_UNITS[key]}
                      </p>
                    </div>
                    <div className="mt-2 h-2.5 w-full rounded-full bg-slate-200/70">
                      <div
                        className={clsx(
                          "h-2.5 rounded-full transition-colors",
                          getTrafficColor(coverage),
                        )}
                        style={{ width: `${Math.min(coverage, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </details>
        </details>

        <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-[0_20px_48px_rgba(15,23,42,0.1)]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-2xl text-slate-900">Entries</h2>
              <p className="text-xs text-slate-500">
                {selectedDateLabel}
                {isToday ? " · Today" : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => shiftSelectedDate(-1)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-600 hover:bg-slate-100"
              >
                Prev
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate(new Date())}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-600 hover:bg-slate-100"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => shiftSelectedDate(1)}
                disabled={isToday}
                className={clsx(
                  "rounded-full border border-slate-200 bg-white px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-600 hover:bg-slate-100",
                  isToday && "cursor-not-allowed opacity-50",
                )}
              >
                Next
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {selectedEntryRows.length === 0 ? (
              <p className="text-sm text-slate-500">No entries yet.</p>
            ) : (
              selectedEntryRows.map(({ entry, meta }) => (
                <div
                  key={entry.id}
                  className="rounded-2xl border border-slate-200/80 bg-slate-50/70 px-3 py-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{entry.mealText}</p>
                        <p className="text-xs text-slate-500">
                          {formatDisplayTime(entry.timestamp)}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-emerald-700">
                        {entry.wholeFoodsPercent}% optimal
                      </span>
                    </div>
                    <p className="text-sm text-slate-800">{entry.llmReason}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5">
                        Feel: {formatFeelLabel(meta?.feel_after ?? null)}
                      </span>
                      {meta?.confidence ? (
                        <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5">
                          Confidence: {meta.confidence}
                        </span>
                      ) : null}
                    </div>
                    {meta?.recommendation ? (
                      <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 px-2 py-2 text-xs text-slate-800">
                        <p>Next meal: {meta.recommendation}</p>
                        {meta.recommendation_options.length ? (
                          <p className="mt-1 text-slate-700">
                            Flexible option: {meta.recommendation_options[0]}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => deleteEntry(entry.id)}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-600 hover:bg-slate-100"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {profileTargetsSection}
        {grocerySection}

        <footer className="pb-6 text-center text-[10px] uppercase tracking-[0.35em] text-slate-500/80">
          v9
        </footer>
      </main>
    </div>
  );
}
