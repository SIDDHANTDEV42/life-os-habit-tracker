import type { Completion, Habit } from "../types";
import type { DailyScore } from "./dailyScore";

export interface HabitPerformance {
  habit: Habit;
  completed: number;
  logged: number;
  percent: number | null;
  progress: number | null;
}

export interface MonthlyStats {
  average: number | null;
  strongestDay: DailyScore | null;
  weakestDay: DailyScore | null;
  baseline: number | null;
  volatility: number | null;
  stability: number | null;
  consistency: number | null;
  slumpDays: number;
  bounceBacks: number;
  habitPerformance: HabitPerformance[];
}

export function calculateMonthlyStats(
  activeHabits: Habit[],
  completions: Completion[],
  dailyScores: DailyScore[],
  monthDays: number,
): MonthlyStats {
  const scoredDays = dailyScores.filter((day) => day.percent !== null) as Array<DailyScore & { percent: number }>;
  const average = scoredDays.length
    ? Math.round(scoredDays.reduce((sum, day) => sum + day.percent, 0) / scoredDays.length)
    : null;

  const sortedByScore = [...scoredDays].sort((a, b) => b.percent - a.percent);
  const strongestDay = sortedByScore[0] ?? null;
  const weakestDay = sortedByScore[sortedByScore.length - 1] ?? null;

  const variance = average === null
    ? null
    : scoredDays.reduce((sum, day) => sum + Math.pow(day.percent - average, 2), 0) / Math.max(scoredDays.length, 1);
  const volatility = variance === null ? null : Math.round(Math.sqrt(variance));
  const stability = strongestDay && weakestDay ? 100 - (strongestDay.percent - weakestDay.percent) : null;
  const baseline = scoredDays.length
    ? Math.round(Math.min(...scoredDays.map((day) => day.percent)))
    : null;
  const consistency = scoredDays.length
    ? Math.round((scoredDays.filter((day) => day.percent > 0).length / scoredDays.length) * 100)
    : null;

  let slumpDays = 0;
  let bounceBacks = 0;
  for (let index = 0; index < scoredDays.length; index += 1) {
    if (scoredDays[index].percent < 50) slumpDays += 1;
    if (index > 0 && scoredDays[index - 1].percent < 50 && scoredDays[index].percent >= 50) {
      bounceBacks += 1;
    }
  }

  const habitPerformance = activeHabits.map((habit) => {
    const records = completions.filter((item) => item.habitId === habit.id);
    const completed = records.filter((item) => item.completed).length;
    const totalDays = Math.max(monthDays, 1);
    return {
      habit,
      completed,
      logged: totalDays,
      percent: Math.round((completed / totalDays) * 100),
      progress: Math.round((completed / totalDays) * 100),
    };
  });

  return {
    average,
    strongestDay,
    weakestDay,
    baseline,
    volatility,
    stability,
    consistency,
    slumpDays,
    bounceBacks,
    habitPerformance,
  };
}
