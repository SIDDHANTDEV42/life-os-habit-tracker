import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Download, RotateCcw, Trash2, Upload, Sparkles } from "lucide-react";
import { addHabit, archiveHabit, deleteHabit, exportBackup, importBackup, renameHabit, reorderHabits, resetData } from "../database/api";
import { messageFromError } from "../lib/error";
import { addMonths, monthKey, monthLabel } from "../lib/date";
import type { Habit, Settings } from "../types";
import { useToast, ToastPortal } from "../components/Toast";

interface SettingsPageProps {
  habits: Habit[];
  settings: Settings;
  visibleMonth?: Date;
  onMonthChange?: (date: Date) => void;
  onRefresh: (month?: Date) => Promise<void>;
  onSettingsChange: (settings: Settings) => Promise<void>;
}

export function SettingsPage({
  habits,
  settings,
  visibleMonth: propMonth,
  onMonthChange,
  onRefresh,
  onSettingsChange,
}: SettingsPageProps) {
  const [selectedMonth, setSelectedMonth] = useState<Date>(
    () => propMonth ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [name, setName] = useState("");
  const [color, setColor] = useState("#2563eb");
  const [error, setError] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const { toasts, toast } = useToast();

  useEffect(() => {
    if (propMonth) {
      setSelectedMonth(propMonth);
    }
  }, [propMonth]);

  const targetMonthKey = monthKey(selectedMonth);

  async function handleMonthChange(newMonth: Date) {
    setSelectedMonth(newMonth);
    onMonthChange?.(newMonth);
    await onRefresh(newMonth);
  }

  async function run(action: () => Promise<void>, success: string) {
    try {
      setError(null);
      await action();
      await onRefresh(selectedMonth);
      toast(success);
    } catch (err) {
      setError(messageFromError(err));
    }
  }

  async function createHabit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    await run(async () => {
      await addHabit(trimmed, color, targetMonthKey);
      setName("");
    }, "Habit added.");
  }

  async function moveHabit(id: number, direction: -1 | 1) {
    const ordered = [...habits].sort((a, b) => a.position - b.position);
    const index = ordered.findIndex((habit) => habit.id === id);
    const target = index + direction;
    if (target < 0 || target >= ordered.length) return;
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    await run(() => reorderHabits(ordered.map((habit) => habit.id), targetMonthKey), "Habit order updated.");
  }

  async function downloadBackup() {
    try {
      const json = await exportBackup();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `habit-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast("Backup exported.");
    } catch (err) {
      setError(messageFromError(err));
    }
  }

  async function handleImport(file: File) {
    const text = await file.text();
    await run(() => importBackup(text), "Backup imported.");
  }

  const active = habits.filter((habit) => !habit.archived).sort((a, b) => a.position - b.position);
  const archived = habits.filter((habit) => habit.archived).sort((a, b) => a.position - b.position);

  const sectionIds = ["habits", "appearance", "data", "about"] as const;
  const sectionLabels: Record<typeof sectionIds[number], string> = {
    habits: "Habits",
    appearance: "Appearance",
    data: "Data",
    about: "About",
  };
  const [activeSection, setActiveSection] = useState<string>("habits");

  useEffect(() => {
    const container = document.getElementById("settings-scroll-container");
    if (!container) return;
    const handleScroll = () => {
      for (const id of [...sectionIds].reverse()) {
        const el = document.getElementById(`settings-section-${id}`);
        if (el && el.getBoundingClientRect().top <= 100) {
          setActiveSection(id);
          break;
        }
      }
    };
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section className="flex h-full min-h-0 gap-0 overflow-hidden">
      {/* LEFT STICKY NAV */}
      <nav className="hidden w-40 shrink-0 border-r border-zinc-200 dark:border-zinc-800 md:flex flex-col gap-1 pt-4 px-2">
        {sectionIds.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              document.getElementById(`settings-section-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
              setActiveSection(id);
            }}
            className={`rounded px-3 py-1.5 text-left text-sm font-medium transition-colors ${
              activeSection === id
                ? "bg-[var(--accent)] text-white"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }`}
          >
            {sectionLabels[id]}
          </button>
        ))}
      </nav>

      {/* SCROLLABLE CONTENT */}
      <div id="settings-scroll-container" className="flex-1 overflow-auto pb-4 pl-4 pr-4">
        <div className="mx-auto max-w-3xl space-y-8 pt-4">
          <h1 className="text-xl font-semibold">Settings</h1>
          {error ? <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-100">{error}</div> : null}
          <ToastPortal toasts={toasts} />

          <section id="settings-section-habits" className="settings-section scroll-mt-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h2>Habits</h2>
              
              {/* MONTH CONTEXT SWITCHER */}
              <div className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900/60">
                <button
                  type="button"
                  onClick={() => handleMonthChange(addMonths(selectedMonth, -1))}
                  className="rounded p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                  title="Previous month"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="px-2 text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  {monthLabel(selectedMonth)}
                </span>
                <button
                  type="button"
                  onClick={() => handleMonthChange(addMonths(selectedMonth, 1))}
                  className="rounded p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                  title="Next month"
                >
                  <ChevronRight size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleMonthChange(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}
                  className="rounded px-2 py-0.5 text-[11px] font-semibold text-[var(--accent)] hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                >
                  Current
                </button>
              </div>
            </div>

            {/* MONTH-SCOPED EXPLANATION BANNER */}
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-blue-200/80 bg-blue-50/70 p-2.5 text-xs text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200">
              <Sparkles size={16} className="shrink-0 text-blue-600 dark:text-blue-400" />
              <span>
                Changes made here apply to <strong>{monthLabel(selectedMonth)} and upcoming months</strong>. Previous months remain intact with their historical logs.
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input className="text-input min-w-64" value={name} onChange={(event) => setName(event.target.value)} placeholder="New habit name" />
              <label className="flex items-center gap-2"><input className="h-10 w-16" type="color" value={color} onChange={(event) => setColor(event.target.value)} /></label>
              <button className="primary-button" type="button" onClick={createHabit}>Add Habit</button>
            </div>
            <div className="mt-3 rounded border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
              {!active.length && <div className="px-3 py-2 text-sm text-zinc-500">No active habits for {monthLabel(selectedMonth)}. Add one above.</div>}
              {active.map((habit) => (
                <HabitRow
                  key={habit.id}
                  habit={habit}
                  onRename={(newName, newColor) => run(() => renameHabit(habit.id, newName, newColor, targetMonthKey), "Habit updated.")}
                  onArchive={() => run(() => archiveHabit(habit.id, true, targetMonthKey), "Habit archived.")}
                  onDelete={() => {
                    if (confirm(`Delete ${habit.name}? Historical records in previous months will be preserved.`)) {
                      run(() => deleteHabit(habit.id, targetMonthKey), "Habit deleted.");
                    }
                  }}
                  onMoveUp={() => moveHabit(habit.id, -1)}
                  onMoveDown={() => moveHabit(habit.id, 1)}
                />
              ))}
            </div>
            <h3 className="mt-4 text-sm font-semibold text-zinc-600 dark:text-zinc-300">Archived</h3>
            <div className="mt-2 rounded border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
              {!archived.length && <div className="px-3 py-2 text-sm text-zinc-500">No archived habits.</div>}
              {archived.map((habit) => (
                <div key={habit.id} className="flex items-center justify-between border-b border-zinc-200 px-3 py-2 last:border-b-0 dark:border-zinc-800">
                  <span>{habit.name}</span>
                  <button className="secondary-button" type="button" onClick={() => run(() => archiveHabit(habit.id, false, targetMonthKey), "Habit restored.")}>Restore</button>
                </div>
              ))}
            </div>
          </section>

          <section id="settings-section-appearance" className="settings-section scroll-mt-4">
            <h2>Appearance</h2>
            <div className="grid gap-3 md:grid-cols-3">
              <label className="field-label">Theme
                <select className="text-input" value={settings.theme} onChange={(event) => onSettingsChange({ ...settings, theme: event.target.value as Settings["theme"] })}>
                  <option value="system">System</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </label>
              <label className="field-label">Density
                <select className="text-input" value={settings.density} onChange={(event) => onSettingsChange({ ...settings, density: event.target.value as Settings["density"] })}>
                  <option value="comfortable">Comfortable</option>
                  <option value="compact">Compact</option>
                </select>
              </label>
              <label className="field-label">Accent
                <input className="h-10 w-20" type="color" value={settings.accentColor} onChange={(event) => onSettingsChange({ ...settings, accentColor: event.target.value })} />
              </label>
              <label className="field-label">Countdown Event Title
                <input
                  className="text-input"
                  type="text"
                  placeholder="e.g. GATE 2027"
                  value={settings.countdownTitle ?? ""}
                  onChange={(event) => onSettingsChange({ ...settings, countdownTitle: event.target.value || undefined })}
                />
              </label>
              <label className="field-label">Countdown Target Date
                <div className="flex items-center gap-2">
                  <input
                    className="text-input"
                    type="date"
                    value={settings.countdownDate ?? ""}
                    onChange={(event) => onSettingsChange({ ...settings, countdownDate: event.target.value || undefined })}
                  />
                  {settings.countdownDate && (
                    <button className="secondary-button" type="button" onClick={() => onSettingsChange({ ...settings, countdownDate: undefined, countdownTitle: undefined })}>Clear</button>
                  )}
                </div>
              </label>
              <label className="field-label">App PIN Lock
                <PinSettingInput
                  settingsPin={settings.pin}
                  onChange={(newPin) => onSettingsChange({ ...settings, pin: newPin })}
                />
              </label>
              <label className="field-label">Daily Reminder
                <div className="flex items-center gap-2">
                  <input
                    className="text-input"
                    type="time"
                    value={settings.reminderTime ?? ""}
                    onChange={(event) => {
                      if ("Notification" in window && Notification.permission === "default") {
                        Notification.requestPermission();
                      }
                      onSettingsChange({ ...settings, reminderTime: event.target.value || undefined });
                    }}
                  />
                  {settings.reminderTime && (
                    <button className="secondary-button" type="button" onClick={() => onSettingsChange({ ...settings, reminderTime: undefined })}>Clear</button>
                  )}
                </div>
              </label>
              <label className="field-label flex-row items-center gap-2 cursor-pointer mt-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded accent-[var(--accent)]"
                  checked={Boolean(settings.alwaysOnTop)}
                  onChange={(e) => onSettingsChange({ ...settings, alwaysOnTop: e.target.checked })}
                />
                <span>Always on Top (Float on Desktop)</span>
              </label>
              <label className="field-label flex-row items-center gap-2 cursor-pointer mt-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded accent-[var(--accent)]"
                  checked={Boolean(settings.autoStart)}
                  onChange={(e) => onSettingsChange({ ...settings, autoStart: e.target.checked })}
                />
                <span>Start automatically on laptop boot</span>
              </label>
            </div>
          </section>

          <section id="settings-section-data" className="settings-section scroll-mt-4">
            <h2>Data</h2>
            <div className="flex flex-wrap gap-2">
              <button className="secondary-button" type="button" onClick={downloadBackup}><Download size={16} /> Export Backup</button>
              <button className="secondary-button" type="button" onClick={() => importRef.current?.click()}><Upload size={16} /> Import Backup</button>
              <input ref={importRef} hidden type="file" accept="application/json" onChange={(event) => event.target.files?.[0] && handleImport(event.target.files[0])} />
              <button
                className="danger-button"
                type="button"
                onClick={() => {
                  if (confirm("Reset all app data? This cannot be undone unless you have a backup.")) {
                    run(resetData, "Application data reset.");
                  }
                }}
              >
                <RotateCcw size={16} /> Reset Data
              </button>
            </div>
          </section>

          <section id="settings-section-about" className="settings-section scroll-mt-4">
            <h2>About</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-300">Habit Tracker 0.1.0. Offline Windows desktop app built around checkbox tracking and automatic analytics.</p>
          </section>
        </div>
      </div>
    </section>
  );
}

interface HabitRowProps {
  habit: Habit;
  onRename: (name: string, color?: string | null) => void;
  onArchive: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function HabitRow({ habit, onRename, onArchive, onDelete, onMoveUp, onMoveDown }: HabitRowProps) {
  const [name, setName] = useState(habit.name);
  const [color, setColor] = useState(habit.color ?? "#2563eb");

  useEffect(() => {
    setName(habit.name);
    setColor(habit.color ?? "#2563eb");
  }, [habit.name, habit.color]);

  return (
    <div className="grid gap-2 border-b border-zinc-200 px-3 py-2 last:border-b-0 dark:border-zinc-800 md:grid-cols-[1fr_120px_auto] md:items-center">
      <input className="text-input" value={name} onChange={(event) => setName(event.target.value)} onBlur={() => onRename(name.trim() || habit.name, color)} />
      <input className="h-9 w-20" type="color" value={color} onChange={(event) => setColor(event.target.value)} onBlur={() => onRename(name.trim() || habit.name, color)} />
      <div className="flex gap-1">
        <button className="icon-button" type="button" onClick={onMoveUp} aria-label="Move up"><ArrowUp size={16} /></button>
        <button className="icon-button" type="button" onClick={onMoveDown} aria-label="Move down"><ArrowDown size={16} /></button>
        <button className="secondary-button" type="button" onClick={onArchive}>Archive</button>
        <button className="icon-button text-red-600" type="button" onClick={onDelete} aria-label="Delete habit"><Trash2 size={16} /></button>
      </div>
    </div>
  );
}

function PinSettingInput({ settingsPin, onChange }: { settingsPin?: string; onChange: (pin?: string) => void }) {
  const [val, setVal] = useState(settingsPin ?? "");

  useEffect(() => {
    setVal(settingsPin ?? "");
  }, [settingsPin]);

  return (
    <div className="flex items-center gap-2">
      <input
        className="text-input w-28"
        type="password"
        maxLength={4}
        placeholder="4 digits"
        value={val}
        onChange={(event) => {
          const next = event.target.value.replace(/\D/g, "").slice(0, 4);
          setVal(next);
          if (next.length === 4) {
            onChange(next);
          } else if (next.length === 0) {
            onChange(undefined);
          }
        }}
      />
      {settingsPin && (
        <button
          className="secondary-button"
          type="button"
          onClick={() => {
            setVal("");
            onChange(undefined);
          }}
        >
          Remove PIN
        </button>
      )}
    </div>
  );
}
