import React, { useState, useMemo } from "react";
import {
  Flame,
  ShieldCheck,
  Clock,
  Hash,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Info,
} from "lucide-react";
import type {
  Habit,
  Completion,
  Settings,
  LifeOsConfig,
  HabitConfig,
  SleepWakeLog,
} from "../types";
import { DEFAULT_LIFE_OS_CONFIG } from "../types";
import type { DailyScore } from "../calculations/dailyScore";
import type { HabitStreak } from "../calculations/streaks";
import { calculateLifeOsTodayScore } from "../calculations/dailyScore";
import { getHabitCategory, computeTier, meetsMinimum } from "../calculations/tierScore";
import { todayIso } from "../lib/date";
import { toggleCompletion, saveSettings } from "../database/api";

import { TodayScore } from "../components/TodayScore";
import { Big3Card } from "../components/Big3Card";
import { SleepWakeCard } from "../components/SleepWakeCard";
import { AbstinenceTracker } from "../components/AbstinenceTracker";
import { DeadTimeQueue } from "../components/DeadTimeQueue";
import { LowEnergyDay } from "../components/LowEnergyDay";
import { TierInputPopover } from "../components/TierInputPopover";

interface DashboardPageProps {
  habits: Habit[];
  completions: Completion[];
  dailyScores: DailyScore[];
  streaks: HabitStreak[];
  settings: Settings;
  onNavigate: (tab: "habits" | "history" | "settings") => void;
  onRefresh?: () => void;
  onUpdateSettings?: (settings: Settings) => Promise<void>;
}

export function DashboardPage({
  habits,
  completions,
  dailyScores,
  streaks,
  settings,
  onNavigate,
  onRefresh,
  onUpdateSettings,
}: DashboardPageProps) {
  const today = todayIso();
  const lifeOsConfig: LifeOsConfig = settings.lifeOsConfig ?? DEFAULT_LIFE_OS_CONFIG;

  // Popover state for logging timed/counted habits
  const [activePopover, setActivePopover] = useState<{
    habit: Habit;
    config: HabitConfig;
    currentValue: number;
  } | null>(null);

  const [showOptional, setShowOptional] = useState(false);

  // Active habits for today (excluding expired temporary habits)
  const dashboardHabits = useMemo(() => {
    return habits.filter((h) => {
      const cfg = lifeOsConfig.habitConfigs[h.id];
      if (cfg?.isTemporary && cfg.temporaryEnd && cfg.temporaryEnd < today) {
        return false;
      }
      return true;
    });
  }, [habits, lifeOsConfig.habitConfigs, today]);

  // Group active habits into three categories
  const { coreHabits, guardrailHabits, optionalHabits, abstinenceHabits } = useMemo(() => {
    const core: Habit[] = [];
    const guardrail: Habit[] = [];
    const optional: Habit[] = [];
    const abstinence: Habit[] = [];

    for (const h of dashboardHabits) {
      const cat = getHabitCategory(h.id, lifeOsConfig.habitConfigs);
      if (cat === "core") {
        core.push(h);
      } else if (cat === "guardrail") {
        guardrail.push(h);
        const nameLower = h.name.toLowerCase();
        if (
          nameLower.includes("reel") ||
          nameLower.includes("short") ||
          nameLower.includes("porn") ||
          nameLower.includes("clean") ||
          nameLower.includes("abstinen")
        ) {
          abstinence.push(h);
        }
      } else {
        optional.push(h);
      }
    }

    return {
      coreHabits: core,
      guardrailHabits: guardrail,
      optionalHabits: optional,
      abstinenceHabits: abstinence,
    };
  }, [dashboardHabits, lifeOsConfig.habitConfigs]);

  // Life OS v2 Today Score calculation (Core = Today Score, Guardrails = separate)
  const todayScore = useMemo(
    () => calculateLifeOsTodayScore(today, dashboardHabits, completions, lifeOsConfig),
    [today, dashboardHabits, completions, lifeOsConfig]
  );

  // Completions map for quick lookup
  const completedMap = useMemo(() => {
    const map = new Map<number, boolean>();
    for (const c of completions) {
      if (c.date === today) {
        map.set(c.habitId, c.completed);
      }
    }
    return map;
  }, [completions, today]);

  // Handlers for habit interaction
  const handleToggleBinary = async (habitId: number, currentCompleted: boolean) => {
    try {
      await toggleCompletion(habitId, today, !currentCompleted);
      onRefresh?.();
    } catch (e) {
      console.error("Failed to toggle habit completion:", e);
    }
  };

  const handleSaveTimedValue = async (value: number) => {
    if (!activePopover) return;
    const { habit, config } = activePopover;
    const key = `${habit.id}:${today}`;

    const nextDailyValues = {
      ...lifeOsConfig.habitDailyValues,
      [key]: value,
    };

    const nextConfig: LifeOsConfig = {
      ...lifeOsConfig,
      habitDailyValues: nextDailyValues,
    };

    const nextSettings: Settings = {
      ...settings,
      lifeOsConfig: nextConfig,
    };

    // If value meets minimum, automatically check completion in DB
    const earned = meetsMinimum(value, config);
    try {
      await toggleCompletion(habit.id, today, earned);
      if (onUpdateSettings) {
        await onUpdateSettings(nextSettings);
      } else {
        await saveSettings(nextSettings);
      }
      onRefresh?.();
    } catch (e) {
      console.error("Failed to save habit tier value:", e);
    } finally {
      setActivePopover(null);
    }
  };

  const handleSaveSleepWakeLog = async (log: SleepWakeLog) => {
    const nextLogs = {
      ...lifeOsConfig.sleepWakeLogs,
      [today]: log,
    };
    const nextConfig: LifeOsConfig = {
      ...lifeOsConfig,
      sleepWakeLogs: nextLogs,
    };
    const nextSettings: Settings = {
      ...settings,
      lifeOsConfig: nextConfig,
    };

    if (onUpdateSettings) {
      await onUpdateSettings(nextSettings);
    } else {
      await saveSettings(nextSettings);
    }
    onRefresh?.();
  };

  const isLowEnergyActive = lifeOsConfig.lowEnergyDayDate === today;

  const handleActivateLowEnergy = async () => {
    const nextHistory = {
      ...lifeOsConfig.lowEnergyDayHistory,
      [today]: true,
    };
    const nextConfig: LifeOsConfig = {
      ...lifeOsConfig,
      lowEnergyDayDate: today,
      lowEnergyDayHistory: nextHistory,
    };
    const nextSettings: Settings = {
      ...settings,
      lifeOsConfig: nextConfig,
    };
    if (onUpdateSettings) {
      await onUpdateSettings(nextSettings);
    } else {
      await saveSettings(nextSettings);
    }
    onRefresh?.();
  };

  const handleDeactivateLowEnergy = async () => {
    const nextHistory = {
      ...lifeOsConfig.lowEnergyDayHistory,
      [today]: false,
    };
    const nextConfig: LifeOsConfig = {
      ...lifeOsConfig,
      lowEnergyDayDate: undefined,
      lowEnergyDayHistory: nextHistory,
    };
    const nextSettings: Settings = {
      ...settings,
      lifeOsConfig: nextConfig,
    };
    if (onUpdateSettings) {
      await onUpdateSettings(nextSettings);
    } else {
      await saveSettings(nextSettings);
    }
    onRefresh?.();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Low Energy Alert Banner if active */}
      {isLowEnergyActive && (
        <div className="flex items-center justify-between rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-3.5 text-amber-500 animate-in fade-in">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="shrink-0" />
            <span className="text-xs font-semibold">
              Low Energy Protocol Active — Targets reduced to bare minimums. Focus strictly on protection.
            </span>
          </div>
          <button
            onClick={handleDeactivateLowEnergy}
            className="text-xs font-bold underline hover:opacity-80"
          >
            Reset
          </button>
        </div>
      )}

      {/* SECTION 1: The Big 3 Anchor */}
      <Big3Card
        habits={habits}
        completions={completions}
        config={lifeOsConfig}
        today={today}
        onToggleBinary={handleToggleBinary}
        onOpenTimedInput={(habit, config, val) =>
          setActivePopover({ habit, config, currentValue: val })
        }
        onNavigateToSettings={() => onNavigate("settings")}
      />

      {/* SECTION 2: Today Score (Core) + Guardrails */}
      <TodayScore score={todayScore} />

      {/* SECTION 3: Performance Core Habits Strip */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500 text-xs">
              🔥
            </span>
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
              Performance Core Habits ({todayScore.coreCompleted}/{todayScore.coreTotal})
            </h3>
          </div>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Directly Drives Today Score
          </span>
        </div>

        {coreHabits.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 p-4 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            No habits tagged as Performance Core. Configure habit categories in Settings.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {coreHabits.map((habit) => {
              const cfg = lifeOsConfig.habitConfigs[habit.id];
              const isBinary = !cfg || cfg.habitType === "binary";
              const isDone = completedMap.get(habit.id) ?? false;

              if (isBinary) {
                return (
                  <div
                    key={habit.id}
                    onClick={() => handleToggleBinary(habit.id, isDone)}
                    className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition ${
                      isDone
                        ? "border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/20"
                        : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/60"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
                          isDone ? "bg-emerald-500 text-white" : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800"
                        }`}
                      >
                        {isDone ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                      </div>
                      <span className="truncate text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        {habit.name}
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-zinc-400">
                      {isDone ? "1 pt" : "0 pt"}
                    </span>
                  </div>
                );
              }

              // Timed / Counted
              const key = `${habit.id}:${today}`;
              const val = lifeOsConfig.habitDailyValues[key] ?? 0;
              const tier = computeTier(val, cfg);
              const minMet = meetsMinimum(val, cfg);

              return (
                <div
                  key={habit.id}
                  onClick={() =>
                    setActivePopover({ habit, config: cfg, currentValue: val })
                  }
                  className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition ${
                    minMet
                      ? "border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/20"
                      : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/60"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-500">
                      {cfg.habitType === "timed" ? <Clock size={14} /> : <Hash size={14} />}
                    </div>
                    <div className="min-w-0">
                      <span className="truncate text-xs font-semibold text-zinc-900 dark:text-zinc-100 block">
                        {habit.name}
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        {val} {cfg.unit || "min"} (min: {cfg.tierMinimum ?? "—"})
                      </span>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      tier === "stretch"
                        ? "bg-purple-500/20 text-purple-400"
                        : tier === "target"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : tier === "minimum"
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {tier}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 4: Behavioral Guardrails Strip */}
      {guardrailHabits.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 text-xs">
                🛡️
              </span>
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                Behavioral Guardrails ({todayScore.guardrailsCompleted}/{todayScore.guardrailsTotal})
              </h3>
            </div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Non-negotiable Foundation
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
            {guardrailHabits.map((habit) => {
              const isDone = completedMap.get(habit.id) ?? false;
              return (
                <div
                  key={habit.id}
                  onClick={() => handleToggleBinary(habit.id, isDone)}
                  className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition ${
                    isDone
                      ? "border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/20"
                      : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/60"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${
                        isDone ? "bg-emerald-500 text-white" : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800"
                      }`}
                    >
                      {isDone ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                    </div>
                    <span className="truncate text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      {habit.name}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold ${
                      isDone ? "text-emerald-500" : "text-zinc-400"
                    }`}
                  >
                    {isDone ? "Protected" : "Pending"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 5: Sleep / Wake Schedule Card */}
      <SleepWakeCard
        today={today}
        config={lifeOsConfig}
        onSaveLog={handleSaveSleepWakeLog}
      />

      {/* SECTION 6: Abstinence & Dopamine Guardrails */}
      <AbstinenceTracker
        abstinenceHabits={abstinenceHabits}
        completions={completions}
        today={today}
        onToggleClean={handleToggleBinary}
      />

      {/* SECTION 7: Dead Time Queue (Collapsible) */}
      <DeadTimeQueue items={lifeOsConfig.deadTimeQueue} />

      {/* SECTION 8: Optional Work (Collapsible, Does Not Affect Score) */}
      {optionalHabits.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70">
          <button
            onClick={() => setShowOptional(!showOptional)}
            className="flex w-full items-center justify-between p-4 text-left hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition rounded-2xl"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-200/70 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 text-xs">
                📋
              </span>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                  Optional & Secondary Work ({optionalHabits.length})
                </h3>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  These are secondary. Protect your Big 3 and core habits first.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 hidden sm:inline">
                {showOptional ? "Hide" : "Show"}
              </span>
              {showOptional ? <ChevronUp size={18} className="text-zinc-400" /> : <ChevronDown size={18} className="text-zinc-400" />}
            </div>
          </button>

          {showOptional && (
            <div className="border-t border-zinc-100 p-4 dark:border-zinc-800 animate-in fade-in duration-150">
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3 italic">
                * Note: Optional habits do not count toward your Today Score or Guardrails.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {optionalHabits.map((habit) => {
                  const isDone = completedMap.get(habit.id) ?? false;
                  return (
                    <div
                      key={habit.id}
                      onClick={() => handleToggleBinary(habit.id, isDone)}
                      className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition ${
                        isDone
                          ? "border-zinc-400/40 bg-zinc-100/60 dark:border-zinc-700 dark:bg-zinc-800/40"
                          : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/60"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${
                            isDone ? "bg-zinc-700 text-white dark:bg-zinc-300 dark:text-zinc-900" : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800"
                          }`}
                        >
                          {isDone ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                        </div>
                        <span className="truncate text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                          {habit.name}
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-400">Optional</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 9: Low Energy Day Toggle Protocol */}
      <LowEnergyDay
        isActiveToday={isLowEnergyActive}
        onActivate={handleActivateLowEnergy}
        onDeactivate={handleDeactivateLowEnergy}
      />

      {/* Tier Input Modal */}
      {activePopover && (
        <TierInputPopover
          isOpen={true}
          habitName={activePopover.habit.name}
          config={activePopover.config}
          initialValue={activePopover.currentValue}
          onSave={handleSaveTimedValue}
          onClose={() => setActivePopover(null)}
        />
      )}
    </div>
  );
}
