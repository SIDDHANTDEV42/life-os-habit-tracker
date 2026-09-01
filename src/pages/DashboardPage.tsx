import { useMemo } from "react";
import { Flame, TrendingUp, TrendingDown, Minus, Calendar, Zap } from "lucide-react";
import type { Habit, Completion, Settings } from "../types";
import type { DailyScore } from "../calculations/dailyScore";
import type { HabitStreak } from "../calculations/streaks";
import { todayIso, toIsoDate } from "../lib/date";
import { CountdownWidget } from "../components/CountdownWidget";

interface DashboardPageProps {
  habits: Habit[];
  completions: Completion[];
  dailyScores: DailyScore[];
  streaks: HabitStreak[];
  settings: Settings;
  onNavigate: (tab: "habits" | "history" | "settings") => void;
}

export function DashboardPage({
  habits,
  completions,
  dailyScores,
  streaks,
  settings,
  onNavigate,
}: DashboardPageProps) {
  const today = todayIso();

  // Today's completion rate
  const todayCompletions = useMemo(
    () => completions.filter((c) => c.date === today && c.completed),
    [completions, today]
  );

  const todayPercent = habits.length
    ? Math.round((todayCompletions.length / habits.length) * 100)
    : 0;

  // Max active & best streak
  const maxStreak = useMemo(
    () => Math.max(0, ...streaks.map((s) => s.current)),
    [streaks]
  );
  const bestStreak = useMemo(
    () => Math.max(0, ...streaks.map((s) => s.best)),
    [streaks]
  );

  // Group habits by category
  const categorySummary = useMemo(() => {
    const map = new Map<string, { total: number; done: number; color: string }>();
    habits.forEach((h) => {
      const cat = h.category?.trim() || "General";
      const isDone = todayCompletions.some((c) => c.habitId === h.id);
      const existing = map.get(cat) ?? { total: 0, done: 0, color: h.color ?? "#5e6ad2" };
      map.set(cat, {
        total: existing.total + 1,
        done: existing.done + (isDone ? 1 : 0),
        color: existing.color,
      });
    });
    return Array.from(map.entries());
  }, [habits, todayCompletions]);

  // Last 7 days weekly activity for heatmap bar chart using local dates
  const weeklyActivity = useMemo(() => {
    const days: Array<{ label: string; percent: number }> = [];
    const now = new Date();
    const weekdays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const iso = toIsoDate(d);
      const scoreObj = dailyScores.find((s) => s.date === iso);
      days.push({
        label: weekdays[d.getDay()],
        percent: scoreObj?.percent ?? 0,
      });
    }
    return days;
  }, [dailyScores]);

  // Compute actual weekly trend from the 7-day data
  const weeklyTrend = useMemo(() => {
    const withData = weeklyActivity.filter((d) => d.percent > 0);
    if (withData.length < 3) return null;
    const midpoint = Math.floor(withData.length / 2);
    const firstHalf = withData.slice(0, midpoint);
    const secondHalf = withData.slice(midpoint);
    const firstAvg = firstHalf.reduce((s, d) => s + d.percent, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((s, d) => s + d.percent, 0) / secondHalf.length;
    if (secondAvg > firstAvg + 3) return "up" as const;
    if (secondAvg < firstAvg - 3) return "down" as const;
    return "flat" as const;
  }, [weeklyActivity]);

  // Circular gauge calculations (SVG circumference for r=45 is ~282.74)
  const strokeDashoffset = 282.74 - (282.74 * todayPercent) / 100;

  return (
    <div className="flex flex-col gap-8 pb-16">
      {/* WELCOME & TODAY'S PROGRESS HERO */}
      <section className="flex flex-col md:flex-row items-center justify-between gap-8 pt-4">
        <div className="flex-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3.5 py-1 text-xs font-bold text-orange-600 dark:text-orange-400 mb-3 shadow-sm">
            <Flame size={15} className="animate-pulse text-orange-500 shrink-0" />
            <span className="whitespace-nowrap">
              {maxStreak > 0 ? `${maxStreak} Day Streak Active` : bestStreak > 0 ? `${bestStreak} Day Record Streak` : "0 Day Streak"}
            </span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-zinc-900 dark:text-white">
            Welcome back, Student
          </h1>
          <p className="mt-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 max-w-lg leading-relaxed">
            {maxStreak > 0 ? (
              <>
                You're on a <strong className="text-orange-500 font-bold">{maxStreak}-day streak</strong>. Keep up the momentum for your goals!
              </>
            ) : bestStreak > 0 ? (
              <>
                Your best record is a <strong className="text-orange-500 font-bold">{bestStreak}-day streak</strong>. Log today's habits to start a new streak!
              </>
            ) : (
              "Log today's habits to start building your streak!"
            )}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate("habits")}
              className="flex items-center gap-2 rounded-xl bg-[#5e6ad2] px-5 py-3 text-sm font-semibold text-white hover:bg-[#4b57be] hover:shadow-[0_0_20px_rgba(94,106,210,0.4)] transition-all active:scale-95 shadow-sm"
            >
              <Zap size={16} className="shrink-0" />
              <span className="whitespace-nowrap">Log Today's Habits</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate("history")}
              className="flex items-center gap-2.5 rounded-xl border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-200 dark:hover:bg-zinc-800 transition-all active:scale-95 shadow-sm"
            >
              <Calendar size={16} className="shrink-0 text-zinc-500 dark:text-zinc-400" />
              <span className="whitespace-nowrap">View Analytics</span>
            </button>
          </div>
        </div>

        {/* CIRCULAR PROGRESS GAUGE */}
        <div className="relative flex h-56 w-56 shrink-0 items-center justify-center rounded-3xl border border-zinc-200 bg-white dark:border-zinc-800/80 dark:bg-zinc-900/40 p-4 backdrop-blur-xl shadow-xl">
          <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#e2e8f0"
              className="dark:stroke-[#211f1d]"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#5e6ad2"
              strokeWidth="7"
              strokeDasharray="282.74"
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
              style={{ filter: "drop-shadow(0 0 8px rgba(94, 106, 210, 0.4))" }}
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-4xl font-extrabold tracking-tighter text-zinc-900 dark:text-white">{todayPercent}%</span>
            <span className="mt-1 text-[10px] font-bold tracking-widest text-zinc-500 dark:text-zinc-400 uppercase">TODAY</span>
          </div>
        </div>
      </section>

      {/* TARGET COUNTDOWN BANNER */}
      {settings.countdownDate && (
        <CountdownWidget
          targetDate={settings.countdownDate}
          title={settings.countdownTitle}
        />
      )}

      {/* DASHBOARD BENTO GRID */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* WEEKLY ACTIVITY HEATMAP */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/40 p-6 backdrop-blur-xl md:col-span-2 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Weekly Activity</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Completion rate over the last 7 days</p>
            </div>
            {weeklyTrend === "down" ? (
              <div className="flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 px-3 py-1 text-xs font-semibold">
                <TrendingDown size={14} />
                <span>Trending Down</span>
              </div>
            ) : weeklyTrend === "up" ? (
              <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 px-3 py-1 text-xs font-semibold">
                <TrendingUp size={14} />
                <span>Trending Up</span>
              </div>
            ) : weeklyTrend === "flat" ? (
              <div className="flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 px-3 py-1 text-xs font-semibold">
                <Minus size={14} />
                <span>Holding Steady</span>
              </div>
            ) : null}
          </div>

          {/* HEATMAP BARS WITH PERCENTAGES */}
          <div className="flex h-36 items-end justify-between gap-3 pt-4">
            {weeklyActivity.map((day, idx) => (
              <div key={idx} className="flex flex-1 flex-col items-center gap-1.5 h-full justify-end group">
                <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
                  {day.percent}%
                </span>
                <div className="w-full rounded-t bg-zinc-100 dark:bg-zinc-800/60 relative overflow-hidden flex items-end h-full">
                  <div
                    className={`w-full rounded-t transition-all duration-500 ${
                      day.percent >= 80
                        ? "bg-[#e4f222] shadow-[0_0_12px_rgba(228,242,34,0.4)]"
                        : day.percent >= 50
                        ? "bg-[#5e6ad2] shadow-[0_0_12px_rgba(94,106,210,0.4)]"
                        : day.percent > 0
                        ? "bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.4)]"
                        : "bg-zinc-300 dark:bg-zinc-700/60"
                    }`}
                    style={{ height: `${Math.max(day.percent, 8)}%` }}
                  />
                </div>
                <span className="text-[10px] font-bold tracking-wider text-zinc-500 dark:text-zinc-400">{day.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ACTIVE HABITS SUMMARY */}
        <div className="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/40 p-6 backdrop-blur-xl shadow-sm">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Active Habits</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Currently tracking</p>
          </div>

          <div className="mt-4">
            <div className="flex items-baseline gap-3">
              <span className="text-5xl font-extrabold tracking-tighter text-zinc-900 dark:text-white">
                {habits.length}
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Total Habits
              </span>
            </div>

            <div className="mt-6 space-y-3">
              {categorySummary.map(([cat, data]) => (
                <div key={cat} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: data.color }}
                    />
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">{cat}</span>
                  </div>
                  <span className="font-semibold text-zinc-900 dark:text-white">
                    {data.done}/{data.total}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
