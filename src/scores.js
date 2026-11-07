'use strict';

const fs = require('fs');
const path = require('path');
const { getDb } = require('./database/connection');
const { getOrCreatePlayer } = require('./database/playerRepository');
const { getGameByName } = require('./database/gameRepository');
const { saveSession, getTopScores: dbGetTopScores } = require('./database/sessionRepository');

const SCORES_FILE = path.join(__dirname, '..', 'scores.json');

const GAME_NAME_MAP = {
  flappyBird: 'Flappy Bird',
  dinoRunner: 'Dino Runner',
  snake: 'Snake'
};

const DEFAULT_SCORES = { flappyBird: [], dinoRunner: [], snake: [] };

function loadScores() {
  // SQLite is the single source of truth for scores
  try {
    const result = { flappyBird: [], dinoRunner: [], snake: [] };
    for (const [key, title] of Object.entries(GAME_NAME_MAP)) {
      const game = getGameByName(title);
      if (game) {
        const top = dbGetTopScores(game.game_id, 5);
        result[key] = top.map(t => ({
          name: t.username,
          score: t.score,
          date: t.played_at ? t.played_at.slice(0, 10) : ''
        }));
      }
    }
    return result;
  } catch (_) {
    // Fallback to json if DB not yet initialized
    try {
      if (fs.existsSync(SCORES_FILE)) {
        return Object.assign({}, DEFAULT_SCORES, JSON.parse(fs.readFileSync(SCORES_FILE, 'utf8')));
      }
    } catch (e) {}
    return { flappyBird: [], dinoRunner: [], snake: [] };
  }
}

function saveScores(scores) {
  // Sync backup to disk to preserve user data
  try {
    fs.writeFileSync(SCORES_FILE, JSON.stringify(scores, null, 2), 'utf8');
  } catch (err) {
    console.error('[Scores] Error syncing scores.json:', err.message);
  }
}

function addScore(gameKey, name, score) {
  const gameTitle = GAME_NAME_MAP[gameKey] || gameKey;
  try {
    const player = getOrCreatePlayer(name || 'Player');
    const game = getGameByName(gameTitle);
    if (player && game) {
      saveSession({
        playerId: player.player_id,
        gameId: game.game_id,
        score: Math.max(0, parseInt(score, 10) || 0),
        durationSeconds: 30
      });
    }
  } catch (err) {
    console.error(`[Scores] Database error adding score for ${gameKey}:`, err.message);
  }

  const latest = loadScores();
  saveScores(latest);
  return latest;
}

function getTopScores(gameKey) {
  const gameTitle = GAME_NAME_MAP[gameKey] || gameKey;
  try {
    const game = getGameByName(gameTitle);
    if (game) {
      const top = dbGetTopScores(game.game_id, 5);
      return top.map(t => ({
        name: t.username,
        score: t.score,
        date: t.played_at ? t.played_at.slice(0, 10) : ''
      }));
    }
  } catch (_) {}

  const scores = loadScores();
  return (scores[gameKey] || []).slice(0, 5);
}

module.exports = {
  SCORES_FILE,
  loadScores,
  saveScores,
  addScore,
  getTopScores
};
