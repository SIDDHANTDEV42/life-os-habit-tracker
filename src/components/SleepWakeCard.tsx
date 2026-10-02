import React, { useState } from "react";
import { Moon, Sun, Clock, Check, AlertCircle } from "lucide-react";
import type { LifeOsConfig, SleepWakeLog } from "../types";

interface SleepWakeCardProps {
  today: string;
  config: LifeOsConfig;
  onSaveLog: (log: SleepWakeLog) => void;
}

function timeDiffMinutes(timeA: string, timeB: string): number {
  const [hA, mA] = timeA.split(":").map(Number);
  const [hB, mB] = timeB.split(":").map(Number);
  if (isNaN(hA) || isNaN(mA) || isNaN(hB) || isNaN(mB)) return 999;
  const minsA = hA * 60 + mA;
  const minsB = hB * 60 + mB;
  let diff = Math.abs(minsA - minsB);
  if (diff > 720) {
    diff = 1440 - diff;
  }
  return diff;
}

export function SleepWakeCard({ today, config, onSaveLog }: SleepWakeCardProps) {
  // Resolve today's target: check date-specific override first, then fallback to defaults
  const dateOverride = config.sleepWakeTargets.find((t) => t.date === today);
  const wakeTarget = dateOverride?.wakeTarget || config.sleepWakeDefaultWake;
  const sleepTarget = dateOverride?.sleepTarget || config.sleepWakeDefaultSleep;

  const todayLog = config.sleepWakeLogs[today] ?? { date: today };

  const [actualWake, setActualWake] = useState(todayLog.actualWake ?? "");
  const [actualSleep, setActualSleep] = useState(todayLog.actualSleep ?? "");
  const [savedSuccess, setSavedSuccess] = useState(false);

  // If no targets configured at all, hide or show minimal state
  if (!wakeTarget && !sleepTarget) {
    return null;
  }

  const handleSave = () => {
    onSaveLog({
      date: today,
      actualWake: actualWake || undefined,
      actualSleep: actualSleep || undefined,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const getStatusBadge = (target?: string, actual?: string) => {
    if (!target || !actual) return null;
    const diff = timeDiffMinutes(target, actual);
    if (diff <= 10) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
          🟢 On Schedule (±{diff}m)
        </span>
      );
    }
    if (diff <= 30) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
          🟡 Close (±{diff}m)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-xs font-semibold text-red-400">
        🔴 Off Schedule (+{diff}m)
      </span>
    );
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500 text-xs">
            🌙
          </span>
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
            Circadian Rhythm & Sleep Guardrail
          </h3>
        </div>
        {dateOverride && (
          <span className="text-[11px] font-medium text-amber-500 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
            Reset Schedule Active
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {/* Wake Row */}
        {wakeTarget && (
          <div className="flex flex-col gap-2 rounded-xl border border-zinc-100 bg-zinc-50/70 p-3.5 dark:border-zinc-800/60 dark:bg-zinc-950/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sun size={16} className="text-amber-500" />
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Wake Target: <span className="text-sm font-bold text-zinc-900 dark:text-white">{wakeTarget}</span>
                </span>
              </div>
              {getStatusBadge(wakeTarget, actualWake)}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                Actual:
              </span>
              <input
                type="time"
                value={actualWake}
                onChange={(e) => setActualWake(e.target.value)}
                className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        )}

        {/* Sleep Row */}
        {sleepTarget && (
          <div className="flex flex-col gap-2 rounded-xl border border-zinc-100 bg-zinc-50/70 p-3.5 dark:border-zinc-800/60 dark:bg-zinc-950/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Moon size={16} className="text-indigo-400" />
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Sleep Target: <span className="text-sm font-bold text-zinc-900 dark:text-white">{sleepTarget}</span>
                </span>
              </div>
              {getStatusBadge(sleepTarget, actualSleep)}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                Actual:
              </span>
              <input
                type="time"
                value={actualSleep}
                onChange={(e) => setActualSleep(e.target.value)}
                className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end items-center gap-2 mt-3 pt-2">
        {savedSuccess && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-500">
            <Check size={14} /> Saved
          </span>
        )}
        <button
          onClick={handleSave}
          className="rounded-xl bg-zinc-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white transition"
        >
          Save Log
        </button>
      </div>
    </div>
  );
}
