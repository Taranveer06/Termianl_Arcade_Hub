# Database Design Document — Terminal Arcade Hub

## 1. Overview
The **Terminal Arcade Hub** employs a relational database architecture implemented using **SQLite** via the high-performance `better-sqlite3` driver in Node.js. The database file resides at `data/arcade.db`, isolated from source code, ensuring persistence across application restarts and sessions.

Foreign key constraint enforcement is explicitly enabled on every connection via `PRAGMA foreign_keys = ON;`, and Write-Ahead Logging (`PRAGMA journal_mode = WAL;`) is used for concurrent read performance and crash resilience.

---

## 2. Relational Schema Architecture

The relational schema consists of three normalized tables:

### Table 1: `players`
Stores registered player accounts.
- **`player_id`** `INTEGER PRIMARY KEY AUTOINCREMENT`: Unique surrogate primary key.
- **`username`** `TEXT UNIQUE NOT NULL`: Case-sensitive unique player handle.
- **`created_at`** `DATETIME DEFAULT CURRENT_TIMESTAMP`: Account registration timestamp.

### Table 2: `games`
Lookup table identifying available arcade titles.
- **`game_id`** `INTEGER PRIMARY KEY AUTOINCREMENT`: Unique game identifier.
- **`game_name`** `TEXT UNIQUE NOT NULL`: Title of the arcade game (`Flappy Bird`, `Dino Runner`, `Snake`).
- **`description`** `TEXT`: Overview and instructions for the game.

### Table 3: `game_sessions`
Transaction log storing every completed gameplay round.
- **`session_id`** `INTEGER PRIMARY KEY AUTOINCREMENT`: Unique session identifier.
- **`player_id`** `INTEGER NOT NULL`: References `players(player_id)` on foreign key constraint.
- **`game_id`** `INTEGER NOT NULL`: References `games(game_id)` on foreign key constraint.
- **`score`** `INTEGER NOT NULL CHECK(score >= 0)`: Final verified score attained.
- **`duration_seconds`** `INTEGER`: Total active gameplay duration in seconds.
- **`played_at`** `DATETIME DEFAULT CURRENT_TIMESTAMP`: Exact session completion timestamp.

---

## 3. Relationships and Cardinality
- **Player to Game Sessions (1 : N)**: One player can play zero or many game sessions. Each session belongs to exactly one registered player.
- **Game to Game Sessions (1 : N)**: One arcade game can be played across zero or many sessions. Each session represents gameplay of exactly one specific game title.

---

## 4. Normalization Analysis
- **First Normal Form (1NF)**: All column values are atomic (indivisible). Each table has a designated primary key. No repeating groups.
- **Second Normal Form (2NF)**: All non-key attributes are fully functionally dependent on the primary key, eliminating partial dependencies.
- **Third Normal Form (3NF)**: Transitive dependencies are removed. Game names and descriptions reside exclusively in `games`; player metadata resides exclusively in `players`. `game_sessions` stores only foreign key references.

---

## 5. Constraints and Data Integrity
1. **Primary Key Constraints**: `player_id`, `game_id`, and `session_id` guarantee entity integrity.
2. **Foreign Key Enforcement**: `player_id` and `game_id` in `game_sessions` reject orphaned records.
3. **Domain & Check Constraints**: `score INTEGER NOT NULL CHECK(score >= 0)` rejects negative score inputs.
4. **Unique Constraints**: `username UNIQUE` prevents duplicate player accounts; `game_name UNIQUE` prevents duplicate game catalog entries.
5. **Temporal Defaults**: `DEFAULT CURRENT_TIMESTAMP` records exact UTC timestamps automatically.

---

## 6. Indexing Strategy
To optimize query performance across large session histories and leaderboard requests, composite and single-column B-tree indexes are defined:
- **`idx_sessions_player_id`** ON `game_sessions(player_id)`: Accelerates player history lookups (`WHERE player_id = ?`).
- **`idx_sessions_game_id`** ON `game_sessions(game_id)`: Accelerates per-game leaderboard filtering (`WHERE game_id = ?`).
- **`idx_sessions_score`** ON `game_sessions(score)`: Speeds up leaderboard ranking and max score aggregations (`ORDER BY score DESC`).
- **`idx_sessions_played_at`** ON `game_sessions(played_at)`: Optimizes chronological history sorting (`ORDER BY played_at DESC`).

---

## 7. Prepared Statements and Security
All database operations utilize pre-compiled SQLite prepared statements through `better-sqlite3`:
- SQL statements are compiled once and parameterized using `?` placeholders.
- Complete protection against SQL injection attacks.
- High throughput execution with cached execution plans.
