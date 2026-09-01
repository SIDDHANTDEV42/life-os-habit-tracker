import type { Completion, Habit } from "../types";
import { toIsoDate, todayIso } from "../lib/date";

export interface HabitStreak {
  habit: Habit;
  current: number;
  best: number;
}

export function calculateStreaks(habits: Habit[], completions: Completion[]): HabitStreak[] {
  const today = todayIso();
  const yesterdayDate = new Date(`${today}T12:00:00`);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = toIsoDate(yesterdayDate);

  return habits.map((habit) => {
    const completedDates = Array.from(
      new Set(
        completions
          .filter((item) => item.habitId === habit.id && item.completed && item.date <= today)
          .map((item) => item.date)
      )
    ).sort();

    if (completedDates.length === 0) {
      return { habit, current: 0, best: 0 };
    }

    let best = 0;
    let running = 0;
    let previousDate: string | null = null;

    completedDates.forEach((date) => {
      if (previousDate !== null) {
        const expected = new Date(`${previousDate}T12:00:00`);
        expected.setDate(expected.getDate() + 1);
        if (toIsoDate(expected) === date) {
          running += 1;
        } else {
          running = 1;
        }
      } else {
        running = 1;
      }
      previousDate = date;
      best = Math.max(best, running);
    });

    const completedSet = new Set(completedDates);
    let current = 0;

    let cursorDate: string | null = null;
    if (completedSet.has(today)) {
      cursorDate = today;
    } else if (completedSet.has(yesterday)) {
      cursorDate = yesterday;
    }

    if (cursorDate !== null) {
      const cursor = new Date(`${cursorDate}T12:00:00`);
      while (completedSet.has(toIsoDate(cursor))) {
        current += 1;
        cursor.setDate(cursor.getDate() - 1);
      }
    }

    return { habit, current, best };
  });
}
