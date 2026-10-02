import React, { useState, useEffect, useMemo } from "react";
import { Check, Flame, Maximize2, CheckSquare, Target, ShieldCheck, Clock, Hash } from "lucide-react";
import type { Habit, Completion, Settings, LifeOsConfig, HabitConfig } from "../types";
import { DEFAULT_LIFE_OS_CONFIG } from "../types";
import type { HabitStreak } from "../calculations/streaks";
import { todayIso } from "../lib/date";
import { toggleCompletion, saveSettings } from "../database/api";
import { calculateLifeOsTodayScore } from "../calculations/dailyScore";
import { getHabitCategory, computeTier, meetsMinimum, SCORE_STRONG, SCORE_ACCEPTABLE } from "../calculations/tierScore";
import { TierInputPopover } from "./TierInputPopover";

interface DesktopWidgetViewProps {
  habits: Habit[];
  allCompletions: Completion[];
  streaks: HabitStreak[];
  settings: Settings;
  onExpand: () => void;
  onRefresh: () => Promise<void>;
}

export function DesktopWidgetView({
  habits,
  allCompletions,
  streaks,
  settings,
  onExpand,
  onRefresh,
}: DesktopWidgetViewProps) {
  const today = todayIso();
  const [pending, setPending] = useState<Set<number>>(new Set());
  const [optimistic, setOptimistic] = useState<Map<number, boolean>>(new Map());

  // Life OS v2 config and today score
  const lifeOsConfig: LifeOsConfig = settings.lifeOsConfig ?? DEFAULT_LIFE_OS_CONFIG;
  const todayScore = useMemo(
    () => calculateLifeOsTodayScore(today, habits, allCompletions, lifeOsConfig),
    [today, habits, allCompletions, lifeOsConfig]
  );

  // Popover state for timed/counted habit logging inside widget
  const [popoverState, setPopoverState] = useState<{
    habit: Habit;
    config: HabitConfig;
    initialValue: number;
  } | null>(null);

  // Calculate live countdown
  const [timeLeft, setTimeLeft] = useState(() => calculateTime(settings.countdownDate));

  useEffect(() => {
    if (!settings.countdownDate) return;
    const interval = setInterval(() => {
      setTimeLeft(calculateTime(settings.countdownDate));
    }, 1000);
    return () => clearInterval(interval);
  }, [settings.countdownDate]);

  function calculateTime(dateStr?: string) {
    if (!dateStr) return null;
    const target = new Date(`${dateStr}T00:00:00`).getTime();
    const now = new Date().getTime();
    const diff = target - now;
    if (isNaN(diff) || diff <= 0) return { days: 0, hours: 0, mins: 0, isPassed: true };
    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
      mins: Math.floor((diff / 1000 / 60) % 60),
      isPassed: false,
    };
  }

  // Today's completion map (incorporates allCompletions + optimistic overrides)
  const todayCompletions = new Map(
    allCompletions.filter((c) => c.date === today).map((c) => [c.habitId, c.completed])
  );
  optimistic.forEach((val, habitId) => todayCompletions.set(habitId, val));

  async function handleToggleBinary(habitId: number, current: boolean) {
    const nextVal = !current;
    setOptimistic((prev) => new Map(prev).set(habitId, nextVal));
    setPending((prev) => new Set(prev).add(habitId));

    try {
      await toggleCompletion(habitId, today, nextVal);
      await onRefresh();
    } catch {
      setOptimistic((prev) => {
        const copy = new Map(prev);
        copy.delete(habitId);
        return copy;
      });
    } finally {
      setPending((prev) => {
        const copy = new Set(prev);
        copy.delete(habitId);
        return copy;
      });
    }
  }

  async function handleSaveTierValue(val: number) {
    if (!popoverState) return;
    const { habit, config } = popoverState;
    const key = `${habit.id}:${today}`;
    const nextDailyValues = {
      ...lifeOsConfig.habitDailyValues,
      [key]: val,
    };
    const nextConfig = {
      ...lifeOsConfig,
      habitDailyValues: nextDailyValues,
    };
    const nextSettings = {
      ...settings,
      lifeOsConfig: nextConfig,
    };

    const isDone = meetsMinimum(val, config);
    try {
      await saveSettings(nextSettings);
      await toggleCompletion(habit.id, today, isDone);
      await onRefresh();
    } finally {
      setPopoverState(null);
    }
  }

  const big3Set = new Set(lifeOsConfig.big3HabitIds);

  // Score color for mini indicator
  const scorePercent = todayScore.corePercent ?? 0;
  const scoreBadgeColor =
    todayScore.coreTotal === 0
      ? "text-zinc-400"
      : scorePercent >= SCORE_STRONG
      ? "text-emerald-400"
      : scorePercent >= SCORE_ACCEPTABLE
      ? "text-amber-400"
      : "text-red-400";

  return (
    <div className="fixed inset-0 z-50 flex h-full w-full flex-col bg-[#151311] text-white p-3 select-none overflow-hidden border border-zinc-800">
      {/* WIDGET HEADER */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#5e6ad2] text-white shadow-[0_0_10px_rgba(94,106,210,0.4)]">
            <CheckSquare size={16} />
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-200">Life OS</h2>
            <div className="flex items-center gap-2 text-[10px]">
              <span className={`font-bold ${scoreBadgeColor}`}>
                Score: {todayScore.coreTotal > 0 ? `${todayScore.coreCompleted}/${todayScore.coreTotal}` : "—"}
              </span>
              {todayScore.guardrailsTotal > 0 && (
                <span className="text-zinc-400 border-l border-zinc-700 pl-1.5 font-medium">
                  Shield: {todayScore.guardrailsCompleted}/{todayScore.guardrailsTotal}
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onExpand}
          title="Expand to Full App View"
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white transition-all active:scale-95 shadow"
        >
          <Maximize2 size={14} />
        </button>
      </div>

      {/* COUNTDOWN BANNER CARD (IF CONFIGURED) */}
      {settings.countdownDate && timeLeft && (
        <div className="mt-2 shrink-0 rounded-xl border border-orange-500/40 bg-gradient-to-r from-orange-950/90 via-amber-950/90 to-orange-900/90 p-2.5 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-orange-300 truncate">
              <Flame size={14} className="animate-pulse text-orange-400 shrink-0" />
              <span className="truncate">{settings.countdownTitle || "Target"}</span>
            </div>
            <div className="text-[10px] font-extrabold text-amber-200 shrink-0 bg-black/40 px-1.5 py-0.5 rounded border border-orange-500/30">
              {timeLeft.isPassed ? "Arrived! 🎯" : `${timeLeft.days}d ${timeLeft.hours}h`}
            </div>
          </div>
        </div>
      )}

      {/* HABITS LIST */}
      <div className="mt-2 flex-1 overflow-y-auto space-y-1.5 pr-0.5">
        {habits.map((habit) => {
          const isDone = Boolean(todayCompletions.get(habit.id));
          const isPending = pending.has(habit.id);
          const isBig3 = big3Set.has(habit.id);
          const hCfg = lifeOsConfig.habitConfigs[habit.id];
          const isTimed = hCfg?.habitType === "timed" || hCfg?.habitType === "counted";
          const key = `${habit.id}:${today}`;
          const timedVal = lifeOsConfig.habitDailyValues[key] ?? 0;
          const tier = isTimed ? computeTier(timedVal, hCfg) : null;
          const streak = streaks.find((s) => s.habit.id === habit.id)?.current ?? 0;

          return (
            <div
              key={habit.id}
              onClick={() => {
                if (isPending) return;
                if (isTimed && hCfg) {
                  setPopoverState({ habit, config: hCfg, initialValue: timedVal });
                } else {
                  handleToggleBinary(habit.id, isDone);
                }
              }}
              className={`flex items-center justify-between rounded-xl border p-2 text-xs font-medium cursor-pointer transition-all ${
                isDone
                  ? "border-emerald-500/40 bg-emerald-950/30 text-zinc-200"
                  : isBig3
                  ? "border-amber-500/30 bg-[#241f18] hover:bg-[#2e271d] text-zinc-200"
                  : "border-zinc-800 bg-[#211f1d] hover:bg-zinc-800 text-zinc-200"
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0 flex-1 pr-1.5">
                {isBig3 ? (
                  <span className="text-[11px]" title="Big 3 Habit">🎯</span>
                ) : (
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: habit.color ?? "#5e6ad2" }}
                  />
                )}
                <span className={`truncate text-xs ${isDone ? "line-through opacity-70" : "font-semibold"}`}>
                  {habit.name}
                </span>
                {isTimed && timedVal > 0 && (
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {timedVal}{hCfg?.unit || "m"}
                  </span>
                )}
                {streak > 0 && (
                  <span className="shrink-0 text-[10px] font-bold text-orange-400">
                    🔥{streak}
                  </span>
                )}
              </div>

              {/* Status / Checkbox */}
              {isTimed ? (
                <div
                  className={`flex h-5 items-center justify-center rounded px-1.5 text-[10px] font-bold border ${
                    tier === "stretch"
                      ? "border-purple-500 bg-purple-900/50 text-purple-300"
                      : tier === "target"
                      ? "border-emerald-500 bg-emerald-900/50 text-emerald-300"
                      : tier === "minimum"
                      ? "border-amber-500 bg-amber-900/50 text-amber-300"
                      : timedVal > 0
                      ? "border-red-500 bg-red-900/40 text-red-300"
                      : "border-zinc-700 bg-zinc-900 text-zinc-500"
                  }`}
                >
                  {tier ?? "—"}
                </div>
              ) : (
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all ${
                    isDone
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-zinc-600 bg-zinc-900 text-transparent"
                  } ${isPending ? "opacity-50 cursor-wait" : ""}`}
                >
                  {isDone && <Check size={12} strokeWidth={3} />}
                </div>
              )}
            </div>
          );
        })}

        {!habits.length && (
          <div className="py-8 text-center text-xs text-zinc-500">No active habits logged.</div>
        )}
      </div>

      {/* FOOTER */}
      <div className="mt-2 flex items-center justify-between border-t border-zinc-800 pt-2 text-[10px] text-zinc-400 shrink-0">
        <span>Click ↗ to expand</span>
        <span className="font-semibold text-zinc-300">
          Core: {todayScore.coreCompleted}/{todayScore.coreTotal}
        </span>
      </div>

      {/* Tier Input Modal */}
      {popoverState && (
        <TierInputPopover
          isOpen={true}
          habitName={popoverState.habit.name}
          config={popoverState.config}
          initialValue={popoverState.initialValue}
          onSave={handleSaveTierValue}
          onClose={() => setPopoverState(null)}
        />
      )}
    </div>
  );
}
