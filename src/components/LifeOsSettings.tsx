import React, { useState } from "react";
import {
  Target,
  Clock,
  Hash,
  CheckCircle2,
  Moon,
  Sun,
  Coffee,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  ShieldCheck,
  Calendar,
} from "lucide-react";
import type {
  Habit,
  Settings,
  LifeOsConfig,
  HabitConfig,
  HabitCategory,
  HabitType,
  SleepWakeTarget,
  DeadTimeItem,
} from "../types";
import { DEFAULT_LIFE_OS_CONFIG } from "../types";

interface LifeOsSettingsProps {
  habits: Habit[];
  settings: Settings;
  onUpdateConfig: (newConfig: LifeOsConfig) => Promise<void>;
}

export function LifeOsSettings({
  habits,
  settings,
  onUpdateConfig,
}: LifeOsSettingsProps) {
  const config = settings.lifeOsConfig ?? DEFAULT_LIFE_OS_CONFIG;
  const activeHabits = habits.filter((h) => !h.archived);

  // Local helper to save updated config
  const saveConfig = async (patch: Partial<LifeOsConfig>) => {
    const updated: LifeOsConfig = {
      ...config,
      ...patch,
    };
    await onUpdateConfig(updated);
  };

  // State for new Date Override form
  const [newOverrideDate, setNewOverrideDate] = useState("");
  const [newOverrideWake, setNewOverrideWake] = useState("");
  const [newOverrideSleep, setNewOverrideSleep] = useState("");

  // State for new Dead Time item form
  const [newDeadTimeLabel, setNewDeadTimeLabel] = useState("");
  const [newDeadTimeContext, setNewDeadTimeContext] = useState<"train" | "break" | "general">("train");

  // ── Habit Config Helpers ─────────────────────────────────────

  const updateHabitConfig = (habitId: number, patch: Partial<HabitConfig>) => {
    const current = config.habitConfigs[habitId] ?? {
      habitId,
      habitType: "binary",
      category: "core",
    };

    const nextHabitConfig: HabitConfig = {
      ...current,
      ...patch,
    };

    // Auto-sanitize thresholds: enforce min <= target <= stretch
    if (nextHabitConfig.tierMinimum != null && nextHabitConfig.tierTarget != null) {
      if (nextHabitConfig.tierMinimum > nextHabitConfig.tierTarget) {
        nextHabitConfig.tierTarget = nextHabitConfig.tierMinimum;
      }
    }
    if (nextHabitConfig.tierTarget != null && nextHabitConfig.tierStretch != null) {
      if (nextHabitConfig.tierTarget > nextHabitConfig.tierStretch) {
        nextHabitConfig.tierStretch = nextHabitConfig.tierTarget;
      }
    }

    const nextConfigs = {
      ...config.habitConfigs,
      [habitId]: nextHabitConfig,
    };

    saveConfig({ habitConfigs: nextConfigs });
  };

  // ── Big 3 Helpers ────────────────────────────────────────────

  const toggleBig3 = (habitId: number) => {
    const currentList = config.big3HabitIds ?? [];
    if (currentList.includes(habitId)) {
      saveConfig({ big3HabitIds: currentList.filter((id) => id !== habitId) });
    } else {
      if (currentList.length >= 3) {
        alert("You can only select up to 3 Big 3 habits.");
        return;
      }
      saveConfig({ big3HabitIds: [...currentList, habitId] });
    }
  };

  // ── Sleep/Wake Overrides Helpers ─────────────────────────────

  const handleAddOverride = () => {
    if (!newOverrideDate || !newOverrideWake) {
      alert("Please specify at least a Date and Wake target.");
      return;
    }
    const filtered = config.sleepWakeTargets.filter((t) => t.date !== newOverrideDate);
    const newTarget: SleepWakeTarget = {
      date: newOverrideDate,
      wakeTarget: newOverrideWake,
      sleepTarget: newOverrideSleep || undefined,
    };
    saveConfig({ sleepWakeTargets: [...filtered, newTarget] });
    setNewOverrideDate("");
    setNewOverrideWake("");
    setNewOverrideSleep("");
  };

  const handleRemoveOverride = (date: string) => {
    saveConfig({
      sleepWakeTargets: config.sleepWakeTargets.filter((t) => t.date !== date),
    });
  };

  // ── Dead Time Queue Helpers ──────────────────────────────────

  const handleAddDeadTimeItem = () => {
    const trimmed = newDeadTimeLabel.trim();
    if (!trimmed) return;
    const newItem: DeadTimeItem = {
      id: Date.now().toString(),
      label: trimmed,
      context: newDeadTimeContext,
    };
    saveConfig({ deadTimeQueue: [...config.deadTimeQueue, newItem] });
    setNewDeadTimeLabel("");
  };

  const handleRemoveDeadTimeItem = (id: string) => {
    saveConfig({
      deadTimeQueue: config.deadTimeQueue.filter((item) => item.id !== id),
    });
  };

  const handleMoveDeadTimeItem = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= config.deadTimeQueue.length) return;
    const items = [...config.deadTimeQueue];
    [items[index], items[target]] = [items[target], items[index]];
    saveConfig({ deadTimeQueue: items });
  };

  return (
    <div className="space-y-6">
      {/* ── SUBSECTION 1: THE BIG 3 SELECTOR ─────────────────── */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 text-sm">
              🎯
            </span>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                Big 3 Focus Habits (Max 3)
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Select 1 to 3 anchor habits that must be defended each day.
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
            {config.big3HabitIds.length} / 3 selected
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-4">
          {activeHabits.map((habit) => {
            const isSelected = config.big3HabitIds.includes(habit.id);
            return (
              <button
                key={habit.id}
                type="button"
                onClick={() => toggleBig3(habit.id)}
                className={`flex items-center justify-between rounded-xl border p-3 text-left transition ${
                  isSelected
                    ? "border-amber-500/50 bg-amber-500/10 dark:border-amber-500/40 dark:bg-amber-950/20"
                    : "border-zinc-200 bg-zinc-50/50 hover:bg-zinc-100/60 dark:border-zinc-800 dark:bg-zinc-950/40 dark:hover:bg-zinc-800/40"
                }`}
              >
                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate pr-2">
                  {habit.name}
                </span>
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[11px] font-bold ${
                    isSelected
                      ? "bg-amber-500 text-zinc-950"
                      : "border border-zinc-300 text-transparent dark:border-zinc-700"
                  }`}
                >
                  ✓
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── SUBSECTION 2: HABIT TIERS & CATEGORIES ───────────── */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="mb-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
            Habit Classification & Tier Thresholds
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Designate each habit as Performance Core, Guardrail, or Optional, and configure minimum/target thresholds for timed activities.
          </p>
        </div>

        <div className="space-y-4">
          {activeHabits.map((habit) => {
            const hCfg = config.habitConfigs[habit.id] ?? {
              habitId: habit.id,
              habitType: "binary",
              category: "core",
            };

            const isTimedOrCounted = hCfg.habitType === "timed" || hCfg.habitType === "counted";

            return (
              <div
                key={habit.id}
                className="rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-4 dark:border-zinc-800/80 dark:bg-zinc-950/40 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-200/60 dark:border-zinc-800/60">
                  <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                    {habit.name}
                  </span>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Category Selector */}
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] font-medium text-zinc-400">Category:</span>
                      <select
                        value={hCfg.category ?? "core"}
                        onChange={(e) =>
                          updateHabitConfig(habit.id, {
                            category: e.target.value as HabitCategory,
                          })
                        }
                        className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs font-semibold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 outline-none"
                      >
                        <option value="core">🔥 Performance Core</option>
                        <option value="guardrail">🛡️ Guardrail</option>
                        <option value="optional">📋 Optional</option>
                      </select>
                    </div>

                    {/* Type Selector */}
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] font-medium text-zinc-400">Type:</span>
                      <select
                        value={hCfg.habitType ?? "binary"}
                        onChange={(e) =>
                          updateHabitConfig(habit.id, {
                            habitType: e.target.value as HabitType,
                          })
                        }
                        className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs font-semibold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 outline-none"
                      >
                        <option value="binary">Binary (Done / Not)</option>
                        <option value="timed">Timed (Minutes)</option>
                        <option value="counted">Counted (Quantity)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Timed / Counted Tier inputs */}
                {isTimedOrCounted && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-amber-500 block mb-1">
                        Minimum (1 pt)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={hCfg.tierMinimum ?? ""}
                        placeholder="e.g. 45"
                        onChange={(e) =>
                          updateHabitConfig(habit.id, {
                            tierMinimum: e.target.value ? Number(e.target.value) : undefined,
                          })
                        }
                        className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 block mb-1">
                        Target
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={hCfg.tierTarget ?? ""}
                        placeholder="e.g. 90"
                        onChange={(e) =>
                          updateHabitConfig(habit.id, {
                            tierTarget: e.target.value ? Number(e.target.value) : undefined,
                          })
                        }
                        className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-purple-500 block mb-1">
                        Stretch
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={hCfg.tierStretch ?? ""}
                        placeholder="e.g. 120"
                        onChange={(e) =>
                          updateHabitConfig(habit.id, {
                            tierStretch: e.target.value ? Number(e.target.value) : undefined,
                          })
                        }
                        className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                        Unit Label
                      </label>
                      <input
                        type="text"
                        value={hCfg.unit ?? ""}
                        placeholder={hCfg.habitType === "timed" ? "min" : "units"}
                        onChange={(e) =>
                          updateHabitConfig(habit.id, {
                            unit: e.target.value || undefined,
                          })
                        }
                        className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Temporary Habit Settings */}
                <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(hCfg.isTemporary)}
                      onChange={(e) =>
                        updateHabitConfig(habit.id, {
                          isTemporary: e.target.checked,
                        })
                      }
                      className="rounded accent-indigo-600"
                    />
                    <span className="text-zinc-600 dark:text-zinc-300 font-medium">
                      Temporary Reset / Focus Habit
                    </span>
                  </label>

                  {hCfg.isTemporary && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-400">Expires on:</span>
                      <input
                        type="date"
                        value={hCfg.temporaryEnd ?? ""}
                        onChange={(e) =>
                          updateHabitConfig(habit.id, {
                            temporaryEnd: e.target.value || undefined,
                          })
                        }
                        className="rounded-lg border border-zinc-300 bg-white px-2 py-0.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── SUBSECTION 3: CIRCADIAN / SLEEP-WAKE SCHEDULE ─────── */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="flex items-center gap-2 mb-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500 text-sm">
            🌙
          </span>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
              Circadian / Sleep-Wake Schedule
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Configure default targets and temporary date-specific schedules (e.g. 15–20 Sep reset).
            </p>
          </div>
        </div>

        {/* Default Targets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
              Default Wake Target (24h)
            </label>
            <input
              type="time"
              value={config.sleepWakeDefaultWake ?? ""}
              onChange={(e) =>
                saveConfig({ sleepWakeDefaultWake: e.target.value || undefined })
              }
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
              Default Sleep Target (24h)
            </label>
            <input
              type="time"
              value={config.sleepWakeDefaultSleep ?? ""}
              onChange={(e) =>
                saveConfig({ sleepWakeDefaultSleep: e.target.value || undefined })
              }
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 outline-none"
            />
          </div>
        </div>

        {/* Date Overrides Table */}
        <div className="mt-4 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Date-Specific Schedule Overrides ({config.sleepWakeTargets.length})
          </h4>

          {config.sleepWakeTargets.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-zinc-200 dark:border-zinc-800 rounded-lg">
                <thead className="bg-zinc-100 dark:bg-zinc-800/60 font-semibold text-zinc-700 dark:text-zinc-300">
                  <tr>
                    <th className="p-2">Date</th>
                    <th className="p-2">Wake Target</th>
                    <th className="p-2">Sleep Target</th>
                    <th className="p-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {config.sleepWakeTargets.map((t) => (
                    <tr key={t.date} className="hover:bg-zinc-50 dark:hover:bg-zinc-900">
                      <td className="p-2 font-mono">{t.date}</td>
                      <td className="p-2 font-semibold text-amber-500">{t.wakeTarget}</td>
                      <td className="p-2 font-semibold text-indigo-400">{t.sleepTarget || "—"}</td>
                      <td className="p-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveOverride(t.date)}
                          className="text-red-500 hover:text-red-700 p-1"
                          title="Remove override"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Add Override Form */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <input
              type="date"
              value={newOverrideDate}
              onChange={(e) => setNewOverrideDate(e.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 outline-none"
            />
            <input
              type="time"
              placeholder="Wake"
              value={newOverrideWake}
              onChange={(e) => setNewOverrideWake(e.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 outline-none"
            />
            <input
              type="time"
              placeholder="Sleep"
              value={newOverrideSleep}
              onChange={(e) => setNewOverrideSleep(e.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 outline-none"
            />
            <button
              type="button"
              onClick={handleAddOverride}
              className="inline-flex items-center gap-1 rounded-lg bg-zinc-900 px-3 py-1 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90"
            >
              <Plus size={14} /> Add Override
            </button>
          </div>
        </div>
      </div>

      {/* ── SUBSECTION 4: DEAD TIME QUEUE ─────────────────────── */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="flex items-center gap-2 mb-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500 text-sm">
            ☕
          </span>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
              Dead Time / Transit Queue
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Curate high-leverage activities for gaps, commuting, or recovery.
            </p>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          {config.deadTimeQueue.map((item, idx) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950/40"
            >
              <div className="flex items-center gap-2.5">
                <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  {item.context}
                </span>
                <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                  {item.label}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleMoveDeadTimeItem(idx, -1)}
                  disabled={idx === 0}
                  className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-30"
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveDeadTimeItem(idx, 1)}
                  disabled={idx === config.deadTimeQueue.length - 1}
                  className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-30"
                >
                  <ArrowDown size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveDeadTimeItem(item.id)}
                  className="p-1 text-red-500 hover:text-red-700"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add Item Form */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <input
            type="text"
            placeholder="Activity (e.g. Quick Power Nap)"
            value={newDeadTimeLabel}
            onChange={(e) => setNewDeadTimeLabel(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 outline-none flex-1 min-w-[180px]"
          />
          <select
            value={newDeadTimeContext}
            onChange={(e) =>
              setNewDeadTimeContext(e.target.value as "train" | "break" | "general")
            }
            className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-xs font-medium text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 outline-none"
          >
            <option value="train">Train / Commute</option>
            <option value="break">Short Break</option>
            <option value="general">General Free Time</option>
          </select>
          <button
            type="button"
            onClick={handleAddDeadTimeItem}
            className="inline-flex items-center gap-1 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90"
          >
            <Plus size={14} /> Add Item
          </button>
        </div>
      </div>
    </div>
  );
}
