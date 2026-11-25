'use strict';
const { getDb } = require('./connection');

function getTotalGamesPlayed() {
  const db = getDb();
  const row = db.prepare('SELECT COUNT(*) AS total FROM game_sessions').get();
  return row ? row.total : 0;
}

function getAverageScore(gameId = null) {
  const db = getDb();
  if (gameId !== null) {
    const row = db.prepare('SELECT AVG(score) AS avg_score FROM game_sessions WHERE game_id = ?').get(gameId);
    return row ? (row.avg_score || 0) : 0;
  }
  const row = db.prepare('SELECT AVG(score) AS avg_score FROM game_sessions').get();
  return row ? (row.avg_score || 0) : 0;
}

function getHighestScore(gameId = null) {
  const db = getDb();
  if (gameId !== null) {
    const row = db.prepare('SELECT MAX(score) AS max_score FROM game_sessions WHERE game_id = ?').get(gameId);
    return row ? (row.max_score || 0) : 0;
  }
  const row = db.prepare('SELECT MAX(score) AS max_score FROM game_sessions').get();
  return row ? (row.max_score || 0) : 0;
}

function getMostPlayedGame() {
  const db = getDb();
  const row = db.prepare(`
    SELECT g.game_name, COUNT(*) AS play_count
    FROM game_sessions gs
    JOIN games g ON g.game_id = gs.game_id
    GROUP BY gs.game_id
    ORDER BY play_count DESC
    LIMIT 1
  `).get();
  return row ? row.game_name : 'N/A';
}

function getGameStatistics() {
  const db = getDb();
  return db.prepare(`
    SELECT
      g.game_name,
      COUNT(gs.session_id)        AS sessions,
      ROUND(AVG(gs.score), 1)     AS avg_score,
      MAX(gs.score)               AS max_score,
      COUNT(DISTINCT gs.player_id) AS unique_players
    FROM games g
    LEFT JOIN game_sessions gs ON gs.game_id = g.game_id
    GROUP BY g.game_id
    ORDER BY g.game_id
  `).all();
}

function exportSessionSummary() {
  const stats = getGameStatistics();
  const total = getTotalGamesPlayed();
  return {
    generatedAt: new Date().toISOString(),
    totalSessions: total,
    games: stats
  };
}

module.exports = {
  getTotalGamesPlayed,
  getAverageScore,
  getHighestScore,
  getMostPlayedGame,
  getGameStatistics,
  exportSessionSummary
};
