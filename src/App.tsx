import { useEffect, useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
import { getAppState, saveSettings, setAlwaysOnTop, setAutoStart, setWindowSize } from "./database/api";
import { addMonths, getMonthDays, monthKey, toIsoDate } from "./lib/date";
import { messageFromError } from "./lib/error";
import { calculateDailyScores } from "./calculations/dailyScore";
import { calculateMonthlyStats } from "./calculations/monthlyStats";
import { calculateWeeklyStats } from "./calculations/weeklyStats";
import { calculateStreaks } from "./calculations/streaks";
import { DashboardPage } from "./pages/DashboardPage";
import { HabitsPage } from "./pages/HabitsPage";
import { HistoryPage } from "./pages/HistoryPage";
import { SettingsPage } from "./pages/SettingsPage";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { PinLockScreen } from "./components/PinLockScreen";
import { DesktopWidgetView } from "./components/DesktopWidgetView";
import type { AppState, Settings } from "./types";

type Tab = "dashboard" | "habits" | "history" | "settings";

const fallbackSettings: Settings = {
  theme: "system",
  density: "comfortable",
  accentColor: "#2563eb",
};

export default function App() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [state, setState] = useState<AppState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isWidgetMode, setIsWidgetMode] = useState(false);

  async function toggleWidgetMode() {
    const next = !isWidgetMode;
    setIsWidgetMode(next);
    await setAlwaysOnTop(Boolean(settings.alwaysOnTop));
    if (next) {
      await setWindowSize(340, 520);
    } else {
      await setWindowSize(1280, 800);
    }
  }

  async function refresh(month = visibleMonth) {
    setLoading(true);
    try {
      const next = await getAppState(monthKey(month));
      setState(next);
      setError(null);
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh(visibleMonth);
  }, [visibleMonth]);

  const settings = state?.settings ?? fallbackSettings;

  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    function applyTheme() {
      root.classList.toggle("dark", settings.theme === "dark" || (settings.theme === "system" && mediaQuery.matches));
      root.style.setProperty("--accent", settings.accentColor);
    }

    applyTheme();

    if (settings.theme === "system") {
      mediaQuery.addEventListener("change", applyTheme);
      return () => mediaQuery.removeEventListener("change", applyTheme);
    }
  }, [settings.theme, settings.accentColor]);

  // F2: Daily Notification Reminder
  useEffect(() => {
    if (!settings.reminderTime) return;

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const interval = setInterval(() => {
      if (!settings.reminderTime || !("Notification" in window) || Notification.permission !== "granted") return;

      const now = new Date();
      const currentHHMM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      if (currentHHMM === settings.reminderTime) {
        new Notification("Life OS — Habit Tracker", {
          body: "Don't forget to log your habits today!",
          icon: "/favicon.ico",
        });
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [settings.reminderTime]);

  // Desktop Always-on-top & Auto-start effects
  useEffect(() => {
    setAlwaysOnTop(Boolean(settings.alwaysOnTop));
  }, [settings.alwaysOnTop]);

  useEffect(() => {
    setAutoStart(Boolean(settings.autoStart));
  }, [settings.autoStart]);

  const activeHabits = useMemo(
    () => (state?.habits ?? []).filter((habit) => !habit.archived).sort((a, b) => a.position - b.position),
    [state?.habits],
  );
  const monthDays = useMemo(() => getMonthDays(visibleMonth), [visibleMonth]);
  const monthDates = useMemo(() => monthDays.map(toIsoDate), [monthDays]);
  const dailyScores = useMemo(
    () => calculateDailyScores(monthDates, activeHabits, state?.completions ?? []),
    [monthDates, activeHabits, state?.completions],
  );
  const monthlyStats = useMemo(
    () => calculateMonthlyStats(activeHabits, state?.completions ?? [], dailyScores, monthDays.length),
    [activeHabits, state?.completions, dailyScores, monthDays.length],
  );
  const weeklyStats = useMemo(() => calculateWeeklyStats(dailyScores), [dailyScores]);
  const streaks = useMemo(() => calculateStreaks(activeHabits, state?.allCompletions ?? []), [activeHabits, state?.allCompletions]);

  // IMPORTANT: This must be BEFORE any conditional returns to
  // satisfy React's Rules of Hooks (hooks must run in the same order every render).
  const maxStreak = useMemo(
    () => Math.max(0, ...streaks.map((s) => s.current)),
    [streaks]
  );
  const bestStreak = useMemo(
    () => Math.max(0, ...streaks.map((s) => s.best)),
    [streaks]
  );

  async function updateSettings(settingsUpdate: Settings) {
    await saveSettings(settingsUpdate);
    setState((current) => (current ? { ...current, settings: settingsUpdate } : current));
    if (settingsUpdate.pin && settingsUpdate.pin.length === 4) {
      setIsUnlocked(true);
    }
  }



  async function handleSaveNote(dateIso: string, note: string) {
    const currentNotes = settings.dailyNotes ?? {};
    const nextNotes = { ...currentNotes };
    if (note) {
      nextNotes[dateIso] = note;
    } else {
      delete nextNotes[dateIso];
    }
    await updateSettings({ ...settings, dailyNotes: nextNotes });
  }

  async function handleToggleSkipped(key: string) {
    const currentSkipped = settings.dailySkipped ?? {};
    const nextSkipped = { ...currentSkipped };
    if (nextSkipped[key]) {
      delete nextSkipped[key];
    } else {
      nextSkipped[key] = true;
    }
    await updateSettings({ ...settings, dailySkipped: nextSkipped });
  }

  if (settings.pin && settings.pin.length === 4 && !isUnlocked) {
    return <PinLockScreen correctPin={settings.pin} onUnlock={() => setIsUnlocked(true)} />;
  }

  if (isWidgetMode) {
    return (
      <DesktopWidgetView
        habits={activeHabits}
        allCompletions={state?.allCompletions ?? []}
        streaks={streaks}
        settings={settings}
        onExpand={toggleWidgetMode}
        onRefresh={() => refresh()}
      />
    );
  }



  function handleThemeToggle() {
    const cycle: Record<string, Settings["theme"]> = {
      light: "dark",
      dark: "system",
      system: "light",
    };
    const nextTheme = cycle[settings.theme] ?? "dark";
    updateSettings({ ...settings, theme: nextTheme });
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#151311] dark:text-[#e8e1dd]">
      {/* SIDEBAR NAVIGATION */}
      <Sidebar activeTab={tab} onTabChange={setTab} maxStreak={maxStreak} bestStreak={bestStreak} />

      {/* HEADER BAR */}
      <Header
        theme={settings.theme}
        onThemeToggle={handleThemeToggle}
        onToggleWidget={toggleWidgetMode}
      />

      {/* MAIN CONTENT AREA */}
      <div className="pl-64 pt-16">
        <main className="mx-auto max-w-[1400px] p-8">
          {error ? (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-950/40 p-4 text-sm font-medium text-red-200">
              <AlertCircle size={16} />
              {error}
            </div>
          ) : null}

          {tab === "dashboard" && (
            <DashboardPage
              habits={activeHabits}
              completions={state?.completions ?? []}
              dailyScores={dailyScores}
              streaks={streaks}
              settings={settings}
              onNavigate={setTab}
              onRefresh={() => refresh()}
              onUpdateSettings={updateSettings}
            />
          )}
          {tab === "habits" && (
            <HabitsPage
              loading={loading}
              visibleMonth={visibleMonth}
              setVisibleMonth={(date) => setVisibleMonth(date)}
              previousMonth={() => setVisibleMonth((date) => addMonths(date, -1))}
              nextMonth={() => setVisibleMonth((date) => addMonths(date, 1))}
              goToToday={() => setVisibleMonth(new Date())}
              habits={activeHabits}
              completions={state?.completions ?? []}
              dailyScores={dailyScores}
              streaks={streaks}
              settings={settings}
              onRefresh={() => refresh()}
              onSaveNote={handleSaveNote}
              onToggleSkipped={handleToggleSkipped}
            />
          )}
          {tab === "history" && (
            <HistoryPage
              visibleMonth={visibleMonth}
              previousMonth={() => setVisibleMonth((date) => addMonths(date, -1))}
              nextMonth={() => setVisibleMonth((date) => addMonths(date, 1))}
              dailyScores={dailyScores}
              monthlyStats={monthlyStats}
              weeklyStats={weeklyStats}
              streaks={streaks}
              settings={settings}
            />
          )}
          {tab === "settings" && state && (
            <SettingsPage
              habits={state.habits}
              settings={settings}
              visibleMonth={visibleMonth}
              onMonthChange={(m) => setVisibleMonth(m)}
              onRefresh={(m) => refresh(m ?? visibleMonth)}
              onSettingsChange={updateSettings}
            />
          )}
        </main>
      </div>
    </div>
  );
}
