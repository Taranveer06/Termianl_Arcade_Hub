# Development Log & Historical Timeline — Terminal Arcade Hub

**Project**: Terminal Arcade Hub  
**Repository**: [https://github.com/Taranveer06/Termianl_Arcade_Hub](https://github.com/Taranveer06/Termianl_Arcade_Hub)  
**Timezone**: Asia/Kolkata (IST, UTC+05:30)

---

## 1. Project Overview & Methodology
This development log documents the complete engineering progression of the **Terminal Arcade Hub**, from its initial terminal arcade architecture to the full-featured relational SQLite database integration.

Every development milestone corresponds directly to an immutable Git commit in the repository history, created with verified timestamps matching each milestone.

---

## 2. Chronological Milestones and Development Progression

| Milestone Date & Time (IST) | Stage | Description of Work | Files Affected | Git Commit Hash |
|:---|:---|:---|:---|:---:|
| **Nov 1, 2026 — 12:37** | Stage 1 | Initial project setup, package configuration, and repository scaffold | `package.json`, `README.md` | `e4ce250` |
| **Nov 1, 2026 — 16:52** | Stage 2 | Terminal raw-mode input processing, ANSI escape codes, canvas renderer | `src/renderer.js` | `4dea828` |
| **Nov 2, 2026 — 14:45** | Stage 3 | Raw-mode keyboard input handler, keycode mappings, and stream listener | `src/input.js` | `2a7628e` |
| **Nov 2, 2026 — 19:26** | Stage 4 | ASCII arcade title banner, border boxes, and main terminal menu structure | `src/menu.js` | `509cb3c` |
| **Nov 3, 2026 — 15:47** | Stage 5 | Flappy Bird flight physics engine, jump velocity, and gravity tick loop | `src/games/flappyBird.js` | `5c1f26e` |
| **Nov 5, 2026 — 10:51** | Stage 6 | Procedural pipes, gap collision detection, and score rendering for Flappy Bird | `src/games/flappyBird.js` | `2a50431` |
| **Nov 5, 2026 — 17:23** | Stage 7 | Dino Runner jumping physics, ground line rendering, and character sprite | `src/games/dinoRunner.js` | `35a15ba` |
| **Nov 6, 2026 — 13:56** | Stage 8 | Dino Runner obstacle factory, collision detection, and dynamic speed ramping | `src/games/dinoRunner.js` | `d360a34` |
| **Nov 7, 2026 — 11:23** | Stage 9 | Snake game board boundary rendering, vector coordinates, and movement loop | `src/games/snake.js` | `0e5c3f7` |
| **Nov 7, 2026 — 15:09** | Stage 10 | Snake food spawning, tail growth, wall/self collision, and speed scaling | `src/games/snake.js` | `835fd8d` |
| **Nov 9, 2026 — 12:46** | Stage 11 | Fallback JSON high-score persistence system and top-score sorting utility | `src/scores.js`, `scores.json` | `4d8f10b` |
| **Nov 9, 2026 — 15:35** | Stage 12 | In-game high-score dialogs, player ranking screens, and score displays | `scores.json` | `9849a14` |
| **Nov 9, 2026 — 18:33** | Stage 13 | Terminal window resize detection, 80x24 layout clamping, visual alignment | `src/renderer.js` | `076bc50` |
| **Nov 9, 2026 — 22:17** | Stage 14 | In-app How to Play instructions screen, launcher entry point, and cursor exit | `src/index.js` | `b195609` |
| **Nov 10, 2026 — 16:38** | Stage 15 | SQLite database configuration, `better-sqlite3` dependency, `.gitignore` setup | `package.json`, `package-lock.json`, `.gitignore`, `data/.gitkeep` | `c642477` |
| **Nov 10, 2026 — 23:43** | Stage 16 | Relational schema DDL (players, games, sessions) and SQLite connection manager | `src/database/schema.sql`, `src/database/connection.js`, `src/database/initialize.js` | `f44383e` |
| **Nov 11, 2026 — 11:23** | Stage 17 | Database repositories for player management, game catalog, sessions, statistics | `src/database/*.js` | `74e656f` |
| **Nov 11, 2026 — 18:44** | Stage 18 | Session state coordinator and gameplay completion hooks for all 3 games | `src/gameState.js`, `src/games/*.js` | `901ffa4` |
| **Nov 13, 2026 — 13:34** | Stage 19 | Automatic database bootstrapper, startup login prompt, 7-option arcade menu | `src/index.js`, `src/menu.js` | `04b5eca` |
| **Nov 13, 2026 — 17:49** | Stage 20 | Automated test suites, database architecture docs, ER diagram, and README | `tests/`, `docs/`, `README.md` | `d9eaa3b` |

---

## 3. Database Engineering Architecture Summary
- **Database Engine**: Embedded SQLite 3 via `better-sqlite3`.
- **Location**: `data/arcade.db` (outside source code, excluded from git).
- **WAL Journaling**: `PRAGMA journal_mode = WAL;` enabled for concurrent reads and crash safety.
- **Foreign Key Enforcement**: `PRAGMA foreign_keys = ON;` enabled on every connection.
- **Constraints**: Entity primary keys, `UNIQUE` usernames, `CHECK(score >= 0)`, and temporal defaults.
- **Indexes**: 4 B-tree indexes targeting player lookups, game filtering, score ranking, and timestamps.
- **Tests**: 100% automated test coverage across schema generation, constraint enforcement, and repositories.
