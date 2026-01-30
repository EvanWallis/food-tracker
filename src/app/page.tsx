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

type Estimate = {
  percent: number;
  reason: string;
  whole_foods_items: string[];
  non_whole_foods_items: string[];
  size_label: string;
  size_weight: number;
};

type Draft = {
  mealText: string;
  wholeFoodsPercent: number;
  llmReason: string;
  sizeLabel: string | null;
  sizeWeight: number | null;
};

const formatDisplayTime = (value: string) => {
  const date = new Date(value);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

const getDayKey = (value: Date | string) => {
  const date = typeof value === "string" ? new Date(value) : value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const weightedAverage = (entries: MealEntry[]) => {
  if (!entries.length) return 0;
  let weightSum = 0;
  let total = 0;
  entries.forEach((entry) => {
    const weight = entry.sizeWeight ?? 1;
    total += entry.wholeFoodsPercent * weight;
    weightSum += weight;
  });
  return weightSum ? Math.round(total / weightSum) : 0;
};

export default function Home() {
  const [entries, setEntries] = useState<MealEntry[]>([]);
  const [goalPercent, setGoalPercent] = useState(80);
  const [draft, setDraft] = useState<Draft>(() => ({
    mealText: "",
    wholeFoodsPercent: 80,
    llmReason: "",
    sizeLabel: null,
    sizeWeight: null,
  }));
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [readyToSave, setReadyToSave] = useState(false);
  const [isEstimating, setIsEstimating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setGoalPercent(settings.goalPercent ?? 80);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const todayKey = getDayKey(new Date());
  const todayEntries = useMemo(
    () => entries.filter((entry) => getDayKey(entry.timestamp) === todayKey),
    [entries, todayKey],
  );

  const todayAverage = useMemo(() => weightedAverage(todayEntries), [todayEntries]);
  const allTimeAverage = useMemo(() => weightedAverage(entries), [entries]);

  const streak = useMemo(() => {
    if (!entries.length) return 0;
    const dailyTotals = new Map<string, { total: number; weight: number }>();

    entries.forEach((entry) => {
      const key = getDayKey(entry.timestamp);
      const weight = entry.sizeWeight ?? 1;
      const current = dailyTotals.get(key) ?? { total: 0, weight: 0 };
      current.total += entry.wholeFoodsPercent * weight;
      current.weight += weight;
      dailyTotals.set(key, current);
    });

    let streakCount = 0;
    const cursor = new Date();
    while (true) {
      const key = getDayKey(cursor);
      const stats = dailyTotals.get(key);
      if (!stats) break;
      const avg = stats.weight ? Math.round(stats.total / stats.weight) : 0;
      if (avg >= goalPercent) {
        streakCount += 1;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }

    return streakCount;
  }, [entries, goalPercent]);

  const resetDraft = () => {
    setDraft({
      mealText: "",
      wholeFoodsPercent: 80,
      llmReason: "",
      sizeLabel: null,
      sizeWeight: null,
    });
    setEstimate(null);
    setReadyToSave(false);
  };

  const runEstimate = async () => {
    setError(null);
    const mealText = draft.mealText.trim();
    if (!mealText) return;
    setIsEstimating(true);

    const response = await fetch("/api/estimate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mealText }),
    });

    setIsEstimating(false);

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      const message =
        typeof payload.error === "string"
          ? payload.error
          : "Could not estimate whole foods. Try again.";
      setError(message);
      return;
    }

    const data = (await response.json()) as Estimate;
    setEstimate(data);
    setDraft((prev) => ({
      ...prev,
      wholeFoodsPercent: data.percent ?? prev.wholeFoodsPercent,
      llmReason: data.reason ?? "",
      sizeLabel: data.size_label ?? null,
      sizeWeight: data.size_weight ?? null,
    }));
    setReadyToSave(true);
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

    const payload = {
      mealText,
      timestamp: new Date().toISOString(),
      mood: "Neutral",
      wholeFoodsPercent: draft.wholeFoodsPercent,
      notes: null,
      llmReason: draft.llmReason,
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
      }));
    }
  };

  const handleGoalSave = async () => {
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goalPercent }),
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream via-white to-white px-4 py-6">
      <main className="mx-auto flex w-full max-w-xl flex-col gap-6">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.35em] text-inkSoft">Daily Log</p>
          <h1 className="font-display text-4xl text-ink">Food Tracker</h1>
          <p className="text-sm text-inkSoft">Log meals. Hit 80% whole foods.</p>
        </header>

        <section className="rounded-xl border border-line bg-white/70 px-3 py-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-lg border border-line/70 bg-white/80 px-2 py-2">
              <p className="text-[10px] uppercase tracking-[0.25em] text-inkSoft/70">
                Entries
              </p>
              <p className="mt-1 text-xl font-semibold text-ink">{todayEntries.length}</p>
            </div>
            <div className="rounded-lg border border-line/70 bg-white/80 px-2 py-2">
              <p className="text-[10px] uppercase tracking-[0.25em] text-inkSoft/70">
                Streak
              </p>
              <p className="mt-1 text-xl font-semibold text-ink">{streak}</p>
            </div>
            <div className="rounded-lg border border-line/70 bg-white/80 px-2 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] uppercase tracking-[0.25em] text-inkSoft/70">
                  Today %
                </p>
                <div className="flex items-center gap-1 text-[10px] text-inkSoft/70">
                  <span>Goal</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={goalPercent}
                    onChange={(event) =>
                      setGoalPercent(Math.min(100, Math.max(0, Number(event.target.value) || 0)))
                    }
                    onBlur={handleGoalSave}
                    className="w-12 rounded-full border border-line bg-white px-2 py-0.5 text-right text-base"
                  />
                  <span>%</span>
                </div>
              </div>
              <p className="mt-1 text-xl font-semibold text-ink">{todayAverage}%</p>
              <div className="mt-1 h-1.5 w-full rounded-full bg-line/40">
                <div
                  className="h-1.5 rounded-full bg-gradient-to-r from-accent to-teal-400"
                  style={{ width: `${Math.min(todayAverage, 100)}%` }}
                />
              </div>
            </div>
            <div className="rounded-lg border border-line/70 bg-white/80 px-2 py-2">
              <p className="text-[10px] uppercase tracking-[0.25em] text-inkSoft/70">
                All-time %
              </p>
              <p className="mt-1 text-xl font-semibold text-ink">{allTimeAverage}%</p>
              <div className="mt-1 h-1.5 w-full rounded-full bg-line/40">
                <div
                  className="h-1.5 rounded-full bg-gradient-to-r from-teal-500 to-emerald-400"
                  style={{ width: `${Math.min(allTimeAverage, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-white/90 p-4 shadow-soft">
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.2em] text-inkSoft">
              Meal
              <textarea
                rows={5}
                value={draft.mealText}
                onChange={(event) => handleMealChange(event.target.value)}
                placeholder="Type what you ate in plain English..."
                required
                className="min-h-[140px] rounded-2xl border border-line bg-white px-4 py-3 text-base text-ink"
              />
            </label>
            <p className="text-xs text-inkSoft">
              We&apos;ll estimate the whole foods % for you.
            </p>

            {estimate ? (
              <div className="rounded-xl border border-line bg-white px-3 py-3 text-sm text-ink">
                <p className="text-xs uppercase tracking-[0.2em] text-inkSoft">LLM Estimate</p>
                <p className="mt-1 text-lg font-semibold text-ink">
                  {draft.wholeFoodsPercent}% whole foods
                </p>
                <p className="mt-2 text-sm text-ink">{estimate.reason}</p>
                <div className="mt-2 grid gap-2 text-xs text-inkSoft sm:grid-cols-2">
                  <div>
                    <p className="uppercase tracking-[0.2em]">Whole foods</p>
                    <p className="text-sm text-ink">
                      {estimate.whole_foods_items.length
                        ? estimate.whole_foods_items.join(", ")
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="uppercase tracking-[0.2em]">Not whole</p>
                    <p className="text-sm text-ink">
                      {estimate.non_whole_foods_items.length
                        ? estimate.non_whole_foods_items.join(", ")
                        : "-"}
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-inkSoft">
                  Meal size: {estimate.size_label} (weight {estimate.size_weight})
                </p>
              </div>
            ) : null}

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={isEstimating}
                className={clsx(
                  "rounded-full px-4 py-2 text-sm font-semibold text-white transition",
                  readyToSave
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-ink hover:bg-ink/90",
                )}
              >
                {isEstimating
                  ? "Estimating..."
                  : readyToSave
                  ? "Save entry"
                  : "Estimate whole foods"}
              </button>
              {readyToSave ? (
                <button
                  type="button"
                  onClick={runEstimate}
                  className="rounded-full border border-line px-3 py-2 text-xs uppercase tracking-[0.2em] text-inkSoft"
                >
                  Re-estimate
                </button>
              ) : null}
              <button
                type="button"
                onClick={resetDraft}
                className="rounded-full border border-line px-3 py-2 text-xs uppercase tracking-[0.2em] text-inkSoft"
              >
                Clear
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-line bg-white/90 p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl text-ink">Today&apos;s Entries</h2>
            <span className="text-xs uppercase tracking-[0.25em] text-inkSoft">
              {todayEntries.length} total
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {todayEntries.length === 0 ? (
              <p className="text-sm text-inkSoft">No entries yet.</p>
            ) : (
              todayEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-xl border border-line bg-white px-3 py-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-ink">
                          {entry.mealText}
                        </p>
                        <p className="text-xs text-inkSoft">
                          {formatDisplayTime(entry.timestamp)}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-accentDeep">
                        {entry.wholeFoodsPercent}%
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => deleteEntry(entry.id)}
                        className="rounded-full border border-line px-3 py-1 text-xs uppercase tracking-[0.2em] text-inkSoft"
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

        <footer className="pb-6 text-center text-[10px] uppercase tracking-[0.35em] text-inkSoft/70">
          v5
        </footer>
      </main>
    </div>
  );
}
