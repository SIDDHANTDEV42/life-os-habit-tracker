export type ThemeMode = "light" | "dark" | "system";
export type Density = "comfortable" | "compact";

export interface Habit {
  id: number;
  name: string;
  position: number;
  archived: boolean;
  createdAt: string;
  color?: string | null;
  category?: string | null;
  target?: number | null; // e.g. 3 target sessions/units
  startMonth?: string;
  endMonth?: string | null;
  parentId?: number | null;
}

export interface Completion {
  habitId: number;
  date: string;
  completed: boolean;
}

export interface Settings {
  theme: ThemeMode;
  density: Density;
  accentColor: string;
  countdownDate?: string; // YYYY-MM-DD, optional target date
  countdownTitle?: string; // e.g. "GATE 2027", optional target label
  pin?: string; // Optional 4-digit PIN lock
  dailyNotes?: Record<string, string>; // YYYY-MM-DD -> note text
  reminderTime?: string; // HH:MM (24-hour format)
  dailySkipped?: Record<string, boolean>; // habitId:date -> isSkipped
  alwaysOnTop?: boolean; // Float on desktop top
  autoStart?: boolean; // Launch on laptop startup
}

export interface AppState {
  habits: Habit[];
  completions: Completion[];
  allCompletions: Completion[];
  settings: Settings;
}

export interface HabitDraft {
  name: string;
  color?: string | null;
}
