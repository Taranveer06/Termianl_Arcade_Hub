'use strict';
const { getDb } = require('./connection');

function createPlayer(username) {
  const db = getDb();
  const stmt = db.prepare('INSERT INTO players (username) VALUES (?)');
  const result = stmt.run(username);
  return getPlayerById(result.lastInsertRowid);
}

function getPlayerById(playerId) {
  const db = getDb();
  return db.prepare('SELECT * FROM players WHERE player_id = ?').get(playerId) || null;
}

function getPlayerByUsername(username) {
  const db = getDb();
  return db.prepare('SELECT * FROM players WHERE username = ?').get(username) || null;
}

function getOrCreatePlayer(username) {
  const existing = getPlayerByUsername(username);
  if (existing) return existing;
  return createPlayer(username);
}

function getAllPlayers() {
  const db = getDb();
  return db.prepare('SELECT * FROM players ORDER BY created_at DESC').all();
}

module.exports = { createPlayer, getPlayerByUsername, getOrCreatePlayer, getAllPlayers };
