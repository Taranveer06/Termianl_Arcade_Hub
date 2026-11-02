'use strict';
const { getDb } = require('./connection');

function saveSession({ playerId, gameId, score, durationSeconds }) {
  const db = getDb();
  const stmt = db.prepare(
    'INSERT INTO game_sessions (player_id, game_id, score, duration_seconds) VALUES (?, ?, ?, ?)'
  );
  const result = stmt.run(playerId, gameId, score, durationSeconds || null);
  return db.prepare('SELECT * FROM game_sessions WHERE session_id = ?').get(result.lastInsertRowid);
}

function getTopScores(gameId, limit = 5) {
  const db = getDb();
  return db.prepare(`
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
    LIMIT ?
  `).all(gameId, limit);
}

function getPlayerHistory(playerId) {
  const db = getDb();
  return db.prepare(`
    SELECT
      gs.session_id,
      gs.score,
      gs.duration_seconds,
      gs.played_at,
      g.game_name
    FROM game_sessions gs
    JOIN games g ON g.game_id = gs.game_id
    WHERE gs.player_id = ?
    ORDER BY gs.played_at DESC
  `).all(playerId);
}

function getRecentSessions(limit = 10) {
  const db = getDb();
  return db.prepare(`
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
    ORDER BY gs.played_at DESC
    LIMIT ?
  `).all(limit);
}

module.exports = { saveSession, getTopScores, getPlayerHistory, getRecentSessions };
