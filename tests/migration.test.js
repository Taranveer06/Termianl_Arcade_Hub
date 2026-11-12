'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { setDbPath, closeDb, getDb } = require('../src/database/connection');
const { migrateScores } = require('../src/database/migrateScores');
const playerRepo = require('../src/database/playerRepository');
const gameRepo = require('../src/database/gameRepository');
const sessionRepo = require('../src/database/sessionRepository');

const TEST_MIGRATE_DB = path.join(__dirname, 'test_migrate.db');
const TEST_SCORES_JSON = path.join(__dirname, 'test_scores.json');
const SCHEMA_PATH = path.join(__dirname, '../src/database/schema.sql');

function cleanup() {
  closeDb();
  if (fs.existsSync(TEST_MIGRATE_DB)) fs.unlinkSync(TEST_MIGRATE_DB);
  if (fs.existsSync(TEST_MIGRATE_DB + '-wal')) fs.unlinkSync(TEST_MIGRATE_DB + '-wal');
  if (fs.existsSync(TEST_MIGRATE_DB + '-shm')) fs.unlinkSync(TEST_MIGRATE_DB + '-shm');
  if (fs.existsSync(TEST_SCORES_JSON)) fs.unlinkSync(TEST_SCORES_JSON);
}

cleanup();
setDbPath(TEST_MIGRATE_DB);

console.log('🧪 Starting Migration Test Suite...\n');

// 1. Initialize schema and seed games directly without auto-migrating default scores.json
const db = getDb();
const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
db.exec(schema);

const insertGame = db.prepare('INSERT OR IGNORE INTO games (game_name, description) VALUES (?, ?)');
insertGame.run('Flappy Bird', 'Fly through pipes');
insertGame.run('Dino Runner', 'Jump over obstacles');
insertGame.run('Snake', 'Eat food and grow');

// 2. Prepare sample legacy scores.json
const legacyData = {
  flappyBird: [
    { name: 'SkyAce', score: 42, date: '11/14/2026' }
  ],
  dinoRunner: [
    { name: 'nakamakwmem', score: 106, date: '11/14/2026' },
    { name: 'DinoKing', score: 75, date: '11/14/2026' }
  ],
  snake: [
    { name: 'ViperMaster', score: 120, date: '11/14/2026' }
  ]
};
fs.writeFileSync(TEST_SCORES_JSON, JSON.stringify(legacyData, null, 2), 'utf8');

// 3. Run migration
const result = migrateScores(TEST_SCORES_JSON);
console.log('Test 1: Migrate legacy records from JSON into SQLite...');
assert.strictEqual(result.migrated, 4, 'Should migrate 4 legacy records');
assert.strictEqual(result.skipped, 0, 'Should skip 0 on first run');
console.log('  ✔ Successfully migrated 4 records');

// 4. Verify migrated players
console.log('\nTest 2: Verify players created in SQLite...');
const skyAce = playerRepo.getPlayerByUsername('SkyAce');
assert(skyAce && skyAce.username === 'SkyAce');
const naka = playerRepo.getPlayerByUsername('nakamakwmem');
assert(naka && naka.username === 'nakamakwmem');
const dinoKing = playerRepo.getPlayerByUsername('DinoKing');
assert(dinoKing && dinoKing.username === 'DinoKing');
const viper = playerRepo.getPlayerByUsername('ViperMaster');
assert(viper && viper.username === 'ViperMaster');
console.log('  ✔ All legacy players present in SQLite');

// 5. Verify sessions
console.log('\nTest 3: Verify sessions and scores in SQLite...');
const dinoGame = gameRepo.getGameByName('Dino Runner');
const topDino = sessionRepo.getTopScores(dinoGame.game_id, 5);
assert.strictEqual(topDino[0].username, 'nakamakwmem');
assert.strictEqual(topDino[0].score, 106);
console.log('  ✔ Top score in Dino Runner is 106 by nakamakwmem');

// 6. Test Idempotency (run migration again, should not create duplicates)
console.log('\nTest 4: Verify idempotency (duplicate migration prevention)...');
const rerunResult = migrateScores(TEST_SCORES_JSON);
assert.strictEqual(rerunResult.migrated, 0, 'Should migrate 0 duplicate records');
assert.strictEqual(rerunResult.skipped, 4, 'Should skip 4 existing records');
console.log('  ✔ Repeated migration safely skipped already imported records');

cleanup();
console.log('\n🎉 ALL MIGRATION TESTS PASSED!\n');
