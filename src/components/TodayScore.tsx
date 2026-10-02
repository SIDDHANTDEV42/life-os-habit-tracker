import React from "react";
import { ShieldCheck } from "lucide-react";
import type { LifeOsTodayScore } from "../calculations/dailyScore";
import { SCORE_STRONG, SCORE_ACCEPTABLE, SCORE_RECOVERY } from "../calculations/tierScore";

interface TodayScoreProps {
  score: LifeOsTodayScore;
  className?: string;
}

export function TodayScore({ score, className = "" }: TodayScoreProps) {
  const {
    coreCompleted,
    coreTotal,
    corePercent,
    coreLabel,
    guardrailsCompleted,
    guardrailsTotal,
  } = score;

  // Circular gauge calculations (SVG circumference for r=52 is 2 * PI * 52 ~= 326.73)
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const percent = corePercent ?? 0;
  const strokeDashoffset = circumference - (circumference * percent) / 100;

  // Determine gauge color based on score thresholds
  let scoreColor = "#71717a"; // zinc-500 default/reset
  let statusBadgeClass = "bg-zinc-800/60 text-zinc-400 border-zinc-700";

  if (coreTotal === 0) {
    scoreColor = "#71717a";
    statusBadgeClass = "bg-zinc-800/60 text-zinc-400 border-zinc-700";
  } else if (percent >= SCORE_STRONG) {
    scoreColor = "#10b981"; // emerald-500
    statusBadgeClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  } else if (percent >= SCORE_ACCEPTABLE) {
    scoreColor = "#eab308"; // yellow-500
    statusBadgeClass = "bg-yellow-500/10 text-yellow-400 border-yellow-500/30";
  } else if (percent >= SCORE_RECOVERY) {
    scoreColor = "#3b82f6"; // blue-500
    statusBadgeClass = "bg-blue-500/10 text-blue-400 border-blue-500/30";
  } else {
    scoreColor = "#ef4444"; // red-500
    statusBadgeClass = "bg-red-500/10 text-red-400 border-red-500/30";
  }

  const guardrailsPercent =
    guardrailsTotal > 0
      ? Math.round((guardrailsCompleted / guardrailsTotal) * 100)
      : null;

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70 dark:backdrop-blur-md ${className}`}
    >
      {/* Left: Score Gauge */}
      <div className="flex items-center gap-6">
        <div className="relative flex h-32 w-32 shrink-0 items-center justify-center">
          <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 128 128">
            {/* Background circle */}
            <circle
              cx="64"
              cy="64"
              r={radius}
              stroke="currentColor"
              strokeWidth="10"
              fill="transparent"
              className="text-zinc-100 dark:text-zinc-800"
            />
            {/* Progress circle */}
            {coreTotal > 0 && (
              <circle
                cx="64"
                cy="64"
                r={radius}
                stroke={scoreColor}
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-700 ease-out"
              />
            )}
          </svg>

          {/* Center text */}
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
              {coreTotal > 0 ? `${coreCompleted}/${coreTotal}` : "—"}
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              {corePercent !== null ? `${corePercent}%` : "No habits"}
            </span>
          </div>
        </div>

        {/* Labels and Description */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
              Today Score
            </span>
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClass}`}
            >
              {coreLabel}
            </span>
          </div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            Performance Core Execution
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {coreTotal === 0
              ? "No Performance Core habits configured yet."
              : corePercent === 100
              ? "All critical performance habits secured today."
              : corePercent && corePercent >= SCORE_ACCEPTABLE
              ? "Solid progress on what moves the needle."
              : "Focus on securing your Big 3 & core tasks."}
          </p>
        </div>
      </div>

      {/* Right: Guardrails Indicator */}
      {guardrailsTotal > 0 && (
        <div className="flex w-full sm:w-auto items-center justify-between sm:justify-start gap-4 rounded-xl border border-zinc-200/80 bg-zinc-50 px-5 py-4 dark:border-zinc-800/80 dark:bg-zinc-950/60">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Guardrails
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-bold text-zinc-900 dark:text-white">
                  {guardrailsCompleted}/{guardrailsTotal}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  protecting
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <span
              className={`text-xs font-bold ${
                guardrailsCompleted === guardrailsTotal
                  ? "text-emerald-500"
                  : guardrailsCompleted > 0
                  ? "text-amber-500"
                  : "text-red-500"
              }`}
            >
              {guardrailsPercent !== null ? `${guardrailsPercent}%` : "—"}
            </span>
            <div className="mt-1 h-1.5 w-16 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
              <div
                className={`h-full transition-all duration-500 ${
                  guardrailsCompleted === guardrailsTotal
                    ? "bg-emerald-500"
                    : "bg-amber-500"
                }`}
                style={{ width: `${guardrailsPercent ?? 0}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
