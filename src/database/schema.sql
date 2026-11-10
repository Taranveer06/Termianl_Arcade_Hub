-- Players table
CREATE TABLE IF NOT EXISTS players (
  player_id  INTEGER PRIMARY KEY AUTOINCREMENT,
  username   TEXT    UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Games table
CREATE TABLE IF NOT EXISTS games (
  game_id     INTEGER PRIMARY KEY AUTOINCREMENT,
  game_name   TEXT    UNIQUE NOT NULL,
  description TEXT
);

-- Game sessions table
CREATE TABLE IF NOT EXISTS game_sessions (
  session_id       INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id        INTEGER NOT NULL REFERENCES players(player_id),
  game_id          INTEGER NOT NULL REFERENCES games(game_id),
  score            INTEGER NOT NULL CHECK(score >= 0),
  duration_seconds INTEGER,
  played_at        DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_player_id ON game_sessions(player_id);
CREATE INDEX IF NOT EXISTS idx_sessions_game_id   ON game_sessions(game_id);
CREATE INDEX IF NOT EXISTS idx_sessions_score     ON game_sessions(score);
CREATE INDEX IF NOT EXISTS idx_sessions_played_at ON game_sessions(played_at);

