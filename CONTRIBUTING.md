# Contributing to Terminal Arcade Hub

Thank you for your interest in **Terminal Arcade Hub**! This project is an open-source retro terminal arcade game launcher built with Node.js and embedded SQLite.

---

## 👥 Core Engineering Team

| Name | Role | GitHub | Email |
|:---|:---|:---|:---|
| **Taranveer Singh** | Project Lead & Core Engine Architecture | [@Taranveer06](https://github.com/Taranveer06) | `taranveersidhu302521@gmail.com` |
| **Shikhar Verma** | Terminal UI, Neon Styling & Game HUDs | [@shikharverma018](https://github.com/shikharverma018) | `shikharverma018@users.noreply.github.com` |
| **Akshat Kanwar** | Database Repositories, Migration & Test Suite | [@akshat2907-web](https://github.com/akshat2907-web) | `akshat2907-web@users.noreply.github.com` |

---

## 🛠️ Development Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Taranveer06/Termianl_Arcade_Hub.git
   cd Termianl_Arcade_Hub
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run automated test suites**:
   ```bash
   npm test
   ```

4. **Start the arcade launcher**:
   ```bash
   npm start
   ```

---

## 📐 Architecture Guidelines

### 1. Terminal Display & ANSI Standards
- Clamped layout standard: All interfaces must fit within standard **80x24** terminal dimensions (`80` columns by `24` rows).
- Always clean up ANSI sequences, restore raw mode, and re-enable cursor visibility (`\x1B[?25h`) upon exit or error.
- Use `src/renderer.js` for colors, box borders, and text centering rather than ad-hoc escape codes.

### 2. Database & Data Integrity
- Embedded SQLite is managed via `better-sqlite3`.
- Always enable foreign keys (`PRAGMA foreign_keys = ON;`) and WAL journal mode (`PRAGMA journal_mode = WAL;`).
- Relational tables:
  - `players`: User credentials and account metadata.
  - `games`: Catalog of games with descriptions.
  - `game_sessions`: Session scores, duration in seconds, and timestamps with `CHECK(score >= 0)`.
- Use prepared statements to prevent injection and maximize execution throughput.

### 3. Game Loops & Physics
- Frame rates must be tuned for terminal output (e.g. 30ms–80ms ticks).
- Clean up `setInterval` / `clearInterval` handles upon game termination.
- All session outcomes must hook into `gameState.recordCompletedSession()` to persist stats.

---

## 🧪 Testing Standards

Every contribution should include automated tests:
- Place database / schema tests in `tests/database.test.js`.
- Place repository / query tests in `tests/repositories.test.js`.
- Place legacy score migration tests in `tests/migration.test.js`.
- Place game physics & collision tests in `tests/gameplay.test.js`.

---

## 📜 Commit Message Conventions

We follow Conventional Commits formatting:
- `feat:` for new features or capabilities
- `fix:` for bug fixes
- `docs:` for documentation updates
- `test:` for test additions and refactoring
- `chore:` for dependency or build maintenance
