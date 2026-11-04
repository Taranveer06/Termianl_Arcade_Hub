'use strict';
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '../../data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DEFAULT_DB_PATH = path.join(DATA_DIR, 'arcade.db');

let _db = null;
let _customDbPath = null;

function setDbPath(customPath) {
  if (_db) {
    _db.close();
    _db = null;
  }
  _customDbPath = customPath;
}

function getDbPath() {
  return _customDbPath || process.env.ARCADE_DB_PATH || DEFAULT_DB_PATH;
}

function getDb() {
  if (!_db) {
    const dbPath = getDbPath();
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    _db = new Database(dbPath);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
  }
  return _db;
}

function closeDb() {
  if (_db) {
    _db.close();
    _db = null;
  }
}

module.exports = { getDb, closeDb, setDbPath, getDbPath, DB_PATH: DEFAULT_DB_PATH };
