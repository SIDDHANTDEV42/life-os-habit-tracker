import { CompletionGraph } from "../components/CompletionGraph";
import { CountdownWidget } from "../components/CountdownWidget";
import { HabitGrid } from "../components/HabitGrid";
import { HabitGridSkeleton } from "../components/HabitGridSkeleton";
import { MonthSwitcher } from "../components/MonthSwitcher";
import { StatStrip } from "../components/StatStrip";
import type { DailyScore } from "../calculations/dailyScore";
import type { HabitStreak } from "../calculations/streaks";
import { todayIso } from "../lib/date";
import type { Completion, Habit, Settings } from "../types";

interface HabitsPageProps {
  loading: boolean;
  visibleMonth: Date;
  setVisibleMonth: (date: Date) => void;
  previousMonth: () => void;
  nextMonth: () => void;
  goToToday: () => void;
  habits: Habit[];
  completions: Completion[];
  dailyScores: DailyScore[];
  streaks: HabitStreak[];
  settings: Settings;
  onRefresh: () => Promise<void>;
  onSaveNote?: (dateIso: string, note: string) => void;
  onToggleSkipped?: (key: string) => void;
}

export function HabitsPage({
  loading,
  visibleMonth,
  previousMonth,
  nextMonth,
  goToToday,
  habits,
  completions,
  dailyScores,
  streaks,
  settings,
  onRefresh,
  onSaveNote,
  onToggleSkipped,
}: HabitsPageProps) {
  const scored = dailyScores.filter((day) => day.percent !== null);

  const average = scored.length
    ? Math.round(
        scored.reduce((sum, day) => sum + (day.score ?? 0), 0) /
          scored.length,
      )
    : null;

  const todayStr = todayIso();
  const today = dailyScores.find((day) => day.date === todayStr);

  // Compute trend: compare today's score to the rolling 7-day prior average
  const priorWeek = dailyScores
    .filter((day) => day.date < todayStr && day.percent !== null)
    .slice(-7);
  const priorAvg = priorWeek.length
    ? priorWeek.reduce((s, d) => s + (d.score ?? 0), 0) / priorWeek.length
    : null;

  const todayScore = today?.score ?? null;
  const todayTrend: "up" | "down" | null =
    todayScore !== null && priorAvg !== null
      ? todayScore > priorAvg ? "up" : todayScore < priorAvg ? "down" : null
      : null;

  // Compare current month average to prior 7-day average
  const monthTrend: "up" | "down" | null =
    average !== null && priorAvg !== null
      ? average > priorAvg ? "up" : average < priorAvg ? "down" : null
      : null;

  const wowDelta =
    todayScore !== null && priorAvg !== null && priorAvg > 0
      ? Math.round(todayScore - priorAvg)
      : null;
  const wowSubtext = wowDelta !== null ? `${wowDelta >= 0 ? "+" : ""}${wowDelta}% vs 7d avg` : undefined;

  return (
    <section className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto">
      {/* MONTH SWITCHER */}
      <div className="shrink-0">
        <MonthSwitcher
          date={visibleMonth}
          isCurrentMonth={visibleMonth.getFullYear() === new Date().getFullYear() && visibleMonth.getMonth() === new Date().getMonth()}
          previousMonth={previousMonth}
          nextMonth={nextMonth}
          goToToday={goToToday}
        />
      </div>

      {/* F7: COUNTDOWN BANNER */}
      {settings.countdownDate && (
        <CountdownWidget
          targetDate={settings.countdownDate}
          title={settings.countdownTitle}
        />
      )}

      {/* TOP STATISTICS */}
      <div className="shrink-0">
        <StatStrip
        stats={[
          {
            label: "Active habits",
            value: String(habits.length),
          },
          {
            label: "Monthly score",
            value: average === null ? "No data" : `${average}%`,
            trend: monthTrend,
          },
          {
            label: "Today",
            value:
              today?.percent === null || today?.percent === undefined
                ? "Not logged"
                : `${today.percent}%`,
            trend: todayTrend,
            subtext: wowSubtext,
          },
          {
            label: "Logged days",
            value: String(scored.length),
          },
        ]}
      />
      </div>

      {/* LOADING STATE */}
      {loading && !habits.length ? (
        <>
          <div className="shrink-0">
            <div className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              Monthly Completion
            </div>
            {/* skeleton graph bar */}
            <div className="h-16 w-full animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
          </div>
          <div className="min-h-[500px] shrink-0">
            <HabitGridSkeleton />
          </div>
        </>
      ) : (
        <>
          <div className="shrink-0">
            <div className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              Monthly Completion
            </div>

            <CompletionGraph dailyScores={dailyScores} />
          </div>

          {/* HABIT GRID */}
          <div className="min-h-[500px] shrink-0">
            <HabitGrid
              visibleMonth={visibleMonth}
              habits={habits}
              completions={completions}
              dailyScores={dailyScores}
              settings={settings}
              streaks={streaks}
              onRefresh={onRefresh}
              onSaveNote={onSaveNote}
              onToggleSkipped={onToggleSkipped}
            />
          </div>
        </>
      )}
    </section>
  );
}