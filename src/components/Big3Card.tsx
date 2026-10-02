import React from "react";
import { Target, CheckCircle2, Circle, Clock, Hash, ChevronRight } from "lucide-react";
import type { Habit, Completion, LifeOsConfig, HabitConfig, HabitTier } from "../types";
import { computeTier } from "../calculations/tierScore";

interface Big3CardProps {
  habits: Habit[];
  completions: Completion[];
  config?: LifeOsConfig;
  today: string;
  onToggleBinary: (habitId: number, currentCompleted: boolean) => void;
  onOpenTimedInput: (habit: Habit, config: HabitConfig, currentValue: number) => void;
  onNavigateToSettings?: () => void;
}

export function Big3Card({
  habits,
  completions,
  config,
  today,
  onToggleBinary,
  onOpenTimedInput,
  onNavigateToSettings,
}: Big3CardProps) {
  const big3Ids = config?.big3HabitIds ?? [];
  const big3Habits = big3Ids
    .map((id) => habits.find((h) => h.id === id))
    .filter((h): h is Habit => h !== undefined);

  if (big3Habits.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center dark:border-zinc-800 dark:bg-zinc-900/30">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500 mb-3">
          <Target size={24} />
        </div>
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          No Big 3 Configured
        </h3>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
          Choose up to 3 high-leverage habits to focus on daily in Settings to anchor your routine.
        </p>
        {onNavigateToSettings && (
          <button
            onClick={onNavigateToSettings}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white transition"
          >
            Configure Big 3
            <ChevronRight size={14} />
          </button>
        )}
      </div>
    );
  }

  const completedMap = new Map<number, boolean>();
  for (const c of completions) {
    if (c.date === today) {
      completedMap.set(c.habitId, c.completed);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 text-xs font-bold">
            🎯
          </span>
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
            The Big 3 Anchor
          </h3>
        </div>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          Protected Daily Minimums
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {big3Habits.map((habit) => {
          const habitCfg = config?.habitConfigs[habit.id];
          const isBinary = !habitCfg || habitCfg.habitType === "binary";
          const isDone = completedMap.get(habit.id) ?? false;

          if (isBinary) {
            return (
              <div
                key={habit.id}
                onClick={() => onToggleBinary(habit.id, isDone)}
                className={`group relative flex cursor-pointer items-center justify-between rounded-2xl border p-4 transition-all duration-200 ${
                  isDone
                    ? "border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10 dark:border-emerald-500/30 dark:bg-emerald-950/20"
                    : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                      isDone
                        ? "bg-emerald-500 text-white"
                        : "bg-zinc-100 text-zinc-400 group-hover:text-zinc-600 dark:bg-zinc-800 dark:text-zinc-500 dark:group-hover:text-zinc-300"
                    }`}
                  >
                    {isDone ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-medium uppercase tracking-wider text-zinc-400 block">
                      Binary Habit
                    </span>
                    <h4
                      className={`truncate font-semibold text-sm ${
                        isDone
                          ? "text-zinc-900 line-through decoration-zinc-400 dark:text-zinc-100"
                          : "text-zinc-900 dark:text-zinc-100"
                      }`}
                    >
                      {habit.name}
                    </h4>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      isDone
                        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                        : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                    }`}
                  >
                    {isDone ? "Done" : "Pending"}
                  </span>
                </div>
              </div>
            );
          }

          // Timed or Counted habit
          const key = `${habit.id}:${today}`;
          const currentVal = config?.habitDailyValues[key] ?? 0;
          const tier: HabitTier = computeTier(currentVal, habitCfg);
          const target = habitCfg.tierTarget ?? habitCfg.tierMinimum ?? 1;
          const progressPercent = Math.min(100, Math.round((currentVal / target) * 100));

          const tierBadges: Record<HabitTier, { text: string; cls: string; border: string }> = {
            stretch: {
              text: "Stretch 🔥",
              cls: "bg-purple-500/10 text-purple-400",
              border: "border-purple-500/40",
            },
            target: {
              text: "Target 🎯",
              cls: "bg-emerald-500/10 text-emerald-400",
              border: "border-emerald-500/40",
            },
            minimum: {
              text: "Minimum 👍",
              cls: "bg-amber-500/10 text-amber-400",
              border: "border-amber-500/40",
            },
            missed: {
              text: "Missed",
              cls: "bg-zinc-800/80 text-zinc-400",
              border: "border-zinc-200 dark:border-zinc-800",
            },
          };

          return (
            <div
              key={habit.id}
              onClick={() => onOpenTimedInput(habit, habitCfg, currentVal)}
              className={`group relative cursor-pointer rounded-2xl border p-4 transition-all duration-200 bg-white hover:border-zinc-300 dark:bg-zinc-900/60 dark:hover:border-zinc-700 ${tierBadges[tier].border}`}
            >
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
                    {habitCfg.habitType === "timed" ? <Clock size={15} /> : <Hash size={15} />}
                  </div>
                  <h4 className="truncate font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                    {habit.name}
                  </h4>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${tierBadges[tier].cls}`}
                >
                  {tierBadges[tier].text}
                </span>
              </div>

              {/* Progress & value indicator */}
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between text-xs">
                  <span className="font-medium text-zinc-500 dark:text-zinc-400">
                    Logged: <span className="font-bold text-zinc-900 dark:text-white">{currentVal}</span> {habitCfg.unit || "min"}
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    Target: {habitCfg.tierTarget ?? habitCfg.tierMinimum ?? "—"} {habitCfg.unit}
                  </span>
                </div>

                <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className={`h-full transition-all duration-500 ${
                      tier === "stretch"
                        ? "bg-purple-500"
                        : tier === "target"
                        ? "bg-emerald-500"
                        : tier === "minimum"
                        ? "bg-amber-500"
                        : "bg-zinc-400"
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
