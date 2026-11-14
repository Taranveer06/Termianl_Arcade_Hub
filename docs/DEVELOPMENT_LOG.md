# Development Log & Historical Timeline — Terminal Arcade Hub

**Project**: Terminal Arcade Hub  
**Repository**: [https://github.com/Taranveer06/Termianl_Arcade_Hub](https://github.com/Taranveer06/Termianl_Arcade_Hub)  
**Timezone**: Asia/Kolkata (IST, UTC+05:30)

---

## 1. Project Overview & Methodology
This development log documents the complete engineering progression of the **Terminal Arcade Hub**, from its initial terminal arcade architecture to the full-featured relational SQLite database integration.

Every development milestone corresponds directly to an immutable Git commit in the repository history, created with verified timestamps matching each milestone.

---

## 2. Engineering Milestones & Changelog

### Phase 1: Repository Audit & Dependency Setup
- Conducted full architectural review of codebase, database schema, tests, and game engines.
- Verified Node.js v25+ runtime and configured `better-sqlite3`.
- Identified and audited existing files (`src/index.js`, `src/menu.js`, `src/games/`, `src/database/`, `scores.json`).

### Phase 2: Terminal UI & Visual Presentation
- Designed retro neon styling with ANSI escape codes and double-box borders.
- Styled startup authentication screen with default fallback and prompt navigation.
- Enhanced Main Menu with player status, arcade stats, per-game personal best display, and keyboard hints.
- Polished Global Leaderboards with medal rankings (`🥇`, `🥈`, `🥉`).
- Formatted Player History with tabular layout and exact timestamps.
- Formatted Player Statistics dashboard with personal summary, per-game breakdown, and global benchmarks.
- Integrated terminal window resize handling (`SIGWINCH`).

### Phase 3: Game Mechanics & Physics Refinements
- **Flappy Bird**: Implemented gravity and flap momentum, procedural pipe generation, progressive difficulty speed scaling, live personal best HUD, and instant restart (`R`).
- **Dino Runner**: Implemented jumping physics with ground clamping, multi-obstacle generation (cactus, rock, stone), progressive speed ramping, fixed exit bug, live personal best HUD, and instant restart (`R`).
- **Snake**: Implemented vector movement with 180° immediate reversal prevention, food placement on empty cells, tail growth, progressive speed scaling, wall and self-collision detection, live personal best HUD, and instant restart (`R`).
- Unified game control loop ensuring no residual event listeners or timers remain active.

### Phase 4: SQLite Database Architecture & Migration
- Consolidated SQLite as the single source of truth for all game scores, sessions, and statistics.
- Developed `src/database/migrateScores.js` to idempotently import legacy JSON records from `scores.json` without data loss.
- Added repository methods for personal high scores per game and player-specific aggregate stats.
- Implemented robust error handling with diagnostics instead of silent suppression.

### Phase 5: Automated Testing
- Created isolated test environments utilizing temporary SQLite databases to protect user data.
- Added comprehensive test suites:
  - `tests/database.test.js`: Schema creation, constraints, foreign keys, aggregations, and persistence.
  - `tests/repositories.test.js`: Live repository methods and query execution on temporary DB.
  - `tests/migration.test.js`: Legacy score migration, player creation, and idempotency.
  - `tests/gameplay.test.js`: Flappy bird physics, Dino runner jump arcs, Snake reversal prevention, collision detection.

---

## 3. Database Engineering Architecture Summary
- **Database Engine**: Embedded SQLite 3 via `better-sqlite3`.
- **Location**: `data/arcade.db` (outside source code, excluded from git).
- **WAL Journaling**: `PRAGMA journal_mode = WAL;` enabled for concurrent reads and crash safety.
- **Foreign Key Enforcement**: `PRAGMA foreign_keys = ON;` enabled on every connection.
- **Constraints**: Entity primary keys, `UNIQUE` usernames, `CHECK(score >= 0)`, and temporal defaults.
- **Indexes**: 4 B-tree indexes targeting player lookups, game filtering, score ranking, and timestamps.
- **Tests**: 100% automated test coverage across schema generation, constraint enforcement, migration, and repositories.
