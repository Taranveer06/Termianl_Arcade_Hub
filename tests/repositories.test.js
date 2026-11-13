'use strict';

const assert = require('assert');
const playerRepo = require('../src/database/playerRepository');
const gameRepo = require('../src/database/gameRepository');
const sessionRepo = require('../src/database/sessionRepository');
const statsRepo = require('../src/database/statisticsRepository');
const { initializeDatabase } = require('../src/database/initialize');
const { getDb } = require('../src/database/connection');

console.log('🧪 Testing Repositories with live DB connection...');

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

// Test stats
const total = statsRepo.getTotalGamesPlayed();
assert(total >= 1, 'Total games played should be >= 1');
const high = statsRepo.getHighestScore();
assert(high >= 88);
console.log('  ✔ statisticsRepository aggregate queries work correctly');

// Test game module loading
assert(typeof require('../src/games/flappyBird').play === 'function');
assert(typeof require('../src/games/dinoRunner').play === 'function');
assert(typeof require('../src/games/snake').play === 'function');
console.log('  ✔ All three game modules export a valid play() function');

console.log('\n🎉 ALL REPOSITORY INTEGRATION TESTS PASSED!\n');
