'use strict';
const { getDb } = require('./connection');

function getAllGames() {
  const db = getDb();
  return db.prepare('SELECT * FROM games ORDER BY game_id').all();
}

function getGameByName(gameName) {
  const db = getDb();
  return db.prepare('SELECT * FROM games WHERE game_name = ?').get(gameName) || null;
}

function getGameById(gameId) {
  const db = getDb();
  return db.prepare('SELECT * FROM games WHERE game_id = ?').get(gameId) || null;
}

module.exports = { getAllGames, getGameByName, getGameById };
