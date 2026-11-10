'use strict';
const path = require('path');
const fs = require('fs');
const { getDb } = require('./connection');

const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

function initializeDatabase() {
  const db = getDb();
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  db.exec(schema);

  // Seed the 3 games
  const insert = db.prepare(
    'INSERT OR IGNORE INTO games (game_name, description) VALUES (?, ?)'
  );

  insert.run('Flappy Bird', 'Navigate a bird through pipes by flapping its wings. Each pipe cleared scores a point.');
  insert.run('Dino Runner', 'Run as far as possible avoiding obstacles. Speed increases over time — distance is your score.');
  insert.run('Snake', 'Eat food to grow your snake as long as possible. Avoid walls and yourself. Each food = 10 points.');
}

module.exports = { initializeDatabase };
