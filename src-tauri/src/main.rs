// Prevent a black console window from appearing on Windows in production builds.
// Without this attribute the Rust binary defaults to the "console" subsystem and
// Windows unconditionally opens a terminal window for every GUI launch.
// cfg_attr keeps the console available in debug builds so that `tauri dev` logging
// still works normally.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    life_os_habit_tracker_lib::run()
}
