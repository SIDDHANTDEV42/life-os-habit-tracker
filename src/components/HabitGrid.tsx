import { useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";
import { toggleCompletion, saveSettings } from "../database/api";
import { getMonthDays, isFutureIso, toIsoDate, todayIso } from "../lib/date";
import { messageFromError } from "../lib/error";
import type { Completion, Habit, Settings, HabitConfig } from "../types";
import { DailyNoteModal } from "./DailyNoteModal";
import { TierInputPopover } from "./TierInputPopover";
import type { DailyScore } from "../calculations/dailyScore";
import type { HabitStreak } from "../calculations/streaks";
import { computeTier, meetsMinimum } from "../calculations/tierScore";

interface HabitGridProps {
  visibleMonth: Date;
  habits: Habit[];
  completions: Completion[];
  dailyScores: DailyScore[];
  settings: Settings;
  streaks: HabitStreak[];
  onRefresh: () => Promise<void>;
  onSaveNote?: (dateIso: string, note: string) => void;
  onToggleSkipped?: (key: string) => void;
}

export function HabitGrid({
  visibleMonth,
  habits,
  completions,
  dailyScores,
  settings,
  streaks,
  onRefresh,
  onSaveNote,
  onToggleSkipped,
}: HabitGridProps) {
  const [selected, setSelected] = useState({ row: 0, col: 0 });
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  // Optimistic overrides: key -> desired completed value before DB confirms
  const [optimistic, setOptimistic] = useState<Map<string, boolean>>(new Map());
  // F5: Daily Note Modal state
  const [activeNoteDate, setActiveNoteDate] = useState<string | null>(null);
  // Life OS v2: Tier Input Popover state
  const [popoverState, setPopoverState] = useState<{
    habit: Habit;
    date: string;
    config: HabitConfig;
    initialValue: number;
  } | null>(null);

  const cellRefs = useRef(new Map<string, HTMLButtonElement>());

  const days = useMemo(() => getMonthDays(visibleMonth), [visibleMonth]);

  const today = todayIso();

  const completionMap = useMemo(() => {
    const base = new Map(
      completions.map((item) => [
        `${item.habitId}:${item.date}`,
        item.completed,
      ]),
    );
    // Apply optimistic overrides on top of the server state
    optimistic.forEach((val, key) => base.set(key, val));
    return base;
  }, [completions, optimistic]);

  const performance = useMemo(() => {
    return new Map(
      habits.map((habit) => {
        const records = completions.filter(
          (item) => item.habitId === habit.id,
        );

        const completed = records.filter(
          (item) => item.completed,
        ).length;

        return [
          habit.id,
          {
            completed,
            percent: days.length
              ? Math.round((completed / days.length) * 100)
              : null,
          },
        ];
      }),
    );
  }, [habits, completions, days.length]);

  const habitStreaks = useMemo(() => {
    const now = new Date();
    const isCurrentMonth =
      visibleMonth.getFullYear() === now.getFullYear() &&
      visibleMonth.getMonth() === now.getMonth();

    const map = new Map<number, number>();

    habits.forEach((habit) => {
      if (isCurrentMonth) {
        // For current month: use active current streak relative to today
        const cur = streaks.find((s) => s.habit.id === habit.id)?.current ?? 0;
        map.set(habit.id, cur);
      } else {
        // For past/other months: calculate the max continuous streak achieved within the displayed month
        let maxStreakInMonth = 0;
        let running = 0;

        days.forEach((day) => {
          const iso = toIsoDate(day);
          const key = `${habit.id}:${iso}`;
          const checked = completionMap.get(key) ?? false;

          if (checked) {
            running += 1;
            maxStreakInMonth = Math.max(maxStreakInMonth, running);
          } else {
            running = 0;
          }
        });

        map.set(habit.id, maxStreakInMonth);
      }
    });

    return map;
  }, [visibleMonth, habits, streaks, days, completionMap]);

  /*
   * Focus a particular grid cell.
   *
   * We use two requestAnimationFrame calls because after a completion
   * is saved, onRefresh() causes the grid to re-render.
   *
   * The first frame lets React update the DOM.
   * The second frame makes sure the new button exists before focusing it.
   */
  function focusCell(row: number, col: number) {
    const key = `${row}:${col}`;

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const button = cellRefs.current.get(key);

        if (button && !button.disabled) {
          button.focus();
        }
      });
    });
  }

  /*
   * Move keyboard selection around the grid.
   *
   * Arrow keys NEVER allow the browser to scroll.
   */
  function moveSelection(
    rowDelta: number,
    colDelta: number,
    currentRow: number,
    currentCol: number,
  ) {
    const nextRow = Math.min(
      Math.max(currentRow + rowDelta, 0),
      Math.max(habits.length - 1, 0),
    );

    const nextCol = Math.min(
      Math.max(currentCol + colDelta, 0),
      Math.max(days.length - 1, 0),
    );

    const next = {
      row: nextRow,
      col: nextCol,
    };

    setSelected(next);

    /*
     * If the target is a future/disabled cell, don't try to focus it.
     * We still update the selection so another arrow key continues
     * moving from the correct position.
     */
    const targetHabit = habits[nextRow];
    const targetDate =
      days.length > 0 ? toIsoDate(days[nextCol]) : null;

    if (
      targetHabit &&
      targetDate &&
      !isFutureIso(targetDate)
    ) {
      focusCell(nextRow, nextCol);
    }
  }

  /*
   * Toggle a habit.
   *
   * IMPORTANT:
   * After onRefresh() we explicitly restore focus to the same cell.
   * This fixes the "works once, then arrow keys scroll" problem.
   */
  async function setCell(
    habit: Habit,
    date: string,
    current: boolean,
    row: number,
    col: number,
  ) {
    if (isFutureIso(date)) {
      return;
    }

    const key = `${habit.id}:${date}`;

    setPending((items) => {
      const next = new Set(items);
      next.add(key);
      return next;
    });

    // Optimistically flip the value immediately so UI feels instant
    setOptimistic((prev) => {
      const next = new Map(prev);
      next.set(key, !current);
      return next;
    });

    setError(null);

    /*
     * Keep this cell selected while the data refreshes.
     */
    setSelected({
      row,
      col,
    });

    try {
      await toggleCompletion(
        habit.id,
        date,
        !current,
      );

      await onRefresh();

      /*
       * onRefresh() causes a re-render and normally destroys
       * the previous focused DOM element.
       *
       * Restore focus after the new DOM has been rendered.
       */
      focusCell(row, col);
    } catch (err) {
      setError(messageFromError(err));

      // Revert optimistic update on failure
      setOptimistic((prev) => {
        const next = new Map(prev);
        next.delete(key);
        return next;
      });

      focusCell(row, col);
    } finally {
      setPending((items) => {
        const next = new Set(items);
        next.delete(key);
        return next;
      });
      // Clear optimistic entry — server state (from onRefresh) is now authoritative
      setOptimistic((prev) => {
        const next = new Map(prev);
        next.delete(key);
        return next;
      });
    }
  }

  /* Life OS v2: Save numeric progress from TierInputPopover */
  async function handleSaveTierValue(val: number) {
    if (!popoverState) return;
    const { habit, date, config } = popoverState;
    const key = `${habit.id}:${date}`;
    const nextDailyValues = {
      ...(settings.lifeOsConfig?.habitDailyValues ?? {}),
      [key]: val,
    };
    const nextConfig = {
      ...(settings.lifeOsConfig ?? {
        habitConfigs: {},
        big3HabitIds: [],
        sleepWakeTargets: [],
        sleepWakeLogs: {},
        deadTimeQueue: [],
        lowEnergyDayHistory: {},
        habitDailyValues: {},
      }),
      habitDailyValues: nextDailyValues,
    };
    const nextSettings = {
      ...settings,
      lifeOsConfig: nextConfig,
    };

    const isDone = meetsMinimum(val, config);
    try {
      await saveSettings(nextSettings);
      await toggleCompletion(habit.id, date, isDone);
      await onRefresh();
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setPopoverState(null);
    }
  }

  /* F12: Bulk-fill all habits for a date */
  async function bulkFillDay(date: string) {
    if (isFutureIso(date)) return;
    const unfilled = habits.filter((h) => !completionMap.get(`${h.id}:${date}`));
    if (unfilled.length === 0) return;
    await Promise.allSettled(unfilled.map((h) => toggleCompletion(h.id, date, true)));
    await onRefresh();
  }

  /*
   * Keyboard controls for EACH checkbox.
   *
   * Arrow keys:
   *   ← → ↑ ↓ = move around
   *
   * Space:
   *   tick / untick
   *
   * Enter:
   *   also tick / untick
   */
  function handleCellKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
    habit: Habit,
    date: string,
    row: number,
    col: number,
    checked: boolean,
  ) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      event.stopPropagation();

      moveSelection(0, 1, row, col);
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      event.stopPropagation();

      moveSelection(0, -1, row, col);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      event.stopPropagation();

      moveSelection(1, 0, row, col);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      event.stopPropagation();

      moveSelection(-1, 0, row, col);
      return;
    }

    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();

      setCell(
        habit,
        date,
        checked,
        row,
        col,
      );

      return;
    }
  }

  const isCompact = settings.density === "compact";
  const headerCellSize = isCompact ? "h-5 w-5" : "h-7 w-7";
  const checkboxSize = isCompact ? "h-3 w-3" : "h-4 w-4";
  const checkIconSize = isCompact ? 6 : 8;
  const thWidth = isCompact ? "w-5 min-w-5 max-w-5 text-[10px]" : "w-7 min-w-7 max-w-7";
  const rowPadding = isCompact ? "px-1 py-0.5" : "px-3 py-2";

  return (
    <div className="min-h-0 flex-1">
      {error ? (
        <div className="mb-3 flex items-center gap-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-alert-circle"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
          {error}
        </div>
      ) : null}

      <div
        className="h-full overflow-auto rounded border border-zinc-200 bg-white outline-none dark:border-zinc-800 dark:bg-zinc-900"
        aria-label="Habit checkbox grid"
      >
        <table className="border-collapse text-sm">
          <thead className="sticky top-0 z-20 bg-zinc-100 dark:bg-zinc-900">
            <tr>
              <th className={`sticky left-0 z-30 min-w-56 border border-zinc-500 bg-zinc-100 dark:bg-zinc-900 text-left ${rowPadding} font-semibold dark:border-zinc-700`}>
                HABITS
              </th>

              {days.map((day) => {
                const iso = toIsoDate(day);
                const isToday = iso === today;
                const hasNote = Boolean(settings.dailyNotes?.[iso]);

                return (
                  <th
                    key={iso}
                    className={`${thWidth} border border-zinc-500 px-0 py-0 text-center font-bold dark:border-zinc-700 ${
                      isToday
                        ? "bg-[#fff2cc] text-zinc-950 dark:bg-amber-900 dark:text-amber-50"
                        : ""
                    }`}
                  >
                    <div
                      className={`${headerCellSize} group relative flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 transition-colors`}
                      onClick={() => setActiveNoteDate(iso)}
                      title={hasNote ? `Note: ${settings.dailyNotes?.[iso]}` : "Click to add daily note"}
                    >
                      <div className="flex items-center gap-0.5">
                        <span>{day.getDate()}</span>
                        {hasNote && <span className="text-[10px]" title={settings.dailyNotes?.[iso]}>📝</span>}
                      </div>

                      <div className="text-[11px] text-zinc-500">
                        {day.toLocaleDateString(undefined, {
                          weekday: "narrow",
                        })}
                      </div>

                      {!isFutureIso(iso) && (
                        <button
                          type="button"
                          title="Mark all done for this day"
                          onClick={(e) => {
                            e.stopPropagation();
                            bulkFillDay(iso);
                          }}
                          className="absolute -bottom-1 left-1/2 -translate-x-1/2 hidden group-hover:flex h-3.5 w-3.5 items-center justify-center rounded-full bg-green-500 text-white text-[9px] font-bold hover:bg-green-600"
                        >
                          ✓
                        </button>
                      )}
                    </div>
                  </th>
                );
              })}

              <th className="border border-zinc-500 bg-zinc-100 dark:bg-zinc-900 px-3 text-center font-bold dark:border-zinc-700 dark:bg-zinc-900">
                DAYS DONE
              </th>

              <th className="min-w-6 border border-zinc-500 bg-zinc-100 dark:bg-zinc-900 px-3 text-center font-bold dark:border-zinc-700 dark:bg-zinc-900">
                GRAPH
              </th>

              <th className="border border-zinc-500 bg-zinc-100 dark:bg-zinc-900 px-3 text-center font-bold dark:border-zinc-700 dark:bg-zinc-900">
                %
              </th>
            </tr>
          </thead>

          <tbody>
            {habits.map((habit, row) => (
              <tr key={habit.id}>
                <th className={`sticky left-0 z-10 min-w-56 border border-zinc-500 bg-white text-left font-bold dark:border-zinc-700 dark:bg-zinc-900 ${rowPadding}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="shrink-0 inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: habit.color ?? "var(--accent)" }}
                      />
                      <span className="truncate">{habit.name}</span>
                    </div>
                    {(() => {
                      const streak = habitStreaks.get(habit.id) ?? 0;
                      return streak > 0 ? (
                        <span className="shrink-0 text-xs font-semibold text-orange-500 dark:text-orange-400" title={`Streak: ${streak} day${streak > 1 ? "s" : ""}`}>
                          🔥 {streak}
                        </span>
                      ) : null;
                    })()}
                  </div>
                </th>

                {days.map((day, col) => {
                  const iso = toIsoDate(day);
                  const key = `${habit.id}:${iso}`;

                  const checked =
                    completionMap.get(key) ?? false;

                  const disabled = isFutureIso(iso);

                  const isSelected =
                    selected.row === row &&
                    selected.col === col;

                  const isToday = iso === today;
                  const isSkipped = Boolean(settings.dailySkipped?.[key]);

                  // Life OS v2: Timed / Counted habit tier support
                  const habitCfg = settings.lifeOsConfig?.habitConfigs?.[habit.id];
                  const isTimedOrCounted =
                    habitCfg &&
                    (habitCfg.habitType === "timed" || habitCfg.habitType === "counted");
                  const timedVal = settings.lifeOsConfig?.habitDailyValues?.[key] ?? 0;
                  const tier = isTimedOrCounted ? computeTier(timedVal, habitCfg) : null;

                  return (
                    <td
                      key={key}
                      className={`${thWidth} border border-zinc-500 bg-white dark:bg-zinc-950 p-0 text-center dark:border-zinc-700 dark:bg-zinc-950 ${
                        isToday
                          ? "bg-[#fff2cc] dark:bg-amber-950/50"
                          : ""
                      } ${
                        isSelected
                          ? "outline outline-2 outline-[var(--accent)] outline-offset-[-2px]"
                          : ""
                      }`}
                      onClick={() => {
                        setSelected({
                          row,
                          col,
                        });

                        if (!disabled) {
                          focusCell(row, col);
                        }
                      }}
                    >
                      <button
                        ref={(element) => {
                          const refKey = `${row}:${col}`;

                          if (element) {
                            cellRefs.current.set(
                              refKey,
                              element,
                            );
                          } else {
                            cellRefs.current.delete(
                              refKey,
                            );
                          }
                        }}
                        type="button"
                        aria-label={`${habit.name} ${iso}`}
                        aria-pressed={checked}
                        disabled={
                          disabled ||
                          pending.has(key)
                        }
                        tabIndex={
                          isSelected ? 0 : -1
                        }
                        onFocus={() => {
                          setSelected({
                            row,
                            col,
                          });
                        }}
                        onKeyDown={(event) =>
                          handleCellKeyDown(
                            event,
                            habit,
                            iso,
                            row,
                            col,
                            checked,
                          )
                        }
                        onContextMenu={(e) => {
                          e.preventDefault();
                          if (onToggleSkipped && !disabled) {
                            onToggleSkipped(key);
                          }
                        }}
                        title={
                          isSkipped
                            ? "Skipped (Right-click to unskip)"
                            : isTimedOrCounted
                            ? `${habit.name}: ${timedVal} ${habitCfg.unit || "min"} (${tier}) - Click to log`
                            : "Right-click to mark skipped"
                        }
                        onClick={() => {
                          setSelected({
                            row,
                            col,
                          });

                          if (isTimedOrCounted && habitCfg) {
                            if (!disabled) {
                              setPopoverState({
                                habit,
                                date: iso,
                                config: habitCfg,
                                initialValue: timedVal,
                              });
                            }
                          } else {
                            setCell(
                              habit,
                              iso,
                              checked,
                              row,
                              col,
                            );
                          }
                        }}
                        className={`${checkboxSize} inline-flex items-center justify-center rounded-sm border text-sm transition-all duration-150 ${
                          !disabled && !pending.has(key) ? "hover:scale-110 active:scale-95" : ""
                        } ${
                          isSkipped
                            ? "border-zinc-400 bg-zinc-200 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
                            : isTimedOrCounted
                            ? tier === "stretch"
                              ? "bg-purple-600 border-purple-500 text-white font-bold"
                              : tier === "target"
                              ? "bg-emerald-600 border-emerald-500 text-white font-bold"
                              : tier === "minimum"
                              ? "bg-amber-500 border-amber-400 text-zinc-950 font-bold"
                              : timedVal > 0
                              ? "bg-red-500/20 border-red-500/50 text-red-400 font-bold"
                              : "border-zinc-300 bg-white text-transparent hover:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
                            : checked
                            ? "text-white"
                            : "border-zinc-300 bg-white text-transparent hover:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
                        } ${
                          disabled
                            ? "cursor-not-allowed opacity-30"
                            : pending.has(key) ? "opacity-40 cursor-wait" : ""
                        }`}
                        style={
                          !isTimedOrCounted && checked
                            ? { backgroundColor: habit.color ?? 'var(--accent)', borderColor: habit.color ?? 'var(--accent)' }
                            : {}
                        }
                      >
                        {isSkipped ? (
                          <span className="text-[10px] font-bold leading-none">—</span>
                        ) : isTimedOrCounted ? (
                          timedVal > 0 ? (
                            <span className="text-[9px] font-extrabold leading-none tracking-tighter truncate max-w-full px-0.5">
                              {timedVal}
                            </span>
                          ) : (
                            <span className="text-transparent text-[10px]">—</span>
                          )
                        ) : (
                          <Check
                            size={checkIconSize}
                            strokeWidth={3}
                            className="transition-transform active:scale-75"
                          />
                        )}
                      </button>
                    </td>
                  );
                })}

                <td className="border border-zinc-500 bg-white dark:bg-zinc-950 px-3 text-center font-semibold dark:border-zinc-700 dark:bg-zinc-950">
                  {performance.get(habit.id)?.completed ??
                    0}
                </td>

                <td className="border border-zinc-500 bg-white dark:bg-zinc-950 px-2 dark:border-zinc-700 dark:bg-zinc-950">
                  <div className="h-3 w-32 overflow-hidden rounded-sm border border-green-700 bg-white">
                    <div
                      className="h-full bg-green-600"
                      style={{
                        width: `${Math.min(
                          100,
                          ((performance.get(
                            habit.id,
                          )?.completed ?? 0) /
                            Math.max(
                              days.length,
                              1,
                            )) *
                            100,
                        )}%`,
                      }}
                    />
                  </div>
                </td>

                <td className="border border-zinc-500 bg-white dark:bg-zinc-950 px-2 text-center font-semibold dark:border-zinc-700 dark:bg-zinc-950">
                  {performance.get(habit.id)
                    ?.percent === null ||
                  performance.get(habit.id)
                    ?.percent === undefined
                    ? "-"
                    : `${performance.get(habit.id)?.percent}%`}
                </td>
              </tr>
            ))}

            <SummaryRow
              label="DAILY COUNT"
              days={days}
              dailyScores={dailyScores}
              rowPadding={rowPadding}
              value={(day) =>
                !day.hasData
                  ? ""
                  : day.completed.toString()
              }
            />

            <SummaryRow
              label="%COMPLETED"
              days={days}
              dailyScores={dailyScores}
              rowPadding={rowPadding}
              value={(day) =>
                day.percent === null
                  ? ""
                  : `${day.percent}%`
              }
            />

            <SummaryRow
              label="DAILY STATUS"
              days={days}
              dailyScores={dailyScores}
              rowPadding={rowPadding}
              value={(day) =>
                day.status === "FUTURE" ||
                day.status === "NO DATA"
                  ? ""
                  : day.status
              }
            />

            <SummaryRow
              label="DAILY SCORE"
              days={days}
              dailyScores={dailyScores}
              rowPadding={rowPadding}
              value={(day) =>
                day.score === null
                  ? ""
                  : `${day.score}%`
              }
            />

            <SummaryRow
              label="BASELINE"
              days={days}
              dailyScores={dailyScores}
              rowPadding={rowPadding}
              value={(day) =>
                day.status === "FUTURE"
                  ? ""
                  : "60%"
              }
            />
          </tbody>
        </table>

        {!habits.length ? (
          <div className="p-6 text-sm text-zinc-500">
            Add a habit in Settings to start tracking.
          </div>
        ) : null}
      </div>

      {activeNoteDate && (
        <DailyNoteModal
          dateIso={activeNoteDate}
          initialNote={settings.dailyNotes?.[activeNoteDate] ?? ""}
          onSave={(note) => {
            if (onSaveNote) {
              onSaveNote(activeNoteDate, note);
            }
          }}
          onClose={() => setActiveNoteDate(null)}
        />
      )}

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

interface SummaryRowProps {
  label: string;
  days: Date[];
  dailyScores: DailyScore[];
  rowPadding: string;
  value: (day: DailyScore) => string;
}

function SummaryRow({
  label,
  days,
  dailyScores,
  rowPadding,
  value,
}: SummaryRowProps) {
  return (
    <tr>
      <th className={`sticky left-0 z-10 min-w-56 border border-zinc-500 bg-zinc-100 dark:bg-zinc-900 text-left ${rowPadding} font-bold dark:border-zinc-700`}>
        {label}
      </th>

      {days.map((date) => {
        const iso = toIsoDate(date);

        const day = dailyScores.find(
          (item) => item.date === iso,
        );

        const text = day ? value(day) : "";

        return (
          <td
            key={`${label}-${iso}`}
            className={`border border-zinc-500 px-2 py-2 text-center text-xs font-semibold dark:border-zinc-700 ${
              label === "DAILY STATUS" &&
              text === "FAILED"
                ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-200"
                : label === "DAILY STATUS" &&
                    text === "GOOD"
                  ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-200"
                  : "bg-white dark:bg-zinc-950 dark:bg-zinc-950"
            }`}
          >
            {text}
          </td>
        );
      })}

      <td className="border border-zinc-500 bg-zinc-100 dark:bg-zinc-900 dark:border-zinc-700 dark:bg-zinc-900" />

      <td className="border border-zinc-500 bg-zinc-100 dark:bg-zinc-900 dark:border-zinc-700 dark:bg-zinc-900" />

      <td className="border border-zinc-500 bg-zinc-100 dark:bg-zinc-900 dark:border-zinc-700 dark:bg-zinc-900" />
    </tr>
  );
}