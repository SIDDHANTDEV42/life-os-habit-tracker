import { weekLabel } from "../lib/date";
import type { DailyScore } from "./dailyScore";

export interface WeeklyStat {
  week: string;
  average: number | null;
}

export function calculateWeeklyStats(dailyScores: DailyScore[]): WeeklyStat[] {
  const grouped = new Map<string, number[]>();
  dailyScores.forEach((day) => {
    if (day.percent === null) return;
    const label = weekLabel(day.date);
    grouped.set(label, [...(grouped.get(label) ?? []), day.score ?? 0]);
  });

  return Array.from(grouped.entries()).map(([week, values]) => ({
    week,
    average: values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null,
  }));
}
