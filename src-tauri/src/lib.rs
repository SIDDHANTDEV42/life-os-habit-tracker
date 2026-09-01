use chrono::{Datelike, Local, NaiveDate};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::Manager;
use thiserror::Error;

#[derive(Debug, Error)]
enum AppError {
    #[error("Database error: {0}")]
    Db(#[from] rusqlite::Error),
    #[error("File error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Backup is not valid JSON.")]
    Json(#[from] serde_json::Error),
    #[error("{0}")]
    Message(String),
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Habit {
    id: i64,
    name: String,
    position: i64,
    archived: bool,
    created_at: String,
    color: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Completion {
    habit_id: i64,
    date: String,
    completed: bool,
}

// Settings is stored as a raw JSON value so the backend
// transparently persists ALL frontend fields (countdown,
// PIN, daily notes, skipped, reminders, etc.) without
// needing to update this struct every time a new field is added.

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AppState {
    habits: Vec<Habit>,
    completions: Vec<Completion>,
    all_completions: Vec<Completion>,
    settings: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Backup {
    version: u32,
    exported_at: String,
    habits: Vec<Habit>,
    completions: Vec<Completion>,
    settings: serde_json::Value,
}





fn initialize(conn: &Connection) -> Result<(), AppError> {
    conn.execute_batch(
        "
        PRAGMA foreign_keys = ON;
        CREATE TABLE IF NOT EXISTS habits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            position INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            archived INTEGER NOT NULL DEFAULT 0,
            color TEXT
        );
        CREATE TABLE IF NOT EXISTS habit_completions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            habit_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            completed INTEGER NOT NULL,
            UNIQUE(habit_id, date),
            FOREIGN KEY(habit_id) REFERENCES habits(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
        ",
    )?;

    set_default_setting(conn, "theme", "system")?;
    set_default_setting(conn, "density", "comfortable")?;
    set_default_setting(conn, "accentColor", "#2563eb")?;
    Ok(())
}

fn set_default_setting(conn: &Connection, key: &str, value: &str) -> Result<(), AppError> {
    conn.execute(
        "INSERT OR IGNORE INTO settings (key, value) VALUES (?1, ?2)",
        params![key, value],
    )?;
    Ok(())
}

fn load_habits(conn: &Connection) -> Result<Vec<Habit>, AppError> {
    let mut stmt = conn.prepare("SELECT id, name, position, archived, created_at, color FROM habits ORDER BY position, id")?;
    let rows = stmt.query_map([], |row| {
        Ok(Habit {
            id: row.get(0)?,
            name: row.get(1)?,
            position: row.get(2)?,
            archived: row.get::<_, i64>(3)? == 1,
            created_at: row.get(4)?,
            color: row.get(5)?,
        })
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(AppError::from)
}

fn load_completions(conn: &Connection, start: Option<&str>, end: Option<&str>) -> Result<Vec<Completion>, AppError> {
    if let (Some(start), Some(end)) = (start, end) {
        let mut stmt = conn.prepare(
            "SELECT habit_id, date, completed FROM habit_completions WHERE date >= ?1 AND date < ?2 ORDER BY date, habit_id",
        )?;
        let rows = stmt.query_map(params![start, end], |row| {
            Ok(Completion {
                habit_id: row.get(0)?,
                date: row.get(1)?,
                completed: row.get::<_, i64>(2)? == 1,
            })
        })?;
        return rows.collect::<Result<Vec<_>, _>>().map_err(AppError::from);
    }

    let mut stmt = conn.prepare("SELECT habit_id, date, completed FROM habit_completions ORDER BY date, habit_id")?;
    let rows = stmt.query_map([], |row| {
        Ok(Completion {
            habit_id: row.get(0)?,
            date: row.get(1)?,
            completed: row.get::<_, i64>(2)? == 1,
        })
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(AppError::from)
}

fn load_settings(conn: &Connection) -> Result<serde_json::Value, AppError> {
    // Try loading the new single-blob format first
    let result: Result<String, _> = conn.query_row(
        "SELECT value FROM settings WHERE key = 'app_settings'",
        [],
        |row| row.get(0),
    );

    match result {
        Ok(json_str) => {
            let value: serde_json::Value = serde_json::from_str(&json_str)?;
            Ok(value)
        }
        Err(_) => {
            // Backward compat: fall back to legacy individual key-value pairs
            let get = |key: &str, fallback: &str| -> String {
                conn.query_row(
                    "SELECT value FROM settings WHERE key = ?1",
                    params![key],
                    |row| row.get(0),
                )
                .unwrap_or_else(|_| fallback.to_string())
            };
            Ok(serde_json::json!({
                "theme": get("theme", "system"),
                "density": get("density", "comfortable"),
                "accentColor": get("accentColor", "#2563eb"),
            }))
        }
    }
}

fn next_month(month: &str) -> Result<(String, String), AppError> {
    let start = NaiveDate::parse_from_str(&format!("{month}-01"), "%Y-%m-%d")
        .map_err(|_| AppError::Message("Month must use YYYY-MM format.".to_string()))?;
    let (year, month) = if start.month() == 12 {
        (start.year() + 1, 1)
    } else {
        (start.year(), start.month() + 1)
    };
    Ok((start.to_string(), format!("{year:04}-{month:02}-01")))
}

#[tauri::command]
fn get_app_state(state: tauri::State<'_, Mutex<Connection>>, month: String) -> Result<AppState, AppError> {
    let conn = state.lock().unwrap();
    let (start, end) = next_month(&month)?;
    Ok(AppState {
        habits: load_habits(&conn)?,
        completions: load_completions(&conn, Some(&start), Some(&end))?,
        all_completions: load_completions(&conn, None, None)?,
        settings: load_settings(&conn)?,
    })
}

#[tauri::command]
#[allow(non_snake_case)]
fn set_completion(state: tauri::State<'_, Mutex<Connection>>, habitId: i64, date: String, completed: bool) -> Result<(), AppError> {
    let today = Local::now().date_naive().to_string();
    if date > today {
        return Err(AppError::Message("Future dates cannot be logged yet.".to_string()));
    }
    let conn = state.lock().unwrap();
    conn.execute(
        "INSERT INTO habit_completions (habit_id, date, completed) VALUES (?1, ?2, ?3)
         ON CONFLICT(habit_id, date) DO UPDATE SET completed = excluded.completed",
        params![habitId, date, if completed { 1 } else { 0 }],
    )?;
    Ok(())
}

#[tauri::command]
fn add_habit(state: tauri::State<'_, Mutex<Connection>>, name: String, color: Option<String>) -> Result<Habit, AppError> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err(AppError::Message("Habit name cannot be empty.".to_string()));
    }
    let conn = state.lock().unwrap();
    let position: i64 = conn.query_row("SELECT COALESCE(MAX(position), -1) + 1 FROM habits", [], |row| row.get(0))?;
    conn.execute(
        "INSERT INTO habits (name, position, created_at, archived, color) VALUES (?1, ?2, datetime('now'), 0, ?3)",
        params![trimmed, position, color],
    )?;
    let id = conn.last_insert_rowid();
    Ok(Habit {
        id,
        name: trimmed.to_string(),
        position,
        archived: false,
        created_at: Local::now().to_rfc3339(),
        color,
    })
}

#[tauri::command]
fn update_habit(state: tauri::State<'_, Mutex<Connection>>, id: i64, name: String, color: Option<String>) -> Result<(), AppError> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err(AppError::Message("Habit name cannot be empty.".to_string()));
    }
    let conn = state.lock().unwrap();
    conn.execute("UPDATE habits SET name = ?1, color = ?2 WHERE id = ?3", params![trimmed, color, id])?;
    Ok(())
}

#[tauri::command]
fn archive_habit(state: tauri::State<'_, Mutex<Connection>>, id: i64, archived: bool) -> Result<(), AppError> {
    let conn = state.lock().unwrap();
    conn.execute("UPDATE habits SET archived = ?1 WHERE id = ?2", params![if archived { 1 } else { 0 }, id])?;
    Ok(())
}

#[tauri::command]
fn delete_habit(state: tauri::State<'_, Mutex<Connection>>, id: i64) -> Result<(), AppError> {
    let conn = state.lock().unwrap();
    conn.execute("DELETE FROM habits WHERE id = ?1", params![id])?;
    Ok(())
}

#[tauri::command]
fn reorder_habits(state: tauri::State<'_, Mutex<Connection>>, ids: Vec<i64>) -> Result<(), AppError> {
    let mut conn = state.lock().unwrap();
    let tx = conn.transaction()?;
    for (position, id) in ids.iter().enumerate() {
        tx.execute("UPDATE habits SET position = ?1 WHERE id = ?2", params![position as i64, id])?;
    }
    tx.commit()?;
    Ok(())
}

#[tauri::command]
fn save_settings(state: tauri::State<'_, Mutex<Connection>>, settings: serde_json::Value) -> Result<(), AppError> {
    let conn = state.lock().unwrap();
    let json_str = serde_json::to_string(&settings)?;
    conn.execute(
        "INSERT INTO settings (key, value) VALUES ('app_settings', ?1)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        params![json_str],
    )?;
    Ok(())
}

#[tauri::command]
fn export_backup(state: tauri::State<'_, Mutex<Connection>>) -> Result<String, AppError> {
    let conn = state.lock().unwrap();
    let backup = Backup {
        version: 1,
        exported_at: Local::now().to_rfc3339(),
        habits: load_habits(&conn)?,
        completions: load_completions(&conn, None, None)?,
        settings: load_settings(&conn)?,
    };
    serde_json::to_string_pretty(&backup).map_err(AppError::from)
}

#[tauri::command]
fn import_backup(state: tauri::State<'_, Mutex<Connection>>, json: String) -> Result<(), AppError> {
    let backup: Backup = serde_json::from_str(&json)?;
    if backup.version != 1 {
        return Err(AppError::Message("Backup version is not supported.".to_string()));
    }
    let mut conn = state.lock().unwrap();
    let tx = conn.transaction()?;
    tx.execute("DELETE FROM habit_completions", [])?;
    tx.execute("DELETE FROM habits", [])?;
    tx.execute("DELETE FROM settings", [])?;
    for habit in backup.habits {
        tx.execute(
            "INSERT INTO habits (id, name, position, created_at, archived, color) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![habit.id, habit.name, habit.position, habit.created_at, if habit.archived { 1 } else { 0 }, habit.color],
        )?;
    }
    for completion in backup.completions {
        tx.execute(
            "INSERT INTO habit_completions (habit_id, date, completed) VALUES (?1, ?2, ?3)",
            params![completion.habit_id, completion.date, if completion.completed { 1 } else { 0 }],
        )?;
    }
    let settings_json = serde_json::to_string(&backup.settings)?;
    tx.execute(
        "INSERT INTO settings (key, value) VALUES ('app_settings', ?1)",
        params![settings_json],
    )?;
    tx.commit()?;
    Ok(())
}

#[tauri::command]
fn reset_data(state: tauri::State<'_, Mutex<Connection>>) -> Result<(), AppError> {
    let conn = state.lock().unwrap();
    conn.execute("DELETE FROM habit_completions", [])?;
    conn.execute("DELETE FROM habits", [])?;
    conn.execute("DELETE FROM settings", [])?;
    initialize(&conn)?;
    Ok(())
}

#[tauri::command]
#[allow(non_snake_case)]
fn set_always_on_top(app: tauri::AppHandle, alwaysOnTop: bool) -> Result<(), AppError> {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_always_on_top(alwaysOnTop);
    }
    Ok(())
}

#[tauri::command]
fn set_window_size(app: tauri::AppHandle, width: f64, height: f64) -> Result<(), AppError> {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize { width, height }));
    }
    Ok(())
}

#[tauri::command]
fn set_autostart(enabled: bool) -> Result<(), AppError> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        if let Ok(exe_path) = std::env::current_exe() {
            let exe_str = exe_path.to_str().unwrap_or("");
            if enabled {
                let _ = Command::new("reg")
                    .args([
                        "add",
                        "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
                        "/v",
                        "LifeOSHabitTracker",
                        "/t",
                        "REG_SZ",
                        "/d",
                        &format!("\"{}\"", exe_str),
                        "/f",
                    ])
                    .output();
            } else {
                let _ = Command::new("reg")
                    .args([
                        "delete",
                        "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
                        "/v",
                        "LifeOSHabitTracker",
                        "/f",
                    ])
                    .output();
            }
        }
    }
    Ok(())
}

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let dir = app
                .path()
                .app_data_dir()
                .expect("Could not find app data folder");
            std::fs::create_dir_all(&dir).unwrap();
            let conn = Connection::open(dir.join("habit-tracker.sqlite")).unwrap();
            initialize(&conn).unwrap();
            app.manage(Mutex::new(conn));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_app_state,
            set_completion,
            add_habit,
            update_habit,
            archive_habit,
            delete_habit,
            reorder_habits,
            save_settings,
            export_backup,
            import_backup,
            reset_data,
            set_always_on_top,
            set_window_size,
            set_autostart
        ])
        .run(tauri::generate_context!())
        .expect("error while running habit tracker");
}
