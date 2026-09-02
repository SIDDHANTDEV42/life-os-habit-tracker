# ⚡ Life OS — HabitPulse

> A sleek, local-first, privacy-focused offline desktop habit tracker and goal dashboard built with **React**, **TypeScript**, **TailwindCSS**, and **Tauri (Rust)**.

![Life OS Banner](https://img.shields.io/badge/Life%20OS-Habit%20Tracker-5e6ad2?style=for-the-badge)
![Tauri](https://img.shields.io/badge/Tauri-2.0-blue?style=for-the-badge&logo=tauri)
![React](https://img.shields.io/badge/React-18-61dafb?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6?style=for-the-badge&logo=typescript)
![Rust](https://img.shields.io/badge/Rust-SQLite-orange?style=for-the-badge&logo=rust)

---

## ✨ Features

### 📊 Bento Dashboard & Analytics
- **Circular Completion Gauge**: Real-time daily progress ring with animated SVG stroke.
- **Weekly Activity Heatmap**: 7-day completion rate visualization with dynamic trend detection (**Trending Up**, **Trending Down**, **Holding Steady**).
- **Category Summary**: Real-time habit tracking grouped by category with custom accent colors.
- **Performance Analytics**: Track Monthly Average, Consistency, Stability, Volatility, Slump days, and Bounce-backs.

### 🗓️ Interactive Habit Matrix (Grid)
- **Month-Aware Continuous Streaks**: Computes active current streaks and historical continuous month streaks per habit.
- **Keyboard Grid Navigation**: Arrow keys (`↑` `↓` `←` `→`) grid cell movement with `Space` / `Enter` toggle.
- **Bulk Day Completion**: Fill all active habits for a date with a single click (`✓` button).
- **Right-Click Skip**: Mark planned rest or sick days via context menu.
- **Daily Notes (`📝`)**: Attach and edit custom notes on any calendar date.

### 📌 Compact Desktop Widget
- **Compact Widget Window**: Switch to a compact widget window (`340x520`) with one click (`Widget` button).
- **Instant Optimistic UI**: Zero-lag checkmarks that persist directly to the SQLite backend.
- **Live Target Sync**: Displays active goal countdown and today's completion percentage on your desktop.

### 🎯 Target Goal Countdown Banner
- Live countdown (Days, Hours, Minutes, Seconds) to target milestone (e.g. GATE exam or launch date).
- **Urgency Themes**: High urgency (≤30 days: red/orange gradient), Medium urgency (≤90 days: amber gradient), and Standard (>90 days: indigo/purple gradient).

### 🔒 Security & Customization
- **4-Digit PIN Lock**: Lock screen with full **Numpad** and physical keyboard support (`0`–`9`, `Backspace`, `Delete`, `Escape`).
- **Theme Modes**: Supports Light, Dark, and System preference options with interactive header cycle.
- **Density Settings**: Toggle between Comfortable and Compact row padding.
- **Offline & Local-First**: Embedded SQLite database (`habit-tracker.sqlite`) with full JSON backup export/import tools.

---

## 🛠️ Technology Stack

| Layer | Technology |
|-------|------------|
| **Desktop Shell** | [Tauri v2](https://tauri.app/) (Rust) |
| **Database** | SQLite via [`rusqlite`](https://crates.io/crates/rusqlite) |
| **Frontend Framework** | [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) |
| **Styling** | [TailwindCSS](https://tailwindcss.com/) |
| **Charts & Graphs** | [Recharts](https://recharts.org/) |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Build Tool** | [Vite](https://vitejs.dev/) |

---

## ⌨️ Keyboard Shortcuts

| Context | Shortcut | Action |
|---------|----------|--------|
| **Habit Grid** | `↑` `↓` `←` `→` | Navigate between grid cells |
| **Habit Grid** | `Space` / `Enter` | Toggle habit completion for selected cell |
| **Habit Grid** | `Right Click` | Toggle skipped status for selected cell |
| **PIN Lock** | `0` – `9` / Numpad | Input PIN digits |
| **PIN Lock** | `Backspace` / `Delete` | Remove last PIN digit |
| **PIN Lock** | `Escape` | Clear entered PIN |

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- C++ Build Tools for Windows (required by Tauri)

### Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/SIDDHANTDEV42/life-os-habit-tracker.git
   cd life-os-habit-tracker
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start Development App**:
   ```bash
   npm run tauri:dev
   ```

### Production Build

To package the application into a Windows installer:
```bash
npm run tauri:build
```
The NSIS setup installer will be generated at:
`src-tauri/target/release/bundle/nsis/`

---

## 📂 Project Structure

```
life_os/
├── src-tauri/             # Rust Tauri Backend & SQLite database engine
│   ├── src/
│   │   ├── lib.rs         # Database schema, IPC commands, & settings JSON
│   │   └── main.rs        # Tauri application entry
│   ├── Cargo.toml
│   └── tauri.conf.json    # Window dimensions & bundle permissions
├── src/
│   ├── calculations/      # Business logic & metrics
│   │   ├── dailyScore.ts  # Daily completion score (60% baseline)
│   │   ├── monthlyStats.ts# Stability & volatility stats
│   │   ├── weeklyStats.ts # 7-day rolling averages
│   │   └── streaks.ts     # Streak calculation engine
│   ├── components/        # UI Components
│   │   ├── HabitGrid.tsx  # Keyboard-navigable habit grid
│   │   ├── Sidebar.tsx    # App navigation & streak display
│   │   ├── Header.tsx     # Theme, search & widget toggle
│   │   ├── PinLockScreen.tsx # Numpad-enabled PIN lock screen
│   │   ├── DesktopWidgetView.tsx # Floating desktop widget
│   │   └── CountdownWidget.tsx  # Target countdown banner
│   ├── database/
│   │   └── api.ts         # Tauri IPC invocation wrappers
│   ├── lib/               # Date and error utilities
│   ├── pages/             # Main views (Dashboard, Habits, History, Settings)
│   ├── App.tsx            # Main application controller
│   └── main.tsx
└── README.md
```
