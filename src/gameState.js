'use strict';

const gameRepository = require('./database/gameRepository');
const sessionRepository = require('./database/sessionRepository');
const statisticsRepository = require('./database/statisticsRepository');

let currentPlayer = null;

function setCurrentPlayer(player) {
  currentPlayer = player;
}

function getCurrentPlayer() {
  return currentPlayer;
}

function recordCompletedSession(gameName, score, durationSeconds) {
  if (!currentPlayer || !currentPlayer.player_id) {
    console.error('[GameState] Cannot record session: No active player set.');
    return null;
  }

  const game = gameRepository.getGameByName(gameName);
  if (!game) {
    console.error(`[GameState] Cannot record session: Game "${gameName}" not found in database.`);
    return null;
  }

  const parsedScore = parseInt(score, 10);
  if (isNaN(parsedScore) || parsedScore < 0) {
    console.error(`[GameState] Invalid score "${score}" rejected for game "${gameName}".`);
    return null;
  }

  try {
    const session = sessionRepository.saveSession({
      playerId: currentPlayer.player_id,
      gameId: game.game_id,
      score: parsedScore,
      durationSeconds: Math.max(0, parseInt(durationSeconds, 10) || 0)
    });
    return session;
  } catch (err) {
    console.error(`[GameState] Database error recording session for "${gameName}":`, err.message);
    throw err;
  }
}

function getPlayerHighScore(gameName) {
  if (!currentPlayer || !currentPlayer.player_id) return 0;
  return sessionRepository.getPlayerBestByGameName(currentPlayer.player_id, gameName);
}

function getAllGameHighScores() {
  if (!currentPlayer || !currentPlayer.player_id) return {};
  return sessionRepository.getPlayerAllHighScores(currentPlayer.player_id);
}

function getGlobalTopScores(gameName, limit = 5) {
  const game = gameRepository.getGameByName(gameName);
  if (!game) return [];
  return sessionRepository.getTopScores(game.game_id, limit);
}

function getPlayerStats() {
  if (!currentPlayer || !currentPlayer.player_id) return null;
  return statisticsRepository.getPlayerStatistics(currentPlayer.player_id);
}

module.exports = {
  setCurrentPlayer,
  getCurrentPlayer,
  recordCompletedSession,
  getPlayerHighScore,
  getAllGameHighScores,
  getGlobalTopScores,
  getPlayerStats
};
