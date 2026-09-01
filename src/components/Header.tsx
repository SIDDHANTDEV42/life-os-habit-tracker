import { Search, Minimize2, User, Sun, Moon, Monitor } from "lucide-react";

interface HeaderProps {
  theme: "system" | "light" | "dark";
  onThemeToggle: () => void;
  onToggleWidget: () => void;
  onSearchChange?: (query: string) => void;
}

export function Header({ theme, onThemeToggle, onToggleWidget, onSearchChange }: HeaderProps) {
  const themeLabels: Record<string, string> = {
    light: "Light → Dark",
    dark: "Dark → System",
    system: "System → Light",
  };

  return (
    <header className="fixed top-0 left-64 right-0 z-40 flex h-16 items-center justify-between border-b border-zinc-200 bg-white/80 dark:border-zinc-800/80 dark:bg-[#161412]/80 px-8 backdrop-blur-xl select-none">
      {/* SEARCH BAR */}
      <div className="flex w-80 items-center gap-2 rounded-full border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-[#211f1d] px-4 py-1.5 text-xs text-zinc-800 dark:text-zinc-300">
        <Search size={16} className="text-zinc-400 dark:text-zinc-500" />
        <input
          type="text"
          placeholder="Search habits or stats..."
          onChange={(e) => onSearchChange?.(e.target.value)}
          className="w-full bg-transparent outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
        />
      </div>

      {/* RIGHT ACTION CONTROLS */}
      <div className="flex items-center gap-3">
        {/* LIGHT / DARK / SYSTEM MODE TOGGLE */}
        <button
          type="button"
          onClick={onThemeToggle}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:border-zinc-800 dark:bg-[#211f1d] dark:text-zinc-300 dark:hover:bg-zinc-800 transition-all active:scale-95"
          title={`Switch Theme: ${themeLabels[theme] ?? theme}`}
        >
          {theme === "light" ? (
            <Sun size={18} className="text-amber-500" />
          ) : theme === "dark" ? (
            <Moon size={18} className="text-indigo-400" />
          ) : (
            <Monitor size={18} className="text-emerald-500" />
          )}
        </button>

        {/* DESKTOP WIDGET BUTTON */}
        <button
          type="button"
          onClick={onToggleWidget}
          className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-[#211f1d] px-3.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-all active:scale-95"
          title="Switch to Compact Desktop Widget Mode"
        >
          <Minimize2 size={14} /> Widget
        </button>

        {/* PROFILE BADGE */}
        <div className="flex items-center gap-3 border-l border-zinc-200 dark:border-zinc-800 pl-4">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-zinc-900 dark:text-white">Student User</div>
            <div className="text-[10px] font-semibold text-[#5e6ad2]">Elite Member</div>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 dark:bg-[#2c2927] border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300">
            <User size={18} />
          </div>
        </div>
      </div>
    </header>
  );
}
