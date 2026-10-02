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

// ── Life OS v2: Habit Configuration ──────────────────────

/** binary = checkbox ✅/❌, timed = minutes, counted = numeric quantity */
export type HabitType = "binary" | "timed" | "counted";

/** Which tier a timed/counted habit's logged value falls into */
export type HabitTier = "missed" | "minimum" | "target" | "stretch";

/**
 * Category determines how a habit contributes to scoring:
 * - core      = Performance Core → counts toward Today Score
 * - guardrail = Behavioral Guardrail → tracked separately (Guardrails: X/N)
 * - optional  = Optional → does not affect any score
 */
export type HabitCategory = "core" | "guardrail" | "optional";

export interface HabitConfig {
  habitType: HabitType;
  /** Only for timed/counted: minimum threshold (e.g. 45 min, 3 outreaches) */
  tierMinimum?: number;
  /** Only for timed/counted: target threshold (e.g. 90 min, 5 outreaches) */
  tierTarget?: number;
  /** Only for timed/counted: stretch threshold (e.g. 120 min, 10 outreaches) */
  tierStretch?: number;
  /** Unit label for timed/counted (e.g. "min", "prospects") */
  unit?: string;
  /** If true, habit auto-hides from dashboard after temporaryEnd */
  isTemporary?: boolean;
  /** YYYY-MM-DD — expiry date for temporary habits */
  temporaryEnd?: string;
  /** Scoring category — defaults to "core" when missing */
  category?: HabitCategory;
}

// ── Sleep / Wake ─────────────────────────────────────────

export interface SleepWakeTarget {
  /** YYYY-MM-DD — date-specific override */
  date: string;
  /** HH:MM (24h) */
  wakeTarget: string;
  /** HH:MM (24h) — may cross midnight */
  sleepTarget?: string;
}

export interface SleepWakeLog {
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM (24h) */
  actualWake?: string;
  /** HH:MM (24h) */
  actualSleep?: string;
}

// ── Dead Time Queue ──────────────────────────────────────

export interface DeadTimeItem {
  id: string;
  /** e.g. "DSA revision", "Nap" */
  label: string;
  context: "train" | "break" | "general";
}

// ── Main Config Object ───────────────────────────────────

export interface LifeOsConfig {
  /** Per-habit configuration keyed by habit ID from the DB */
  habitConfigs: Record<number, HabitConfig>;

  /** Big 3 — references existing habit IDs (not duplicates). 0–3 items. */
  big3HabitIds: number[];

  /** HH:MM — default wake target when no date-specific override exists */
  sleepWakeDefaultWake?: string;
  /** HH:MM — default sleep target */
  sleepWakeDefaultSleep?: string;
  /** Date-specific overrides (temporary schedule like the sleep reset) */
  sleepWakeTargets: SleepWakeTarget[];
  /** date → actual times logged */
  sleepWakeLogs: Record<string, SleepWakeLog>;

  /** Suggested activities for free time slots */
  deadTimeQueue: DeadTimeItem[];

  /** YYYY-MM-DD if Low Energy Day is active today */
  lowEnergyDayDate?: string;
  /** date → was low-energy */
  lowEnergyDayHistory: Record<string, boolean>;

  /**
   * Timed/counted habit daily values for tier calculation.
   * Key = "habitId:YYYY-MM-DD", value = numeric amount entered.
   */
  habitDailyValues: Record<string, number>;
}

export const DEFAULT_LIFE_OS_CONFIG: LifeOsConfig = {
  habitConfigs: {},
  big3HabitIds: [],
  sleepWakeTargets: [],
  sleepWakeLogs: {},
  deadTimeQueue: [],
  lowEnergyDayHistory: {},
  habitDailyValues: {},
};

// ── Settings ─────────────────────────────────────────────

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
  lifeOsConfig?: LifeOsConfig; // Life OS v2 behavior control layer
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

