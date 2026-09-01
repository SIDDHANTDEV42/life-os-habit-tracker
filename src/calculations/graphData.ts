import type { DailyScore } from "./dailyScore";

export interface GraphPoint {
  day: string;
  completion: number | null;
  baseline: number;
}

const BASELINE = 60;

export function toGraphData(dailyScores: DailyScore[]): GraphPoint[] {
  return dailyScores.map((day) => {
    const completion = day.percent;

    return {
      day: String(Number(day.date.slice(-2))),
      completion,
      baseline: BASELINE,
    };
  });
}