# SQL Queries Documentation — Terminal Arcade Hub

This document catalogs the actual production SQL queries executed by the Terminal Arcade Hub database repositories (`src/database/`), explaining relational database concepts, joins, aggregations, prepared statements, and constraints.

---

## 1. Table Creation DDL with Constraints & Indexes

```sql
CREATE TABLE IF NOT EXISTS players (
  player_id  INTEGER PRIMARY KEY AUTOINCREMENT,
  username   TEXT    UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS games (
  game_id     INTEGER PRIMARY KEY AUTOINCREMENT,
  game_name   TEXT    UNIQUE NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS game_sessions (
  session_id       INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id        INTEGER NOT NULL REFERENCES players(player_id),
  game_id          INTEGER NOT NULL REFERENCES games(game_id),
  score            INTEGER NOT NULL CHECK(score >= 0),
  duration_seconds INTEGER,
  played_at        DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_player_id ON game_sessions(player_id);
CREATE INDEX IF NOT EXISTS idx_sessions_game_id   ON game_sessions(game_id);
CREATE INDEX IF NOT EXISTS idx_sessions_score     ON game_sessions(score);
CREATE INDEX IF NOT EXISTS idx_sessions_played_at ON game_sessions(played_at);
```
**Explanation**:
- Defines entity models with primary keys and constraints.
- Foreign keys ensure referential integrity between sessions, players, and games.
- Domain constraint `CHECK(score >= 0)` rejects negative values at the engine level.
- B-tree indexes accelerate filtering and sort operations.

---

## 2. Idempotent Catalog Seeding

```sql
INSERT OR IGNORE INTO games (game_name, description) VALUES (?, ?);
```
**Explanation**: Uses parameterized prepared statements with `INSERT OR IGNORE` to safely seed default game records without throwing unique constraint violations if records already exist.

---

## 3. Player Registration and Retrieval

### Create Player
```sql
INSERT INTO players (username) VALUES (?);
```

### Lookup Player by Username
```sql
SELECT * FROM players WHERE username = ?;
```
**Explanation**: Used during initial startup login. If `getPlayerByUsername()` returns null, `createPlayer()` inserts a new row and retrieves the generated `player_id`.

---

## 4. Game Session Persistence

```sql
INSERT INTO game_sessions (player_id, game_id, score, duration_seconds)
VALUES (?, ?, ?, ?);
```
**Explanation**: Persists completed gameplay rounds immediately upon Game Over. Captures the player foreign key, game foreign key, validated final score, and calculated duration.

---

## 5. Global Leaderboard Query (3-Table INNER JOIN + ORDER BY + LIMIT)

```sql
SELECT
    gs.session_id,
    gs.score,
    gs.duration_seconds,
    gs.played_at,
    p.username,
    g.game_name
FROM game_sessions gs
JOIN players p ON p.player_id = gs.player_id
JOIN games   g ON g.game_id   = gs.game_id
WHERE gs.game_id = ?
ORDER BY gs.score DESC
LIMIT 5;
```
**Explanation**:
- Performs an `INNER JOIN` across `game_sessions`, `players`, and `games`.
- Filters on `game_id` to generate isolated leaderboards for Flappy Bird, Dino Runner, and Snake.
- Ranks records in descending order (`ORDER BY gs.score DESC`).
- Constrains output to the top 5 high scores via `LIMIT 5`.

---

## 6. Player Personal History Query (2-Table JOIN + ORDER BY)

```sql
SELECT
    gs.session_id,
    gs.score,
    gs.duration_seconds,
    gs.played_at,
    g.game_name
FROM game_sessions gs
JOIN games g ON g.game_id = gs.game_id
WHERE gs.player_id = ?
ORDER BY gs.played_at DESC;
```
**Explanation**:
- Retrieves chronological game history for the currently logged-in player.
- Joins with `games` table to resolve human-readable game titles.
- Sorts by timestamp descending (`played_at DESC`) so the most recent games appear first.

---

## 7. Statistical Aggregate Queries

### Total Games Played
```sql
SELECT COUNT(*) AS total FROM game_sessions;
```

### Highest Score Across All Games
```sql
SELECT MAX(score) AS max_score FROM game_sessions;
```

### Average Score (Overall or Per Game)
```sql
SELECT AVG(score) AS avg_score FROM game_sessions WHERE game_id = ?;
```

### Most Played Game (GROUP BY + COUNT + ORDER BY LIMIT)
```sql
SELECT g.game_name, COUNT(*) AS play_count
FROM game_sessions gs
JOIN games g ON g.game_id = gs.game_id
GROUP BY gs.game_id
ORDER BY play_count DESC
LIMIT 1;
```

### Per-Game Comprehensive Aggregates (LEFT JOIN + GROUP BY + MULTIPLE AGGREGATES)
```sql
SELECT
    g.game_name,
    COUNT(gs.session_id)         AS sessions,
    ROUND(AVG(gs.score), 1)      AS avg_score,
    MAX(gs.score)                AS max_score,
    COUNT(DISTINCT gs.player_id) AS unique_players
FROM games g
LEFT JOIN game_sessions gs ON gs.game_id = g.game_id
GROUP BY g.game_id
ORDER BY g.game_id;
```
**Explanation**:
- Demonstrates advanced SQL aggregation combining `COUNT()`, `AVG()`, `MAX()`, and `COUNT(DISTINCT)`.
- Uses `LEFT JOIN` so games with 0 recorded sessions still appear in the catalog table with null or 0 counts.
- `GROUP BY g.game_id` aggregates metrics per title.
- `ROUND(..., 1)` formats decimal averages for clean terminal rendering.

---

## 8. Player Personal High Scores and Stats

### Player High Score for Specific Game
```sql
SELECT MAX(score) AS high_score
FROM game_sessions
WHERE player_id = ? AND game_id = ?;
```
**Explanation**: Retrieves the single highest score achieved by a specific player in a given game, returning 0 if no games have been played.

### Player All Game High Scores (LEFT JOIN + GROUP BY)
```sql
SELECT g.game_name, COALESCE(MAX(gs.score), 0) AS high_score
FROM games g
LEFT JOIN game_sessions gs ON gs.game_id = g.game_id AND gs.player_id = ?
GROUP BY g.game_id
ORDER BY g.game_id;
```
**Explanation**: Uses a `LEFT JOIN` on `games` constrained to `player_id` so that all seeded games are returned with either the player's personal best or 0 if unplayed.

### Player Personal Summary & Breakdown
```sql
SELECT
  COUNT(*) AS total_sessions,
  COALESCE(ROUND(AVG(score), 1), 0) AS avg_score,
  COALESCE(MAX(score), 0) AS max_score
FROM game_sessions
WHERE player_id = ?;
```
**Explanation**: Aggregates the total rounds, overall average score, and personal best across all games for the logged-in player.
