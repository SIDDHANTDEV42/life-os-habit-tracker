import type { Completion, Habit } from "../types";
import { isFutureIso } from "../lib/date";

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