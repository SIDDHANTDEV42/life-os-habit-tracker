import { useEffect, useState } from "react";
import { Target, Flame } from "lucide-react";

interface CountdownWidgetProps {
  targetDate: string; // YYYY-MM-DD
  title?: string;
  className?: string;
}

export function CountdownWidget({ targetDate, title = "GATE 2027", className = "" }: CountdownWidgetProps) {
  const [timeLeft, setTimeLeft] = useState(() => calculateTimeLeft(targetDate));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(targetDate));
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  function calculateTimeLeft(dateStr: string) {
    const target = new Date(`${dateStr}T00:00:00`).getTime();
    const now = new Date().getTime();
    const diff = target - now;

    if (isNaN(diff) || diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isPassed: true };
    }

    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((diff / 1000 / 60) % 60),
      seconds: Math.floor((diff / 1000) % 60),
      isPassed: false,
    };
  }

  const formattedTargetDate = new Date(`${targetDate}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const urgencyStyle =
    timeLeft.days <= 30
      ? "bg-gradient-to-r from-red-900/90 via-orange-900/90 to-amber-900/90 border-red-500/50 text-white"
      : timeLeft.days <= 90
      ? "bg-gradient-to-r from-amber-900/90 via-yellow-900/90 to-amber-800/90 border-amber-500/50 text-white"
      : "bg-gradient-to-r from-blue-900/90 via-indigo-900/90 to-purple-900/90 border-indigo-500/50 text-white";

  return (
    <div
      className={`shrink-0 relative overflow-hidden rounded-xl border p-4 shadow-md backdrop-blur-md ${urgencyStyle} ${className}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Title & Target Info */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/20 dark:bg-white/10 shadow-inner">
            <Flame className="h-5 w-5 text-orange-500 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold tracking-tight text-white">
                {title || "Target Goal"}
              </h3>
              <span className="rounded bg-white/20 px-2 py-0.5 text-[11px] font-semibold text-white">
                {formattedTargetDate}
              </span>
            </div>
            <p className="text-xs text-white/80 flex items-center gap-1 mt-0.5">
              <Target size={12} /> Target Countdown
            </p>
          </div>
        </div>

        {/* Digital Countdown Timer */}
        {timeLeft.isPassed ? (
          <div className="rounded-lg bg-emerald-500/30 border border-emerald-400/50 px-4 py-2 text-sm font-bold text-white">
            🎯 Target Date Arrived!
          </div>
        ) : (
          <div className="flex items-center gap-2 select-none">
            <TimeBlock value={timeLeft.days} label="DAYS" />
            <span className="text-lg font-extrabold text-white/60">:</span>
            <TimeBlock value={timeLeft.hours} label="HRS" />
            <span className="text-lg font-extrabold text-white/60">:</span>
            <TimeBlock value={timeLeft.minutes} label="MINS" />
            <span className="text-lg font-extrabold text-white/60">:</span>
            <TimeBlock value={timeLeft.seconds} label="SECS" />
          </div>
        )}
      </div>
    </div>
  );
}

function TimeBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex h-10 min-w-11 items-center justify-center rounded-lg border border-white/30 bg-black/30 backdrop-blur-sm px-2 text-lg font-extrabold tracking-tight text-white shadow-inner">
        {String(value).padStart(2, "0")}
      </div>
      <span className="mt-1 text-[9px] font-bold tracking-wider text-white/80">
        {label}
      </span>
    </div>
  );
}
