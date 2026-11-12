'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { setDbPath, closeDb, getDb } = require('../src/database/connection');

const TEST_REPO_DB = path.join(__dirname, 'test_repositories.db');

function cleanupDb() {
  closeDb();
  if (fs.existsSync(TEST_REPO_DB)) fs.unlinkSync(TEST_REPO_DB);
  if (fs.existsSync(TEST_REPO_DB + '-wal')) fs.unlinkSync(TEST_REPO_DB + '-wal');
  if (fs.existsSync(TEST_REPO_DB + '-shm')) fs.unlinkSync(TEST_REPO_DB + '-shm');
}

cleanupDb();
setDbPath(TEST_REPO_DB);

const playerRepo = require('../src/database/playerRepository');
const gameRepo = require('../src/database/gameRepository');
const sessionRepo = require('../src/database/sessionRepository');
const statsRepo = require('../src/database/statisticsRepository');
const { initializeDatabase } = require('../src/database/initialize');

console.log('🧪 Testing Repositories with isolated temporary DB...');

initializeDatabase();
const db = getDb();

// Test getAllGames
const games = gameRepo.getAllGames();
assert(games.length >= 3, 'Games must be seeded');
const flappy = gameRepo.getGameByName('Flappy Bird');
assert(flappy && flappy.game_name === 'Flappy Bird');
const dino = gameRepo.getGameByName('Dino Runner');
assert(dino && dino.game_name === 'Dino Runner');
const snake = gameRepo.getGameByName('Snake');
assert(snake && snake.game_name === 'Snake');
console.log('  ✔ gameRepository works correctly');

// Test getOrCreatePlayer
const testUser = 'RepoTester_' + Date.now();
const p1 = playerRepo.getOrCreatePlayer(testUser);
assert(p1 && p1.username === testUser);
const p2 = playerRepo.getOrCreatePlayer(testUser);
assert.strictEqual(p1.player_id, p2.player_id, 'Should return same player ID');
console.log('  ✔ playerRepository getOrCreatePlayer works correctly');

// Test saveSession
const sess = sessionRepo.saveSession({
  playerId: p1.player_id,
  gameId: flappy.game_id,
  score: 88,
  durationSeconds: 22
});
assert(sess && sess.score === 88);
console.log('  ✔ sessionRepository saveSession works correctly');

// Test personal high scores
const flappyHigh = sessionRepo.getPlayerHighScore(p1.player_id, flappy.game_id);
assert.strictEqual(flappyHigh, 88, 'Personal high score for Flappy Bird should be 88');

const allHighs = sessionRepo.getPlayerAllHighScores(p1.player_id);
assert.strictEqual(allHighs['Flappy Bird'], 88);
assert.strictEqual(allHighs['Dino Runner'], 0);
assert.strictEqual(allHighs['Snake'], 0);
console.log('  ✔ sessionRepository getPlayerHighScore & getPlayerAllHighScores work correctly');

// Test stats
const total = statsRepo.getTotalGamesPlayed();
assert(total >= 1, 'Total games played should be >= 1');
const high = statsRepo.getHighestScore();
assert(high >= 88);

const playerStats = statsRepo.getPlayerStatistics(p1.player_id);
assert.strictEqual(playerStats.totalSessions, 1);
assert.strictEqual(playerStats.maxScore, 88);
assert.strictEqual(playerStats.avgScore, 88);
console.log('  ✔ statisticsRepository aggregate and player queries work correctly');

// Test game module loading
assert(typeof require('../src/games/flappyBird').play === 'function');
assert(typeof require('../src/games/dinoRunner').play === 'function');
assert(typeof require('../src/games/snake').play === 'function');
console.log('  ✔ All three game modules export a valid play() function');

cleanupDb();
console.log('\n🎉 ALL REPOSITORY INTEGRATION TESTS PASSED!\n');
