'use strict';

const fs = require('fs');
const path = require('path');
const { getOrCreatePlayer } = require('./playerRepository');
const { getGameByName } = require('./gameRepository');
const { saveSession } = require('./sessionRepository');
const { getDb } = require('./connection');

const DEFAULT_SCORES_PATH = path.join(__dirname, '../../scores.json');

const GAME_KEY_MAP = {
  flappyBird: 'Flappy Bird',
  dinoRunner: 'Dino Runner',
  snake: 'Snake'
};

function migrateScores(scoresFilePath = DEFAULT_SCORES_PATH) {
  if (!fs.existsSync(scoresFilePath)) {
    return { migrated: 0, skipped: 0, reason: 'File does not exist' };
  }

  let rawData;
  try {
    rawData = fs.readFileSync(scoresFilePath, 'utf8');
  } catch (err) {
    console.error(`[Migration] Could not read ${scoresFilePath}:`, err.message);
    return { migrated: 0, skipped: 0, error: err.message };
  }

  let parsed;
  try {
    parsed = JSON.parse(rawData);
  } catch (err) {
    console.error(`[Migration] Could not parse JSON in ${scoresFilePath}:`, err.message);
    return { migrated: 0, skipped: 0, error: err.message };
  }

  const db = getDb();
  let migratedCount = 0;
  let skippedCount = 0;

  for (const [key, gameTitle] of Object.entries(GAME_KEY_MAP)) {
    const list = parsed[key];
    if (!Array.isArray(list)) continue;

    const game = getGameByName(gameTitle);
    if (!game) continue;

    for (const entry of list) {
      const username = (entry.name || 'Player').trim();
      const score = Math.max(0, parseInt(entry.score, 10) || 0);

      // 1. Ensure player exists
      const player = getOrCreatePlayer(username);

      // 2. Check if a session already exists with this player, game, and score
      const existing = db.prepare(`
        SELECT session_id FROM game_sessions
        WHERE player_id = ? AND game_id = ? AND score = ?
      `).get(player.player_id, game.game_id, score);

      if (existing) {
        skippedCount++;
      } else {
        // Insert migrated session
        saveSession({
          playerId: player.player_id,
          gameId: game.game_id,
          score: score,
          durationSeconds: entry.duration || 30
        });
        migratedCount++;
      }
    }
  }

  return { migrated: migratedCount, skipped: skippedCount };
}

module.exports = { migrateScores, GAME_KEY_MAP };

