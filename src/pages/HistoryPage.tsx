import { CompletionGraph } from "../components/CompletionGraph";
import { CountdownWidget } from "../components/CountdownWidget";
import { MonthSwitcher } from "../components/MonthSwitcher";
import { StatStrip } from "../components/StatStrip";
import type { DailyScore } from "../calculations/dailyScore";
import type { MonthlyStats } from "../calculations/monthlyStats";
import type { WeeklyStat } from "../calculations/weeklyStats";
import type { HabitStreak } from "../calculations/streaks";
import type { Settings } from "../types";

interface HistoryPageProps {
  visibleMonth: Date;
  previousMonth: () => void;
  nextMonth: () => void;
  dailyScores: DailyScore[];
  monthlyStats: MonthlyStats;
  weeklyStats: WeeklyStat[];
  streaks: HabitStreak[];
  settings: Settings;
}

function value(value: number | null, suffix = "%") {
  return value === null ? "No data" : `${value}${suffix}`;
}

export function HistoryPage({ visibleMonth, previousMonth, nextMonth, dailyScores, monthlyStats, weeklyStats, streaks, settings }: HistoryPageProps) {
  return (
    <section className="h-full overflow-auto pb-4">
      <div className="space-y-4">
        <MonthSwitcher date={visibleMonth} isCurrentMonth={visibleMonth.getFullYear() === new Date().getFullYear() && visibleMonth.getMonth() === new Date().getMonth()} previousMonth={previousMonth} nextMonth={nextMonth} />
        {settings.countdownDate && (
          <CountdownWidget targetDate={settings.countdownDate} title={settings.countdownTitle} />
        )}
        <StatStrip
          stats={[
            { label: "Average", value: value(monthlyStats.average), title: "Average percentage of habits completed per day this month" },
            { label: "Consistency", value: value(monthlyStats.consistency), title: "Percentage of days where at least one habit was completed" },
            { label: "Stability", value: value(monthlyStats.stability), title: "Consistency of daily completion rates (lower variance)" },
            { label: "Volatility", value: value(monthlyStats.volatility, ""), title: "Average day-to-day swing in completion percentage (lower is better)" },
          ]}
        />
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase text-zinc-600 dark:text-zinc-300">Monthly Completion</h2>
          <CompletionGraph dailyScores={dailyScores} />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase text-zinc-600 dark:text-zinc-300">Habit Performance</h2>
            <div className="rounded border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
              {monthlyStats.habitPerformance.map((item) => (
                <div key={item.habit.id} className="grid grid-cols-[1fr_80px] border-b border-zinc-200 px-3 py-2 last:border-b-0 dark:border-zinc-800">
                  <span>{item.habit.name}</span>
                  <span className="text-right font-medium">{item.percent === null ? "No data" : `${item.percent}%`}</span>
                </div>
              ))}
            </div>
          </section>
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase text-zinc-600 dark:text-zinc-300">Streaks</h2>
            <div className="rounded border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
              {streaks.map((item) => (
                <div key={item.habit.id} className="grid grid-cols-[1fr_120px_120px] border-b border-zinc-200 px-3 py-2 last:border-b-0 dark:border-zinc-800">
                  <span>{item.habit.name}</span>
                  <span>Current: {item.current}</span>
                  <span>Best: {item.best}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* F1: Category Breakdown */}
        {(() => {
          const map = new Map<string, { total: number; count: number }>();
          monthlyStats.habitPerformance.forEach((item) => {
            const cat = item.habit.category?.trim() || "General";
            if (item.percent !== null) {
              const cur = map.get(cat) ?? { total: 0, count: 0 };
              map.set(cat, { total: cur.total + item.percent, count: cur.count + 1 });
            }
          });
          const catList = Array.from(map.entries()).map(([category, data]) => ({
            category,
            avg: Math.round(data.total / data.count),
          }));

          if (!catList.length) return null;

          return (
            <div>
              <h2 className="mb-2 text-sm font-semibold uppercase text-zinc-600 dark:text-zinc-300">Category Breakdown</h2>
              <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
                {catList.map((c) => (
                  <div key={c.category} className="rounded border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="text-xs text-zinc-500 font-medium">{c.category}</div>
                    <div className="text-lg font-bold">{c.avg}%</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        <div className="grid gap-4 lg:grid-cols-2">
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase text-zinc-600 dark:text-zinc-300">Weekly Averages</h2>
            <div className="rounded border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
              {weeklyStats.map((week) => (
                <div key={week.week} className="grid grid-cols-[1fr_80px] border-b border-zinc-200 px-3 py-2 last:border-b-0 dark:border-zinc-800">
                  <span>{week.week}</span>
                  <span className="text-right font-medium">{value(week.average)}</span>
                </div>
              ))}
              {!weeklyStats.length ? <div className="px-3 py-2 text-sm text-zinc-500">No logged days yet.</div> : null}
            </div>
          </section>
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase text-zinc-600 dark:text-zinc-300">Signals</h2>
            <div className="rounded border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div>Strongest day: {monthlyStats.strongestDay ? `${monthlyStats.strongestDay.date} (${monthlyStats.strongestDay.percent}%)` : "No data"}</div>
              <div>Weakest day: {monthlyStats.weakestDay ? `${monthlyStats.weakestDay.date} (${monthlyStats.weakestDay.percent}%)` : "No data"}</div>
              <div>Baseline: {value(monthlyStats.baseline)}</div>
              <div>Slump days: {monthlyStats.slumpDays}</div>
              <div>Bounce-backs: {monthlyStats.bounceBacks}</div>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
