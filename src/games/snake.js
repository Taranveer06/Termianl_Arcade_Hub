'use strict';

const path = require('path');
const fs = require('fs');
const gameState = require('../gameState');

const SCORES_FILE = path.join(__dirname, '../../scores.json');

// ─── Score Helpers ───────────────────────────────────────────────────────────

function loadScores() {
  try {
    const raw = fs.readFileSync(SCORES_FILE, 'utf8');
    const data = JSON.parse(raw);
    return {
      flappyBird: data.flappyBird || [],
      dinoRunner: data.dinoRunner || [],
      snake: data.snake || [],
    };
  } catch (_) {
    return { flappyBird: [], dinoRunner: [], snake: [] };
  }
}

function saveScores(scores) {
  fs.writeFileSync(SCORES_FILE, JSON.stringify(scores, null, 2));
}

function addScore(name, score) {
  const scores = loadScores();
  scores.snake.push({ name, score, date: new Date().toLocaleDateString() });
  scores.snake.sort((a, b) => b.score - a.score);
  scores.snake = scores.snake.slice(0, 5);
  saveScores(scores);
  return scores;
}

function getTopScores() {
  return loadScores().snake;
}

// ─── Main Export ─────────────────────────────────────────────────────────────

const playSnake = async function playSnake() {
  return new Promise((resolve) => {
    runGame(resolve);
  });
};
module.exports = playSnake;
module.exports.play = playSnake;

// ─── Game Runner ─────────────────────────────────────────────────────────────

function runGame(onExit) {
  // Terminal dimensions (re-read each time in case of resize)
  const cols = process.stdout.columns || 80;
  const rows = process.stdout.rows || 24;

  // Board boundaries
  const BOARD_LEFT   = 2;
  const BOARD_TOP    = 2;
  const BOARD_RIGHT  = cols - 2;
  const BOARD_BOTTOM = rows - 3;
  const BOARD_WIDTH  = BOARD_RIGHT - BOARD_LEFT - 1;
  const BOARD_HEIGHT = BOARD_BOTTOM - BOARD_TOP - 1;

  // Characters
  const SNAKE_CHAR = '█';
  const HEAD_CHAR  = '▓';
  const FOOD_CHAR  = '◆';

  // Speed
  let tickMs    = 120;
  const MIN_TICK = 50;
// Initial movement loop
  const roundStartTime = Date.now();

  // ── State ────────────────────────────────────────────────────────────────
  let snake = [
    { x: Math.floor(BOARD_WIDTH / 2) + BOARD_LEFT + 1,     y: Math.floor(BOARD_HEIGHT / 2) + BOARD_TOP + 1 },
    { x: Math.floor(BOARD_WIDTH / 2) + BOARD_LEFT,         y: Math.floor(BOARD_HEIGHT / 2) + BOARD_TOP + 1 },
    { x: Math.floor(BOARD_WIDTH / 2) + BOARD_LEFT - 1,     y: Math.floor(BOARD_HEIGHT / 2) + BOARD_TOP + 1 },
  ];
  let direction     = { x: 1, y: 0 };
  let nextDirection = { x: 1, y: 0 };
  let food          = generateFood();
  let score         = 0;
  let foodEaten     = 0;
  let gameOver      = false;
  let growing       = false;
  let gameInterval  = null;
  let inputCleanup  = null;

  function generateFood() {
    let pos;
    do {
      pos = {
        x: Math.floor(Math.random() * BOARD_WIDTH) + BOARD_LEFT + 1,
        y: Math.floor(Math.random() * BOARD_HEIGHT) + BOARD_TOP + 1,
      };
    } while (snake && snake.some(s => s.x === pos.x && s.y === pos.y));
    return pos;
  }

  // ── Rendering ────────────────────────────────────────────────────────────

  function moveTo(row, col) {
    return `\x1B[${row};${col}H`;
  }

  function render() {
    const buf = [];

    // Clear
    buf.push('\x1B[2J\x1B[H');

    // Status bar (row 1)
    buf.push(`${moveTo(1, 1)}\x1B[1m\x1B[33m TERMINAL ARCADE HUB - SNAKE \x1B[0m| Score: \x1B[92m${score}\x1B[0m | Length: \x1B[96m${snake.length}\x1B[0m`);

    // Top border
    buf.push(`${moveTo(BOARD_TOP, BOARD_LEFT)}\x1B[36m┌${'─'.repeat(BOARD_WIDTH)}┐\x1B[0m`);

    // Side borders
    for (let r = BOARD_TOP + 1; r < BOARD_BOTTOM; r++) {
      buf.push(`${moveTo(r, BOARD_LEFT)}\x1B[36m│\x1B[0m`);
      buf.push(`${moveTo(r, BOARD_RIGHT)}\x1B[36m│\x1B[0m`);
    }

    // Bottom border
    buf.push(`${moveTo(BOARD_BOTTOM, BOARD_LEFT)}\x1B[36m└${'─'.repeat(BOARD_WIDTH)}┘\x1B[0m`);

    // Controls hint
    const hint = 'Arrow Keys / WASD: Move   Q: Quit';
    const hintCol = Math.max(1, Math.floor((cols - hint.length) / 2));
    buf.push(`${moveTo(rows - 1, hintCol)}\x1B[90m${hint}\x1B[0m`);

    // Food
    buf.push(`${moveTo(food.y, food.x)}\x1B[31m${FOOD_CHAR}\x1B[0m`);

    // Snake body (tail to index 1)
    for (let i = snake.length - 1; i >= 1; i--) {
      buf.push(`${moveTo(snake[i].y, snake[i].x)}\x1B[32m${SNAKE_CHAR}\x1B[0m`);
    }

    // Snake head
    buf.push(`${moveTo(snake[0].y, snake[0].x)}\x1B[92m\x1B[1m${HEAD_CHAR}\x1B[0m`);

    process.stdout.write(buf.join(''));
  }

  // ── Game Tick ────────────────────────────────────────────────────────────

  function tick() {
    direction = nextDirection;

    const newHead = {
      x: snake[0].x + direction.x,
      y: snake[0].y + direction.y,
    };

    // Wall collision
    if (
      newHead.x <= BOARD_LEFT  ||
      newHead.x >= BOARD_RIGHT ||
      newHead.y <= BOARD_TOP   ||
      newHead.y >= BOARD_BOTTOM
    ) {
      triggerGameOver();
      return;
    }

    // Self collision (skip last tail segment since it moves away)
    for (let i = 0; i < snake.length - 1; i++) {
      if (snake[i].x === newHead.x && snake[i].y === newHead.y) {
        triggerGameOver();
        return;
      }
    }

    // Food collision
    if (newHead.x === food.x && newHead.y === food.y) {
      score++;
      foodEaten++;
      growing = true;
      food = generateFood();

      // Progressive speed increase every 5 foods
      if (foodEaten % 5 === 0 && tickMs > MIN_TICK) {
        tickMs = Math.max(MIN_TICK, tickMs - 5);
        clearInterval(gameInterval);
        gameInterval = setInterval(tick, tickMs);
      }
    }

    // Move snake
    snake.unshift(newHead);
    if (!growing) {
      snake.pop();
    }
    growing = false;

    render();
  }

  // ── Game Over ────────────────────────────────────────────────────────────

  function triggerGameOver() {
    gameOver = true;
    const durationSeconds = Math.max(0, Math.round((Date.now() - roundStartTime) / 1000));
    gameState.recordCompletedSession('Snake', score, durationSeconds);
    clearInterval(gameInterval);
    gameInterval = null;
    cleanupInput();
    showGameOver();
  }

  function showGameOver() {
    const finalScore  = score;
    const finalLength = snake.length;
    const topScores   = getTopScores();
    const isHighScore = topScores.length < 5 || finalScore > (topScores[topScores.length - 1]?.score || 0);

    if (isHighScore && finalScore > 0) {
      showNameEntry(finalScore, finalLength, onExit);
    } else {
      renderGameOverScreen(finalScore, finalLength, false, null, onExit);
    }
  }

  // ── Name Entry ───────────────────────────────────────────────────────────

  function showNameEntry(finalScore, finalLength, doneCallback) {
    let nameInput = '';
    const maxLen  = 12;

    function renderNameEntry() {
      const buf = [];
      buf.push('\x1B[2J\x1B[H');

      const boxW  = 44;
      const boxH  = 10;
      const boxC  = Math.floor((cols - boxW) / 2);
      const boxR  = Math.floor((rows - boxH) / 2);

      // Box
      buf.push(`${moveTo(boxR, boxC)}\x1B[33m╔${'═'.repeat(boxW - 2)}╗\x1B[0m`);
      for (let r = 1; r < boxH - 1; r++) {
        buf.push(`${moveTo(boxR + r, boxC)}\x1B[33m║\x1B[0m${' '.repeat(boxW - 2)}\x1B[33m║\x1B[0m`);
      }
      buf.push(`${moveTo(boxR + boxH - 1, boxC)}\x1B[33m╚${'═'.repeat(boxW - 2)}╝\x1B[0m`);

      // Content
      const center = (text, w) => {
        const pad = Math.max(0, Math.floor((w - text.length) / 2));
        return ' '.repeat(pad) + text;
      };

      buf.push(`${moveTo(boxR + 1, boxC + 1)}\x1B[1m\x1B[93m${center('★  NEW HIGH SCORE!  ★', boxW - 2)}\x1B[0m`);
      buf.push(`${moveTo(boxR + 2, boxC + 1)}\x1B[33m${center(`Score: ${finalScore}  Length: ${finalLength}`, boxW - 2)}\x1B[0m`);
      buf.push(`${moveTo(boxR + 4, boxC + 1)}\x1B[0m${center('Enter your name:', boxW - 2)}`);

      const nameDisplay = nameInput.padEnd(maxLen, '_');
      buf.push(`${moveTo(boxR + 5, boxC + 1)}\x1B[1m\x1B[96m${center(`[ ${nameDisplay} ]`, boxW - 2)}\x1B[0m`);
      buf.push(`${moveTo(boxR + 7, boxC + 1)}\x1B[90m${center('ENTER to confirm   BACKSPACE to delete', boxW - 2)}\x1B[0m`);

      process.stdout.write(buf.join(''));
    }

    renderNameEntry();

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    function onData(data) {
      const ch = data;

      if (ch === '\r' || ch === '\n') {
        // Confirm
        const name = nameInput.trim() || 'AAA';
        process.stdin.removeListener('data', onData);
        addScore(name, finalScore);
        renderGameOverScreen(finalScore, finalLength, true, name, doneCallback);
        return;
      }

      if (ch === '\x7F' || ch === '\x08') {
        // Backspace
        nameInput = nameInput.slice(0, -1);
        renderNameEntry();
        return;
      }

      if (ch === '\x1B') {
        // Escape — skip name entry
        process.stdin.removeListener('data', onData);
        renderGameOverScreen(finalScore, finalLength, false, null, doneCallback);
        return;
      }

      // Printable chars
      if (ch.length === 1 && ch >= ' ' && nameInput.length < maxLen) {
        nameInput += ch;
        renderNameEntry();
      }
    }

    process.stdin.on('data', onData);
  }

  // ── Game Over Screen ─────────────────────────────────────────────────────

  function renderGameOverScreen(finalScore, finalLength, savedScore, savedName, doneCallback) {
    function draw() {
      const buf = [];
      buf.push('\x1B[2J\x1B[H');

      const boxW = 42;
      const boxH = 14;
      const boxC = Math.floor((cols - boxW) / 2);
      const boxR = Math.floor((rows - boxH) / 2);

      buf.push(`${moveTo(boxR, boxC)}\x1B[31m╔${'═'.repeat(boxW - 2)}╗\x1B[0m`);
      for (let r = 1; r < boxH - 1; r++) {
        buf.push(`${moveTo(boxR + r, boxC)}\x1B[31m║\x1B[0m${' '.repeat(boxW - 2)}\x1B[31m║\x1B[0m`);
      }
      buf.push(`${moveTo(boxR + boxH - 1, boxC)}\x1B[31m╚${'═'.repeat(boxW - 2)}╝\x1B[0m`);

      const center = (text, w) => {
        const pad = Math.max(0, Math.floor((w - text.length) / 2));
        return ' '.repeat(pad) + text;
      };
      const inner = boxW - 2;

      buf.push(`${moveTo(boxR + 1, boxC + 1)}\x1B[1m\x1B[31m${center('G A M E   O V E R', inner)}\x1B[0m`);
      buf.push(`${moveTo(boxR + 3, boxC + 1)}\x1B[33m${center(`Score : ${finalScore}`, inner)}\x1B[0m`);
      buf.push(`${moveTo(boxR + 4, boxC + 1)}\x1B[33m${center(`Length: ${finalLength}`, inner)}\x1B[0m`);

      if (savedScore && savedName) {
        buf.push(`${moveTo(boxR + 6, boxC + 1)}\x1B[92m${center(`★ Saved as: ${savedName} ★`, inner)}\x1B[0m`);
      }

      // Top scores
      const topScores = getTopScores();
      buf.push(`${moveTo(boxR + 7, boxC + 1)}\x1B[1m\x1B[36m${center('─── Top Scores ───', inner)}\x1B[0m`);
      topScores.forEach((entry, i) => {
        const line = `${i + 1}. ${entry.name.padEnd(12)} ${String(entry.score).padStart(5)}`;
        buf.push(`${moveTo(boxR + 8 + i, boxC + 1)}\x1B[36m${center(line, inner)}\x1B[0m`);
      });

      buf.push(`${moveTo(boxR + boxH - 2, boxC + 1)}\x1B[1m\x1B[96m${center('[R] Restart   [Q] Main Menu', inner)}\x1B[0m`);

      process.stdout.write(buf.join(''));
    }

    draw();

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    function onData(data) {
      const key = data.toLowerCase();
      if (key === 'r') {
        process.stdin.removeListener('data', onData);
        // Restart game
        runGame(doneCallback);
      } else if (key === 'q' || data === '\x1B') {
        process.stdin.removeListener('data', onData);
        // Restore terminal and return to menu
        process.stdout.write('\x1B[2J\x1B[H\x1B[?25h');
        doneCallback();
      }
    }

    process.stdin.on('data', onData);
  }

  // ── Input Handling ───────────────────────────────────────────────────────

  function setupInput() {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    function onData(data) {
      if (gameOver) return;

      // Arrow keys
      if (data === '\x1B[A' || data === 'w' || data === 'W') {
        if (direction.y !== 1) nextDirection = { x: 0, y: -1 };
      } else if (data === '\x1B[B' || data === 's' || data === 'S') {
        if (direction.y !== -1) nextDirection = { x: 0, y: 1 };
      } else if (data === '\x1B[D' || data === 'a' || data === 'A') {
        if (direction.x !== 1) nextDirection = { x: -1, y: 0 };
      } else if (data === '\x1B[C' || data === 'd' || data === 'D') {
        if (direction.x !== -1) nextDirection = { x: 1, y: 0 };
      } else if (data === 'q' || data === 'Q' || data === '\x1B') {
        // Quit to menu
        gameOver = true;
        clearInterval(gameInterval);
        cleanupInput();
        process.stdout.write('\x1B[2J\x1B[H\x1B[?25h');
        onExit();
      }
    }

    process.stdin.on('data', onData);

    return function cleanup() {
      process.stdin.removeListener('data', onData);
    };
  }

  function cleanupInput() {
    if (inputCleanup) {
      inputCleanup();
      inputCleanup = null;
    }
  }

  // ── Start Screen ─────────────────────────────────────────────────────────

  function showStartScreen() {
    return new Promise((resolve) => {
      const snakeArt = [
        '  ██████╗ ███╗   ██╗ █████╗ ██╗  ██╗███████╗',
        '  ██╔════╝████╗  ██║██╔══██╗██║ ██╔╝██╔════╝',
        '  ███████╗██╔██╗ ██║███████║█████╔╝ █████╗  ',
        '  ╚════██║██║╚██╗██║██╔══██║██╔═██╗ ██╔══╝  ',
        '  ███████║██║ ╚████║██║  ██║██║  ██╗███████╗',
        '  ╚══════╝╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝',
      ];

      // Animated snake positions
      let frame = 0;
      const animSnake = ['●', '●', '●', '●', '●', '■'];
      const animRow  = Math.floor(rows / 2) + 5;
      const animLen  = animSnake.length;

      function drawStart() {
        const buf = [];
        buf.push('\x1B[2J\x1B[H\x1B[?25l');

        // Title art
        const artTop = Math.floor((rows - snakeArt.length) / 2) - 3;
        snakeArt.forEach((line, i) => {
          const col = Math.max(1, Math.floor((cols - line.length) / 2));
          buf.push(`${moveTo(artTop + i, col)}\x1B[92m\x1B[1m${line}\x1B[0m`);
        });

        // Animated snake crawling across screen
        const totalWidth = cols - 4;
        const snakeHead  = (frame % (totalWidth + animLen));
        for (let s = 0; s < animLen; s++) {
          const sx = snakeHead - s;
          if (sx >= 1 && sx <= totalWidth) {
            const color = s === 0 ? '\x1B[92m\x1B[1m' : '\x1B[32m';
            buf.push(`${moveTo(animRow, sx + 2)}${color}${animSnake[s]}\x1B[0m`);
          }
        }

        // Clear trailing cell
        const trailX = snakeHead - animLen;
        if (trailX >= 1 && trailX <= totalWidth) {
          buf.push(`${moveTo(animRow, trailX + 2)} `);
        }

        // "Press SPACE to start"
        const prompt = 'Press SPACE to start  |  Q to quit';
        const promptCol = Math.max(1, Math.floor((cols - prompt.length) / 2));
        buf.push(`${moveTo(animRow + 2, promptCol)}\x1B[1m\x1B[33m${prompt}\x1B[0m`);

        process.stdout.write(buf.join(''));
        frame++;
      }

      drawStart();
      const animInterval = setInterval(drawStart, 80);

      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');

      function onData(data) {
        if (data === ' ') {
          clearInterval(animInterval);
          process.stdin.removeListener('data', onData);
          resolve(true);
        } else if (data === 'q' || data === 'Q' || data === '\x1B') {
          clearInterval(animInterval);
          process.stdin.removeListener('data', onData);
          process.stdout.write('\x1B[2J\x1B[H\x1B[?25h');
          resolve(false);
        }
      }

      process.stdin.on('data', onData);
    });
  }

  // ── Kick Off ─────────────────────────────────────────────────────────────

  process.stdout.write('\x1B[?25l');

  showStartScreen().then((start) => {
    if (!start) {
      onExit();
      return;
    }

    // Setup input
    inputCleanup = setupInput();

    // Initial render + start game loop
    render();
    gameInterval = setInterval(tick, tickMs);
  });
}
