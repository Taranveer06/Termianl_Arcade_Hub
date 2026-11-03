'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const TEST_DB_PATH = path.join(__dirname, 'test_arcade.db');
const SCHEMA_PATH = path.join(__dirname, '../src/database/schema.sql');

function cleanup() {
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  if (fs.existsSync(TEST_DB_PATH + '-wal')) fs.unlinkSync(TEST_DB_PATH + '-wal');
  if (fs.existsSync(TEST_DB_PATH + '-shm')) fs.unlinkSync(TEST_DB_PATH + '-shm');
}

console.log('🧪 Starting Database & Integration Test Suite...\n');

cleanup();

let db = new Database(TEST_DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// 1. Database initialization
console.log('Test 1: Database initialization & schema creation...');
const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
db.exec(schema);

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
const tableNames = tables.map(t => t.name);
assert(tableNames.includes('players'), 'players table must exist');
assert(tableNames.includes('games'), 'games table must exist');
assert(tableNames.includes('game_sessions'), 'game_sessions table must exist');
console.log('  ✔ Tables created successfully: players, games, game_sessions');

// 2. Game seeding & Duplicate prevention
console.log('\nTest 2: Game seeding & duplicate game prevention...');
const insertGame = db.prepare('INSERT OR IGNORE INTO games (game_name, description) VALUES (?, ?)');
insertGame.run('Flappy Bird', 'Fly through pipes');
insertGame.run('Dino Runner', 'Jump over obstacles');
insertGame.run('Snake', 'Eat food and grow');

// Attempt duplicate seed
insertGame.run('Flappy Bird', 'Duplicate');
const gameCount = db.prepare('SELECT COUNT(*) as count FROM games').get().count;
assert.strictEqual(gameCount, 3, 'There should be exactly 3 seeded games');
console.log('  ✔ 3 games seeded; duplicate seed safely ignored');

// 3. Player creation
console.log('\nTest 3: Player creation...');
const insertPlayer = db.prepare('INSERT INTO players (username) VALUES (?)');
const p1Res = insertPlayer.run('Alice');
assert(p1Res.lastInsertRowid > 0, 'Player ID must be generated');
const p1 = db.prepare('SELECT * FROM players WHERE username = ?').get('Alice');
assert.strictEqual(p1.username, 'Alice');
console.log('  ✔ Player Alice created with ID:', p1.player_id);

// 4. Duplicate username handling
console.log('\nTest 4: Duplicate username rejection (UNIQUE constraint)...');
assert.throws(() => {
  insertPlayer.run('Alice');
}, /UNIQUE constraint failed/, 'Should reject duplicate username');
console.log('  ✔ Duplicate username correctly rejected');

// 5. Existing player retrieval
console.log('\nTest 5: Existing player retrieval...');
const retrieved = db.prepare('SELECT * FROM players WHERE username = ?').get('Alice');
assert.strictEqual(retrieved.player_id, p1.player_id);
console.log('  ✔ Existing player retrieved correctly');

// 6. Saving game sessions & saving zero scores
console.log('\nTest 6: Saving game sessions (including score of zero)...');
const insertSession = db.prepare(
  'INSERT INTO game_sessions (player_id, game_id, score, duration_seconds) VALUES (?, ?, ?, ?)'
);

const sZero = insertSession.run(p1.player_id, 1, 0, 5);
assert(sZero.lastInsertRowid > 0);
const zeroRec = db.prepare('SELECT * FROM game_sessions WHERE session_id = ?').get(sZero.lastInsertRowid);
assert.strictEqual(zeroRec.score, 0, 'Zero score must be recorded properly');
assert.strictEqual(zeroRec.duration_seconds, 5);
console.log('  ✔ Game session with score 0 saved successfully');

const sHigh = insertSession.run(p1.player_id, 1, 150, 45);
assert(sHigh.lastInsertRowid > 0);
console.log('  ✔ Game session with score 150 saved successfully');

// 7. Invalid score rejection (CHECK constraint score >= 0)
console.log('\nTest 7: Negative score rejection (CHECK constraint)...');
assert.throws(() => {
  insertSession.run(p1.player_id, 1, -10, 12);
}, /CHECK constraint failed/, 'Negative scores must be rejected by CHECK constraint');
console.log('  ✔ Negative score (-10) rejected by constraint');

// 8. Foreign key constraint enforcement
console.log('\nTest 8: Foreign key constraint enforcement...');
assert.throws(() => {
  insertSession.run(9999, 1, 50, 20); // Non-existent player
}, /FOREIGN KEY constraint failed/, 'Invalid player_id must fail foreign key check');
assert.throws(() => {
  insertSession.run(p1.player_id, 9999, 50, 20); // Non-existent game
}, /FOREIGN KEY constraint failed/, 'Invalid game_id must fail foreign key check');
console.log('  ✔ Foreign keys enforced for both player_id and game_id');

// 9. Leaderboard ordering & top-five limit
console.log('\nTest 9: Leaderboard ordering and Top-5 limit...');
const p2 = insertPlayer.run('Bob');
const p3 = insertPlayer.run('Charlie');
const p4 = insertPlayer.run('David');
const p5 = insertPlayer.run('Eve');
const p6 = insertPlayer.run('Frank');

insertSession.run(p2.lastInsertRowid, 1, 300, 60);
insertSession.run(p3.lastInsertRowid, 1, 200, 50);
insertSession.run(p4.lastInsertRowid, 1, 250, 55);
insertSession.run(p5.lastInsertRowid, 1, 100, 30);
insertSession.run(p6.lastInsertRowid, 1, 400, 80);

const topScoresQuery = db.prepare(`
  SELECT gs.score, p.username, g.game_name
  FROM game_sessions gs
  JOIN players p ON p.player_id = gs.player_id
  JOIN games g ON g.game_id = gs.game_id
  WHERE gs.game_id = ?
  ORDER BY gs.score DESC
  LIMIT 5
`);
const top5 = topScoresQuery.all(1);
assert.strictEqual(top5.length, 5, 'Leaderboard must return at most 5 records');
assert.strictEqual(top5[0].score, 400, 'Top score must be highest (400 by Frank)');
assert.strictEqual(top5[0].username, 'Frank');
assert.strictEqual(top5[1].score, 300, 'Second score must be 300');
assert.strictEqual(top5[2].score, 250, 'Third score must be 250');
console.log('  ✔ Leaderboard returned 5 ordered scores descending: 400, 300, 250, 200, 150');

// 10. Player history
console.log('\nTest 10: Player history query...');
const playerHistoryQuery = db.prepare(`
  SELECT gs.score, gs.duration_seconds, gs.played_at, g.game_name
  FROM game_sessions gs
  JOIN games g ON g.game_id = gs.game_id
  WHERE gs.player_id = ?
  ORDER BY gs.played_at DESC
`);
const aliceHistory = playerHistoryQuery.all(p1.player_id);
assert.strictEqual(aliceHistory.length, 2, 'Alice should have 2 sessions');
assert(aliceHistory[0].played_at !== undefined, 'played_at timestamp must be present');
console.log('  ✔ Player history correctly retrieved with timestamps');

// 11. Statistics calculations (COUNT, AVG, MAX, GROUP BY)
console.log('\nTest 11: Statistical aggregates...');
const totalSessions = db.prepare('SELECT COUNT(*) as count FROM game_sessions').get().count;
assert.strictEqual(totalSessions, 7, 'Total sessions should equal 7');

const maxScore = db.prepare('SELECT MAX(score) as max FROM game_sessions').get().max;
assert.strictEqual(maxScore, 400);

const avgScore = db.prepare('SELECT ROUND(AVG(score), 1) as avg FROM game_sessions').get().avg;
assert(avgScore > 0, 'Average score must be calculated');
console.log(`  ✔ Aggregates verified: Total Sessions = ${totalSessions}, Max = ${maxScore}, Avg = ${avgScore}`);

// 12. Database persistence after restart
console.log('\nTest 12: Database persistence across connection close/restart...');
db.close();

// Reopen database from disk
const reopenedDb = new Database(TEST_DB_PATH);
reopenedDb.pragma('foreign_keys = ON');

const persistedCount = reopenedDb.prepare('SELECT COUNT(*) as count FROM game_sessions').get().count;
assert.strictEqual(persistedCount, 7, 'All 7 sessions must persist after reconnecting');
const persistedPlayer = reopenedDb.prepare('SELECT * FROM players WHERE username = ?').get('Alice');
assert.strictEqual(persistedPlayer.username, 'Alice');
reopenedDb.close();
console.log('  ✔ Data persisted completely across database connection restart');

cleanup();

console.log('\n🎉 ALL 12 AUTOMATED TESTS PASSED SUCCESSFULLY!\n');
