'use strict';

const fs = require('fs');
const path = require('path');

const SCORES_FILE = path.join(__dirname, '..', 'scores.json');

const DEFAULT_SCORES = { flappyBird: [], dinoRunner: [], snake: [] };

function loadScores() {
  try {
    const raw = fs.readFileSync(SCORES_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    // Ensure all keys exist
    return Object.assign({}, DEFAULT_SCORES, parsed);
  } catch (e) {
    return { flappyBird: [], dinoRunner: [], snake: [] };
  }
}

function saveScores(scores) {
  fs.writeFileSync(SCORES_FILE, JSON.stringify(scores, null, 2), 'utf8');
}

function addScore(game, name, score) {
  const scores = loadScores();
  if (!scores[game]) scores[game] = [];
  scores[game].push({ name, score, date: new Date().toLocaleDateString() });
  scores[game].sort((a, b) => b.score - a.score);
  scores[game] = scores[game].slice(0, 5);
  saveScores(scores);
  return scores;
}

function getTopScores(game) {
  const scores = loadScores();
  return (scores[game] || []).slice(0, 5);
}

module.exports = {
  SCORES_FILE,
  loadScores,
  saveScores,
  addScore,
  getTopScores
};
