import { ChevronLeft, ChevronRight, Printer } from "lucide-react";
import { monthLabel, getMonthDays } from "../lib/date";

interface MonthSwitcherProps {
  date: Date;
  isCurrentMonth: boolean;
  previousMonth: () => void;
  nextMonth: () => void;
  goToToday?: () => void;
}

export function MonthSwitcher({ date, isCurrentMonth, previousMonth, nextMonth, goToToday }: MonthSwitcherProps) {
  const daysInMonth = getMonthDays(date).length;
  const elapsed = isCurrentMonth ? new Date().getDate() : daysInMonth;
  const percent = Math.round((elapsed / daysInMonth) * 100);

  return (
    <div className="flex flex-col items-center justify-center relative">
      <div className="flex items-center justify-center gap-3">
        <button className="icon-button" type="button" onClick={previousMonth} aria-label="Previous month">
          <ChevronLeft size={18} />
        </button>
        <div className="flex min-w-48 flex-col items-center">
          <h2 className="text-center text-xl font-semibold uppercase tracking-normal">{monthLabel(date)}</h2>
          {!isCurrentMonth && goToToday && (
            <button
              type="button"
              onClick={goToToday}
              className="mt-0.5 text-xs font-medium text-[var(--accent)] hover:underline"
            >
              ← Go to today
            </button>
          )}
        </div>
        <button className="icon-button" type="button" onClick={nextMonth} disabled={isCurrentMonth} aria-label="Next month" style={{ opacity: isCurrentMonth ? 0.5 : 1, cursor: isCurrentMonth ? 'not-allowed' : 'pointer' }}>
          <ChevronRight size={18} />
        </button>
        <button
          className="icon-button no-print ml-2"
          type="button"
          onClick={() => window.print()}
          aria-label="Export or Print habit tracker sheet"
          title="Print / Export Sheet"
        >
          <Printer size={16} />
        </button>
      </div>
      <div className="text-xs text-zinc-500 font-medium mt-0.5">
        {elapsed}/{daysInMonth} days ({percent}%)
      </div>
    </div>
  );
}
