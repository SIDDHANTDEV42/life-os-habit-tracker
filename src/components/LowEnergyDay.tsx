import React, { useState } from "react";
import { AlertTriangle, ShieldAlert, Check, X, RotateCcw } from "lucide-react";

interface LowEnergyDayProps {
  isActiveToday: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
}

export function LowEnergyDay({
  isActiveToday,
  onActivate,
  onDeactivate,
}: LowEnergyDayProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-4 dark:border-zinc-800/80 dark:bg-zinc-950/40">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
              isActiveToday
                ? "bg-amber-500/20 text-amber-500"
                : "bg-zinc-200/60 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
            }`}
          >
            <AlertTriangle size={20} />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
              Low Energy / Recovery Protocol
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {isActiveToday
                ? "Low Energy Protocol is ACTIVE for today. Targets are scaled to bare minimums."
                : "Sick, exhausted, or in crisis? Activate to scale targets down to minimum preservation."}
            </p>
          </div>
        </div>

        <div>
          {isActiveToday ? (
            <button
              onClick={onDeactivate}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-500 hover:bg-amber-500/20 transition"
            >
              <RotateCcw size={14} />
              Exit Low Energy Mode
            </button>
          ) : (
            <button
              onClick={() => setShowConfirm(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 hover:border-amber-400 hover:text-amber-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-amber-500/50 dark:hover:text-amber-400 transition"
            >
              <ShieldAlert size={14} />
              Activate Low Energy Day
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3 text-amber-500 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                <AlertTriangle size={22} />
              </div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Activate Low Energy Day?
              </h3>
            </div>

            <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
              This is reserved for genuine illness, severe fatigue, or urgent life disruption. Today’s timed and counted targets will scale to bare minimum thresholds so you can protect momentum without burnout.
            </p>

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                onClick={() => setShowConfirm(false)}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onActivate();
                  setShowConfirm(false);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-amber-400 transition"
              >
                <Check size={14} />
                Confirm Activation
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
