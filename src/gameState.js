'use strict';

const gameRepository = require('./database/gameRepository');
const sessionRepository = require('./database/sessionRepository');

let currentPlayer = null;

function setCurrentPlayer(player) {
  currentPlayer = player;
}

function getCurrentPlayer() {
  return currentPlayer;
}

function recordCompletedSession(gameName, score, durationSeconds) {
  try {
    if (!currentPlayer || !currentPlayer.player_id) return null;
    const game = gameRepository.getGameByName(gameName);
    if (!game) return null;

    const session = sessionRepository.saveSession({
      playerId: currentPlayer.player_id,
      gameId: game.game_id,
      score: Math.max(0, parseInt(score, 10) || 0),
      durationSeconds: Math.max(0, parseInt(durationSeconds, 10) || 0)
    });
    return session;
  } catch (err) {
    // Gracefully catch errors so database issues never crash the arcade
    return null;
  }
}

module.exports = {
  setCurrentPlayer,
  getCurrentPlayer,
  recordCompletedSession
};
