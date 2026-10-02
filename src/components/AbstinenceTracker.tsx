import React from "react";
import { Shield, CheckCircle2, XCircle } from "lucide-react";
import type { Habit, Completion } from "../types";
import { toIsoDate } from "../lib/date";

interface AbstinenceTrackerProps {
  abstinenceHabits: Habit[];
  completions: Completion[];
  today: string;
  onToggleClean: (habitId: number, currentClean: boolean) => void;
}

export function AbstinenceTracker({
  abstinenceHabits,
  completions,
  today,
  onToggleClean,
}: AbstinenceTrackerProps) {
  if (abstinenceHabits.length === 0) {
    return null;
  }

  // Helper to get past 7 days ISO strings
  const past7Days: string[] = [];
  const todayDate = new Date(today);
  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayDate);
    d.setDate(todayDate.getDate() - i);
    past7Days.push(toIsoDate(d));
  }

  const completionSet = new Set(
    completions
      .filter((c) => c.completed)
      .map((c) => `${c.habitId}:${c.date}`)
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 text-xs">
            🛡️
          </span>
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
            Abstinence & Dopamine Guardrails
          </h3>
        </div>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          Binary Protection
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {abstinenceHabits.map((habit) => {
          const isCleanToday = completionSet.has(`${habit.id}:${today}`);

          // Count clean days in last 7 days
          let cleanCount7d = 0;
          const dayResults = past7Days.map((dateIso) => {
            const clean = completionSet.has(`${habit.id}:${dateIso}`);
            if (clean) cleanCount7d++;
            return { dateIso, clean };
          });

          // Calculate current streak (small secondary text)
          let currentStreak = 0;
          const checkDate = new Date(todayDate);
          // If clean today, count today and back. If not clean today, check if clean yesterday.
          let checkIso = toIsoDate(checkDate);
          if (!completionSet.has(`${habit.id}:${checkIso}`)) {
            // Check yesterday
            checkDate.setDate(checkDate.getDate() - 1);
            checkIso = toIsoDate(checkDate);
          }
          while (completionSet.has(`${habit.id}:${checkIso}`)) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
            checkIso = toIsoDate(checkDate);
          }

          return (
            <div
              key={habit.id}
              className={`rounded-2xl border p-4 transition-all duration-200 ${
                isCleanToday
                  ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20"
                  : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/60"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                    {habit.name}
                  </h4>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                      Today:
                    </span>
                    <span
                      className={`text-xs font-bold ${
                        isCleanToday ? "text-emerald-500" : "text-zinc-400"
                      }`}
                    >
                      {isCleanToday ? "Clean & Protected ✅" : "Pending / Unchecked"}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => onToggleClean(habit.id, isCleanToday)}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                    isCleanToday
                      ? "bg-emerald-500 text-white hover:bg-emerald-600"
                      : "border border-zinc-300 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  }`}
                >
                  {isCleanToday ? <CheckCircle2 size={14} /> : <Shield size={14} />}
                  {isCleanToday ? "Protected" : "Mark Clean"}
                </button>
              </div>

              {/* 7-Day History Track */}
              <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
                <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-1.5">
                  <span>Last 7 Days: <strong className="text-zinc-700 dark:text-zinc-200">{cleanCount7d}/7 clean</strong></span>
                  {currentStreak > 0 && (
                    <span className="text-[11px] text-zinc-400">
                      Streak: {currentStreak}d
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-7 gap-1.5">
                  {dayResults.map(({ dateIso, clean }) => (
                    <div
                      key={dateIso}
                      title={`${dateIso}: ${clean ? "Clean" : "Relapse / Missed"}`}
                      className={`h-2 rounded-sm transition-colors ${
                        clean
                          ? "bg-emerald-500"
                          : dateIso === today
                          ? "bg-zinc-200 dark:bg-zinc-800 border border-dashed border-zinc-400"
                          : "bg-red-400/40 dark:bg-red-950/60"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
