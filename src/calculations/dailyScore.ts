import type { Completion, Habit, LifeOsConfig } from "../types";
import { DEFAULT_LIFE_OS_CONFIG } from "../types";
import { isFutureIso } from "../lib/date";
import { getHabitCategory, meetsMinimum, computeTodayScoreLabel } from "./tierScore";

export const BASELINE_PERCENT = 60;

export interface DailyScore {
  date: string;
  completed: number;
  total: number;
  percent: number | null;
  status: "GOOD" | "FAILED" | "NO DATA" | "FUTURE";
  score: number | null;
  hasData: boolean;
}

/**
 * Original daily score calculation — used by HabitsPage, HistoryPage, and HabitGrid.
 * Counts ALL active habits (regardless of category) for backward compatibility.
 */
export function calculateDailyScores(
  dates: string[],
  activeHabits: Habit[],
  completions: Completion[],
): DailyScore[] {
  const completedKeys = new Set(
    completions
      .filter((item) => item.completed)
      .map((item) => `${item.habitId}:${item.date}`),
  );

  const loggedKeys = new Set(
    completions.map((item) => `${item.habitId}:${item.date}`),
  );

  return dates.map((date) => {
    const future = isFutureIso(date);

    const logged = activeHabits.filter((habit) =>
      loggedKeys.has(`${habit.id}:${date}`),
    ).length;

    const completed = activeHabits.filter((habit) =>
      completedKeys.has(`${habit.id}:${date}`),
    ).length;

    const hasData = !future && logged > 0;

    const total = activeHabits.length;

    const percent =
      hasData && total > 0
        ? Math.round((completed / total) * 100)
        : null;

    let status: DailyScore["status"];

    if (future) {
      status = "FUTURE";
    } else if (percent === null) {
      status = "NO DATA";
    } else if (percent < BASELINE_PERCENT) {
      status = "FAILED";
    } else {
      status = "GOOD";
    }

    return {
      date,
      completed,
      total,
      percent,
      status,

      // IMPORTANT:
      // Keep the real percentage.
      // A failed 50% day remains 50%, not 0%.
      score: percent,

      hasData,
    };
  });
}

// ── Life OS v2: Category-Aware Scoring ───────────────────

export interface LifeOsTodayScore {
  /** Performance Core: points earned */
  coreCompleted: number;
  /** Performance Core: total active core habits */
  coreTotal: number;
  /** Performance Core: percentage (null if no core habits) */
  corePercent: number | null;
  /** Human-readable label: "Strong Day" / "Acceptable Day" / "Recovery Day" / "Reset" */
  coreLabel: string;

  /** Behavioral Guardrails: points earned */
  guardrailsCompleted: number;
  /** Behavioral Guardrails: total active guardrail habits */
  guardrailsTotal: number;

  /** Optional: completed count (for display, no scoring) */
  optionalCompleted: number;
  optionalTotal: number;
}

/**
 * Calculate the Life OS v2 Today Score for a specific date.
 *
 * Scoring rules:
 * - Performance Core habits → Today Score (X/N)
 * - Behavioral Guardrails → Guardrails: X/N (separate)
 * - Optional → no scoring impact
 *
 * For each habit:
 * - Binary: 1 if completed, 0 if not
 * - Timed/Counted: 1 if habitDailyValues >= tierMinimum, 0 otherwise
 * - No config → treat as binary + core (backward compatible)
 */
export function calculateLifeOsTodayScore(
  date: string,
  activeHabits: Habit[],
  completions: Completion[],
  config: LifeOsConfig | undefined,
): LifeOsTodayScore {
  const cfg = config ?? DEFAULT_LIFE_OS_CONFIG;
  const completedSet = new Set(
    completions
      .filter((c) => c.date === date && c.completed)
      .map((c) => c.habitId),
  );

  let coreCompleted = 0;
  let coreTotal = 0;
  let guardrailsCompleted = 0;
  let guardrailsTotal = 0;
  let optionalCompleted = 0;
  let optionalTotal = 0;

  for (const habit of activeHabits) {
    const habitCfg = cfg.habitConfigs[habit.id];
    const category = getHabitCategory(habit.id, cfg.habitConfigs);
    const habitType = habitCfg?.habitType ?? "binary";

    // Determine if this habit scores a point today
    let earned = false;

    if (habitType === "binary") {
      earned = completedSet.has(habit.id);
    } else {
      // timed or counted — check habitDailyValues
      const key = `${habit.id}:${date}`;
      const value = cfg.habitDailyValues[key];
      if (value != null && habitCfg) {
        earned = meetsMinimum(value, habitCfg);
      } else {
        // Fallback: if no value logged, check completion as binary
        earned = completedSet.has(habit.id);
      }
    }

    switch (category) {
      case "core":
        coreTotal++;
        if (earned) coreCompleted++;
        break;
      case "guardrail":
        guardrailsTotal++;
        if (earned) guardrailsCompleted++;
        break;
      case "optional":
        optionalTotal++;
        if (earned) optionalCompleted++;
        break;
    }
  }

  const corePercent =
    coreTotal > 0 ? Math.round((coreCompleted / coreTotal) * 100) : null;
  const coreLabel =
    corePercent != null ? computeTodayScoreLabel(corePercent) : "—";

  return {
    coreCompleted,
    coreTotal,
    corePercent,
    coreLabel,
    guardrailsCompleted,
    guardrailsTotal,
    optionalCompleted,
    optionalTotal,
  };
}