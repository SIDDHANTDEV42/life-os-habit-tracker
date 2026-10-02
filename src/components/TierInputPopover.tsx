import React, { useState, useEffect } from "react";
import { Check, X, Flame } from "lucide-react";
import type { HabitConfig, HabitTier } from "../types";
import { computeTier } from "../calculations/tierScore";

interface TierInputPopoverProps {
  isOpen: boolean;
  habitName: string;
  config: HabitConfig;
  initialValue?: number;
  onSave: (val: number) => void;
  onClose: () => void;
}

export function TierInputPopover({
  isOpen,
  habitName,
  config,
  initialValue = 0,
  onSave,
  onClose,
}: TierInputPopoverProps) {
  const [val, setVal] = useState<string>(initialValue > 0 ? String(initialValue) : "");

  useEffect(() => {
    if (isOpen) {
      setVal(initialValue > 0 ? String(initialValue) : "");
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  const numVal = parseFloat(val) || 0;
  const tier: HabitTier = computeTier(numVal, config);

  const tierColors: Record<HabitTier, { label: string; badge: string }> = {
    stretch: {
      label: "Stretch Tier Achieved! 🔥",
      badge: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    },
    target: {
      label: "Target Achieved! 🎯",
      badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    },
    minimum: {
      label: "Minimum Met 👍",
      badge: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    },
    missed: {
      label: "Below Minimum",
      badge: "bg-zinc-800 text-zinc-400 border-zinc-700",
    },
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onSave(numVal);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
              Log Progress
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-[220px]">
              {habitName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-1.5">
              Enter {config.unit || (config.habitType === "timed" ? "minutes" : "count")}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                step="any"
                autoFocus
                value={val}
                onChange={(e) => setVal(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="0"
                className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-4 py-2.5 text-lg font-semibold text-zinc-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 transition"
              />
              <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400 shrink-0">
                {config.unit || (config.habitType === "timed" ? "min" : "units")}
              </span>
            </div>
          </div>

          {/* Tier Feedback */}
          <div className="rounded-xl border border-zinc-200/70 bg-zinc-50/70 p-3 dark:border-zinc-800/70 dark:bg-zinc-950/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Status:</span>
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${tierColors[tier].badge}`}>
                {tierColors[tier].label}
              </span>
            </div>

            {/* Threshold reference */}
            <div className="grid grid-cols-3 gap-1 pt-2 border-t border-zinc-200/50 dark:border-zinc-800/50 text-[11px] text-zinc-500 dark:text-zinc-400">
              <div>
                <span className="block text-zinc-400">Min</span>
                <span className="font-semibold text-amber-500">
                  {config.tierMinimum ?? "—"} {config.unit}
                </span>
              </div>
              <div>
                <span className="block text-zinc-400">Target</span>
                <span className="font-semibold text-emerald-500">
                  {config.tierTarget ?? "—"} {config.unit}
                </span>
              </div>
              <div>
                <span className="block text-zinc-400">Stretch</span>
                <span className="font-semibold text-purple-500">
                  {config.tierStretch ?? "—"} {config.unit}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 transition"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(numVal)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-500 transition"
            >
              <Check size={16} />
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
