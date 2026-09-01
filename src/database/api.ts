import { invoke } from "@tauri-apps/api/core";
import type { AppState, Habit, Settings } from "../types";

export function getAppState(month: string): Promise<AppState> {
  return invoke("get_app_state", { month });
}

export function toggleCompletion(habitId: number, date: string, completed: boolean): Promise<void> {
  return invoke("set_completion", { habitId, date, completed });
}

export function addHabit(name: string, color?: string | null): Promise<Habit> {
  return invoke("add_habit", { name, color: color ?? null });
}

export function renameHabit(id: number, name: string, color?: string | null): Promise<void> {
  return invoke("update_habit", { id, name, color: color ?? null });
}

export function archiveHabit(id: number, archived: boolean): Promise<void> {
  return invoke("archive_habit", { id, archived });
}

export function deleteHabit(id: number): Promise<void> {
  return invoke("delete_habit", { id });
}

export function reorderHabits(ids: number[]): Promise<void> {
  return invoke("reorder_habits", { ids });
}

export function saveSettings(settings: Settings): Promise<void> {
  return invoke("save_settings", { settings });
}

export function exportBackup(): Promise<string> {
  return invoke("export_backup");
}

export function importBackup(json: string): Promise<void> {
  return invoke("import_backup", { json });
}

export function resetData(): Promise<void> {
  return invoke("reset_data");
}

export function setAlwaysOnTop(alwaysOnTop: boolean): Promise<void> {
  return invoke("set_always_on_top", { alwaysOnTop });
}

export function setWindowSize(width: number, height: number): Promise<void> {
  return invoke("set_window_size", { width, height });
}

export function setAutoStart(enabled: boolean): Promise<void> {
  return invoke("set_autostart", { enabled });
}
