'use strict';

// Set terminal title
process.stdout.write('\x1B]0;Terminal Arcade Hub\x07');

const { initializeDatabase } = require('./database/initialize');
const { getOrCreatePlayer } = require('./database/playerRepository');
const { closeDb } = require('./database/connection');
const renderer = require('./renderer');
const gameState = require('./gameState');
const menu = require('./menu');

function cleanup() {
  try {
    closeDb();
  } catch (_) {}
  process.stdout.write('\x1B[?25h'); // Show cursor
  process.stdout.write('\x1B[2J\x1B[H'); // Clear screen
  console.log('\nThanks for playing Terminal Arcade Hub! Goodbye!\n');
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', () => {
  process.stdout.write('\x1B[?25h');
});

function promptUsername() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      try { process.stdin.setRawMode(true); } catch (_) {}
    }
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    const { cols, rows } = renderer.getTerminalSize();
    renderer.clear();
    renderer.hideCursor();

    const boxW = Math.min(64, cols - 4);
    const boxH = 12;
    const boxX = Math.max(2, Math.floor((cols - boxW) / 2));
    const boxY = Math.max(2, Math.floor((rows - boxH) / 2));

    renderer.drawDoubleBox(boxX, boxY, boxW, boxH, renderer.colors.brightCyan);

    const title = '🕹️   T E R M I N A L   A R C A D E   H U B   🕹️';
    renderer.writeAt(boxX + Math.floor((boxW - title.length) / 2), boxY + 2, title, renderer.colors.brightYellow);

    const sub = '── RETRO COIN-OP AUTHENTICATION ──';
    renderer.writeAt(boxX + Math.floor((boxW - sub.length) / 2), boxY + 3, sub, renderer.colors.cyan);

    const promptText = 'ENTER YOUR PLAYER USERNAME:';
    renderer.writeAt(boxX + Math.floor((boxW - promptText.length) / 2), boxY + 5, promptText, renderer.colors.brightWhite);

    const hint = '(Press Enter to use default "Player"  |  Ctrl+C to Exit)';
    renderer.writeAt(boxX + Math.floor((boxW - hint.length) / 2), boxY + 6, hint, renderer.colors.dim);

    const inputStartX = boxX + Math.floor((boxW - 28) / 2);
    renderer.moveCursor(inputStartX, boxY + 8);
    renderer.showCursor();
    process.stdout.write('\x1B[' + renderer.colors.brightGreen + 'm> \x1B[0m');

    let input = '';

    function onData(chunk) {
      const ch = chunk.toString();
      for (const c of ch) {
        const code = c.charCodeAt(0);

        if (code === 3) {
          // Ctrl+C
          process.stdin.removeListener('data', onData);
          cleanup();
          return;
        }

        if (code === 13 || code === 10) {
          // Enter pressed
          process.stdin.removeListener('data', onData);
          renderer.hideCursor();

          if (process.stdin.isTTY) {
            try { process.stdin.setRawMode(true); } catch (_) {}
          }
          process.stdin.resume();

          const trimmed = input.trim();
          resolve(trimmed.length > 0 ? trimmed : 'Player');
          return;
        } else if (code === 127 || code === 8) {
          // Backspace
          if (input.length > 0) {
            input = input.slice(0, -1);
            process.stdout.write('\b \b');
          }
        } else if (code >= 32) {
          if (input.length < 18) {
            input += c;
            process.stdout.write('\x1B[' + renderer.colors.brightGreen + 'm' + c + '\x1B[0m');
          }
        }
      }
    }

    process.stdin.on('data', onData);
  });
}

async function start() {
  try {
    // 1. Initialize SQLite database and run migration if needed
    initializeDatabase();

    // 2. Prompt for username
    const username = await promptUsername();

    // 3. Create or retrieve player
    const player = getOrCreatePlayer(username);
    gameState.setCurrentPlayer(player);

    // 4. Launch main arcade menu
    await menu.showMainMenu(player);
  } catch (err) {
    console.error('Fatal initialization error:', err);
    cleanup();
  }
}

if (require.main === module) {
  start();
}

module.exports = { start, promptUsername, cleanup };
