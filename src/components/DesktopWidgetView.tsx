import { useState, useEffect } from "react";
import { Check, Flame, Maximize2, CheckSquare } from "lucide-react";
import type { Habit, Completion, Settings } from "../types";
import type { HabitStreak } from "../calculations/streaks";
import { todayIso } from "../lib/date";
import { toggleCompletion } from "../database/api";

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

  const completedCount = habits.filter((h) => todayCompletions.get(h.id)).length;
  const todayPercent = habits.length ? Math.round((completedCount / habits.length) * 100) : 0;

  async function handleToggle(habitId: number, current: boolean) {
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

  return (
    <div className="fixed inset-0 z-50 flex h-full w-full flex-col bg-[#151311] text-white p-3 select-none overflow-hidden border border-zinc-800">
      {/* WIDGET HEADER */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#5e6ad2] text-white shadow-[0_0_10px_rgba(94,106,210,0.4)]">
            <CheckSquare size={16} />
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-200">Life OS Widget</h2>
            <div className="text-[10px] font-bold text-[#e4f222]">{todayPercent}% Completed Today</div>
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

      {/* COUNTDOWN BANNER CARD */}
      {settings.countdownDate && timeLeft && (
        <div className="mt-2.5 shrink-0 rounded-xl border border-orange-500/40 bg-gradient-to-r from-orange-950/90 via-amber-950/90 to-orange-900/90 p-3 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-orange-300 truncate">
              <Flame size={15} className="animate-pulse text-orange-400 shrink-0" />
              <span className="truncate">{settings.countdownTitle || "GATE 2027"}</span>
            </div>
            <div className="text-[11px] font-extrabold text-amber-200 shrink-0 bg-black/40 px-2 py-0.5 rounded border border-orange-500/30">
              {timeLeft.isPassed ? "Arrived! 🎯" : `${timeLeft.days}d ${timeLeft.hours}h ${timeLeft.mins}m`}
            </div>
          </div>
        </div>
      )}

      {/* QUICK HABITS LIST */}
      <div className="mt-2.5 flex-1 overflow-y-auto space-y-1.5 pr-0.5">
        {habits.map((habit) => {
          const isDone = Boolean(todayCompletions.get(habit.id));
          const isPending = pending.has(habit.id);
          const streak = streaks.find((s) => s.habit.id === habit.id)?.current ?? 0;

          return (
            <div
              key={habit.id}
              onClick={() => !isPending && handleToggle(habit.id, isDone)}
              className={`flex items-center justify-between rounded-xl border p-2.5 text-xs font-medium cursor-pointer transition-all ${
                isDone
                  ? "border-emerald-500/40 bg-emerald-950/40 text-zinc-200"
                  : "border-zinc-800 bg-[#211f1d] hover:bg-zinc-800 text-zinc-200"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: habit.color ?? "#5e6ad2" }}
                />
                <span className={`truncate ${isDone ? "line-through opacity-70" : "font-semibold"}`}>
                  {habit.name}
                </span>
                {(() => {
                  const streak = streaks.find((s) => s.habit.id === habit.id)?.current ?? 0;
                  return streak > 0 ? (
                    <span className="shrink-0 text-[10px] font-bold text-orange-400">
                      🔥{streak}
                    </span>
                  ) : null;
                })()}
              </div>

              {/* Checkbox */}
              <div
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all ${
                  isDone
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-zinc-600 bg-zinc-900 text-transparent"
                } ${isPending ? "opacity-50 cursor-wait" : ""}`}
              >
                {isDone && <Check size={12} strokeWidth={3} />}
              </div>
            </div>
          );
        })}

        {!habits.length && (
          <div className="py-8 text-center text-xs text-zinc-500">No active habits logged.</div>
        )}
      </div>

      {/* FOOTER */}
      <div className="mt-2 flex items-center justify-between border-t border-zinc-800 pt-2 text-[10px] text-zinc-400 shrink-0">
        <span>Click ↗ to expand app</span>
        <span className="font-semibold text-zinc-300">{completedCount}/{habits.length} Done</span>
      </div>
    </div>
  );
}
