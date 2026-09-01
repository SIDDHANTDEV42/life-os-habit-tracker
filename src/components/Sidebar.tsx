import { LayoutGrid, CheckSquare, History, Settings as SettingsIcon, Flame } from "lucide-react";

type Tab = "dashboard" | "habits" | "history" | "settings";

interface SidebarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  maxStreak: number;
  bestStreak: number;
}

export function Sidebar({ activeTab, onTabChange, maxStreak, bestStreak }: SidebarProps) {
  const navItems: Array<{ id: Tab; label: string; icon: typeof LayoutGrid }> = [
    { id: "dashboard", label: "Dashboard", icon: LayoutGrid },
    { id: "habits", label: "Habits", icon: CheckSquare },
    { id: "history", label: "History", icon: History },
    { id: "settings", label: "Settings", icon: SettingsIcon },
  ];

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-full w-64 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#100e0c] py-6 transition-all select-none">
      {/* BRAND LOGO */}
      <div className="flex items-center gap-3 px-6 mb-8">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#5e6ad2] text-white shadow-[0_0_15px_rgba(94,106,210,0.4)]">
          <Flame size={20} className="text-[#e4f222]" />
        </div>
        <span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">HabitPulse</span>
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 space-y-1.5 px-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                isActive
                  ? "bg-[#5e6ad2] text-white shadow-[0_0_20px_rgba(94,106,210,0.3)]"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-white"
              }`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* DAILY STREAK WIDGET AT BOTTOM */}
      <div className="px-4 mt-auto">
        <div className="rounded-2xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-[#1d1b19] p-4 shadow-inner">
          <div className="text-[10px] font-bold tracking-widest text-zinc-500 dark:text-zinc-400 uppercase mb-1">
            CURRENT STREAK
          </div>
          <div className="flex items-center gap-2">
            <Flame size={22} className={maxStreak > 0 ? "text-[#ff4700] animate-pulse" : "text-zinc-400 dark:text-zinc-600"} />
            <span className="text-xl font-extrabold text-zinc-900 dark:text-white">
              {maxStreak} Days
            </span>
          </div>
          {bestStreak > maxStreak && bestStreak > 0 && (
            <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 mt-1">
              Best Record: {bestStreak} Days
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
