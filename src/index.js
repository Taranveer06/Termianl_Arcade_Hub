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
  console.log('Thanks for playing Terminal Arcade Hub! Goodbye!');
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('exit', () => {
  process.stdout.write('\x1B[?25h');
});

function promptUsername() {
  return new Promise((resolve) => {
    // Disable raw mode temporarily so we can prompt for a name
    if (process.stdin.isTTY) {
      try { process.stdin.setRawMode(false); } catch (_) {}
    }
    process.stdin.resume();

    const { cols, rows } = renderer.getTerminalSize();
    renderer.clear();
    renderer.hideCursor();

    const boxW = Math.min(60, cols - 4);
    const boxH = 10;
    const boxX = Math.max(2, Math.floor((cols - boxW) / 2));
    const boxY = Math.max(2, Math.floor((rows - boxH) / 2));

    renderer.drawBox(boxX, boxY, boxW, boxH, renderer.colors.brightCyan);

    const title = '🎮  TERMINAL ARCADE HUB';
    renderer.writeAt(boxX + Math.floor((boxW - title.length) / 2), boxY + 2, title, renderer.colors.brightYellow);

    const promptText = 'Please enter your username:';
    renderer.writeAt(boxX + Math.floor((boxW - promptText.length) / 2), boxY + 4, promptText, renderer.colors.white);

    const hint = '(Press Enter to use default "Player")';
    renderer.writeAt(boxX + Math.floor((boxW - hint.length) / 2), boxY + 5, hint, renderer.colors.cyan);

    renderer.moveCursor(boxX + Math.floor((boxW - 24) / 2), boxY + 7);
    renderer.showCursor();
    process.stdout.write('\x1B[' + renderer.colors.brightGreen + 'm> \x1B[0m');

    let input = '';

    function onData(chunk) {
      const ch = chunk.toString();
      for (const c of ch) {
        const code = c.charCodeAt(0);
        if (code === 13 || code === 10) {
          // Enter pressed
          process.stdin.removeListener('data', onData);
          renderer.hideCursor();

          // Restore raw mode for the arcade
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
          if (input.length < 20) {
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
    // 1. Initialize SQLite database automatically
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

start();
