'use strict';

const gameState = require('../gameState');

// ─── ANSI helpers ─────────────────────────────────────────────────────────────
const ESC          = '\x1B';
const CLEAR        = `${ESC}[2J${ESC}[H`;
const HIDE_CURSOR  = `${ESC}[?25l`;
const SHOW_CURSOR  = `${ESC}[?25h`;
const RESET        = `${ESC}[0m`;
const BOLD         = `${ESC}[1m`;
const DIM          = `${ESC}[2m`;
const RED          = `${ESC}[31m`;
const GREEN        = `${ESC}[32m`;
const YELLOW       = `${ESC}[33m`;
const CYAN         = `${ESC}[36m`;
const BRIGHT_GREEN = `${ESC}[92m`;
const BRIGHT_YELLOW= `${ESC}[93m`;
const BRIGHT_CYAN  = `${ESC}[96m`;
const BRIGHT_WHITE = `${ESC}[97m`;

function moveTo(row, col) {
  return `${ESC}[${row};${col}H`;
}

function write(s) {
  process.stdout.write(s);
}

function stripAnsi(str) {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B\[[0-9;]*[A-Za-z]/g, '');
}

function centerPad(text, width) {
  const len = stripAnsi(text).length;
  const pad = Math.max(0, Math.floor((width - len) / 2));
  return ' '.repeat(pad) + text + ' '.repeat(Math.max(0, width - len - pad));
}

// ─── Start Screen ─────────────────────────────────────────────────────────────
function showStartScreen(cols, rows, personalBest, globalBest) {
  return new Promise((resolve) => {
    let animInterval = null;
    let onKey = null;
    let entered = false;

    function cleanup() {
      if (animInterval) {
        clearInterval(animInterval);
        animInterval = null;
      }
      if (onKey) {
        process.stdin.removeListener('data', onKey);
        onKey = null;
      }
    }

    const snakeArt = [
      ' ███████╗███╗   ██╗ █████╗ ██╗  ██╗███████╗',
      ' ██╔════╝████╗  ██║██╔══██╗██║ ██╔╝██╔════╝',
      ' ███████╗██╔██╗ ██║███████║█████╔╝ █████╗  ',
      ' ╚════██║██║╚██╗██║██╔══██║██╔═██╗ ██╔══╝  ',
      ' ███████║██║ ╚████║██║  ██║██║  ██╗███████╗',
      ' ╚══════╝╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝'
    ];

    let frame = 0;
    const animSnake = ['●', '●', '●', '●', '●', '■'];
    const animRow = Math.floor(rows / 2) + 4;
    const animLen = animSnake.length;

    try {
      if (process.stdin.isTTY) process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');
    } catch (_) {}

    onKey = function(chunk) {
      const key = chunk.toString();
      if (entered) return;
      if (key === ' ') {
        entered = true;
        cleanup();
        resolve(true);
      } else if (key === 'q' || key === 'Q' || key === '\x1B') {
        entered = true;
        cleanup();
        resolve(false);
      }
    };

    process.stdin.on('data', onKey);

    function drawStart() {
      if (entered) return;
      const buf = [];
      buf.push(CLEAR + HIDE_CURSOR);

      const artTop = Math.max(2, Math.floor((rows - snakeArt.length) / 2) - 4);
      snakeArt.forEach((line, i) => {
        const col = Math.max(1, Math.floor((cols - line.length) / 2));
        buf.push(`${moveTo(artTop + i, col)}${BRIGHT_GREEN}${BOLD}${line}${RESET}`);
      });

      const statLine = `Personal Best: ${personalBest}   |   Arcade Record: ${globalBest}`;
      const statCol = Math.max(1, Math.floor((cols - statLine.length) / 2));
      buf.push(`${moveTo(artTop + snakeArt.length + 1, statCol)}${BRIGHT_CYAN}${statLine}${RESET}`);

      // Crawling snake animation
      const totalWidth = cols - 4;
      const snakeHead = (frame % (totalWidth + animLen));
      for (let s = 0; s < animLen; s++) {
        const sx = snakeHead - s;
        if (sx >= 1 && sx <= totalWidth) {
          const color = s === 0 ? BRIGHT_GREEN + BOLD : GREEN;
          buf.push(`${moveTo(animRow, sx + 2)}${color}${animSnake[s]}${RESET}`);
        }
      }

      const prompt = '▶  PRESS SPACE TO BEGIN  ◀   (Q/ESC to Return)';
      const promptCol = Math.max(1, Math.floor((cols - prompt.length) / 2));
      buf.push(`${moveTo(animRow + 2, promptCol)}${BRIGHT_YELLOW}${BOLD}${prompt}${RESET}`);

      write(buf.join(''));
      frame++;
    }

    drawStart();
    animInterval = setInterval(drawStart, 75);
  });
}

// ─── Game Over Screen ─────────────────────────────────────────────────────────
function showGameOverScreen(score, length, cols, rows, personalBest, isNewPersonalBest, globalBest) {
  return new Promise((resolve) => {
    const boxW = 48;
    const boxH = isNewPersonalBest ? 13 : 11;
    const boxC = Math.max(1, Math.floor((cols - boxW) / 2));
    const boxR = Math.max(1, Math.floor((rows - boxH) / 2));
    const inner = boxW - 2;

    const buf = [];
    buf.push(CLEAR + HIDE_CURSOR);

    buf.push(`${moveTo(boxR, boxC)}${RED}${BOLD}╔${'═'.repeat(inner)}╗${RESET}`);
    for (let r = 1; r < boxH - 1; r++) {
      buf.push(`${moveTo(boxR + r, boxC)}${RED}${BOLD}║${' '.repeat(inner)}║${RESET}`);
    }
    buf.push(`${moveTo(boxR + boxH - 1, boxC)}${RED}${BOLD}╚${'═'.repeat(inner)}╝${RESET}`);

    buf.push(`${moveTo(boxR + 1, boxC + 1)}${centerPad(`${RED}${BOLD}💀  G A M E   O V E R  💀${RESET}`, inner)}`);
    buf.push(`${moveTo(boxR + 2, boxC + 1)}${DIM}${'─'.repeat(inner)}${RESET}`);
    buf.push(`${moveTo(boxR + 3, boxC + 1)}${centerPad(`${YELLOW}Final Score  : ${BOLD}${score}${RESET}`, inner)}`);
    buf.push(`${moveTo(boxR + 4, boxC + 1)}${centerPad(`${YELLOW}Snake Length : ${BOLD}${length}${RESET}`, inner)}`);
    buf.push(`${moveTo(boxR + 5, boxC + 1)}${centerPad(`${CYAN}Personal Best: ${BOLD}${Math.max(score, personalBest)}${RESET}`, inner)}`);
    buf.push(`${moveTo(boxR + 6, boxC + 1)}${centerPad(`${DIM}Arcade Record: ${globalBest}${RESET}`, inner)}`);

    if (isNewPersonalBest && score > 0) {
      buf.push(`${moveTo(boxR + 7, boxC + 1)}${centerPad(`${BRIGHT_GREEN}${BOLD}★  NEW PERSONAL BEST!  ★${RESET}`, inner)}`);
      buf.push(`${moveTo(boxR + 8, boxC + 1)}${centerPad(`${BRIGHT_YELLOW}Saved to SQLite Database${RESET}`, inner)}`);
    }

    buf.push(`${moveTo(boxR + boxH - 2, boxC + 1)}${centerPad(`${BRIGHT_CYAN}${BOLD}[R] Play Again   [Q / ESC] Main Menu${RESET}`, inner)}`);

    write(buf.join(''));

    function onKey(chunk) {
      const key = chunk.toString();
      if (key === 'r' || key === 'R') {
        process.stdin.removeListener('data', onKey);
        resolve('restart');
      } else if (key === 'q' || key === 'Q' || key === '\x1B' || key === '\r' || key === '\n') {
        process.stdin.removeListener('data', onKey);
        resolve('menu');
      }
    }

    try {
      if (process.stdin.isTTY) process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');
    } catch (_) {}
    process.stdin.on('data', onKey);
  });
}

// ─── Main gameplay loop ───────────────────────────────────────────────────────
async function playSnake() {
  const cols = process.stdout.columns || 80;
  const rows = process.stdout.rows || 24;

  const BOARD_LEFT   = 2;
  const BOARD_TOP    = 2;
  const BOARD_RIGHT  = cols - 2;
  const BOARD_BOTTOM = rows - 3;
  const BOARD_WIDTH  = BOARD_RIGHT - BOARD_LEFT - 1;
  const BOARD_HEIGHT = BOARD_BOTTOM - BOARD_TOP - 1;

  const SNAKE_CHAR = '█';
  const HEAD_CHAR  = '▓';
  const FOOD_CHAR  = '◆';

  const INITIAL_TICK_MS = 110;
  const MIN_TICK_MS     = 45;

  let personalBest = 0;
  let globalBest = 0;
  try {
    personalBest = gameState.getPlayerHighScore('Snake') || 0;
    const topList = gameState.getGlobalTopScores('Snake', 1);
    if (topList && topList.length > 0) {
      globalBest = topList[0].score;
    }
  } catch (_) {}

  // 1. Show start screen
  const shouldStart = await showStartScreen(cols, rows, personalBest, globalBest);
  if (!shouldStart) {
    write(CLEAR + SHOW_CURSOR);
    return;
  }

  let keepPlaying = true;

  while (keepPlaying) {
    const roundStartTime = Date.now();
    let tickMs = INITIAL_TICK_MS;

    let snake = [
      { x: Math.floor(BOARD_WIDTH / 2) + BOARD_LEFT + 1, y: Math.floor(BOARD_HEIGHT / 2) + BOARD_TOP + 1 },
      { x: Math.floor(BOARD_WIDTH / 2) + BOARD_LEFT,     y: Math.floor(BOARD_HEIGHT / 2) + BOARD_TOP + 1 },
      { x: Math.floor(BOARD_WIDTH / 2) + BOARD_LEFT - 1, y: Math.floor(BOARD_HEIGHT / 2) + BOARD_TOP + 1 },
    ];
    let direction     = { x: 1, y: 0 };
    let nextDirection = { x: 1, y: 0 };
    let score         = 0;
    let foodEaten     = 0;
    let gameOver      = false;
    let growing       = false;

    function generateFood() {
      let pos;
      let attempts = 0;
      do {
        pos = {
          x: Math.floor(Math.random() * BOARD_WIDTH) + BOARD_LEFT + 1,
          y: Math.floor(Math.random() * BOARD_HEIGHT) + BOARD_TOP + 1,
        };
        attempts++;
      } while (attempts < 100 && snake.some(s => s.x === pos.x && s.y === pos.y));
      return pos;
    }

    let food = generateFood();

    function renderGame() {
      const buf = [];
      buf.push(CLEAR);

      // HUD (Row 1): Title, Score, Length, Best, Controls
      const hud = ` Snake | Score: ${score} | Length: ${snake.length} | Best: ${Math.max(score, personalBest)} | Controls: WASD/Arrows | [Q] Menu`;
      buf.push(`${moveTo(1, 1)}${BRIGHT_YELLOW}${BOLD}${hud}${RESET}`);

      // Top border
      buf.push(`${moveTo(BOARD_TOP, BOARD_LEFT)}${BRIGHT_CYAN}┌${'─'.repeat(BOARD_WIDTH)}┐${RESET}`);

      // Side borders
      for (let r = BOARD_TOP + 1; r < BOARD_BOTTOM; r++) {
        buf.push(`${moveTo(r, BOARD_LEFT)}${BRIGHT_CYAN}│${RESET}`);
        buf.push(`${moveTo(r, BOARD_RIGHT)}${BRIGHT_CYAN}│${RESET}`);
      }

      // Bottom border
      buf.push(`${moveTo(BOARD_BOTTOM, BOARD_LEFT)}${BRIGHT_CYAN}└${'─'.repeat(BOARD_WIDTH)}┘${RESET}`);

      // Controls bottom hint
      const hint = 'Arrow Keys / WASD: Steer   |   Q: Quit to Main Menu';
      const hintCol = Math.max(1, Math.floor((cols - hint.length) / 2));
      buf.push(`${moveTo(rows - 1, hintCol)}${DIM}${hint}${RESET}`);

      // Food
      buf.push(`${moveTo(food.y, food.x)}${RED}${BOLD}${FOOD_CHAR}${RESET}`);

      // Snake body
      for (let i = snake.length - 1; i >= 1; i--) {
        buf.push(`${moveTo(snake[i].y, snake[i].x)}${GREEN}${SNAKE_CHAR}${RESET}`);
      }

      // Snake head
      buf.push(`${moveTo(snake[0].y, snake[0].x)}${BRIGHT_GREEN}${BOLD}${HEAD_CHAR}${RESET}`);

      write(buf.join(''));
    }

    const roundResult = await new Promise((resolveRound) => {
      let gameInterval = null;
      let onKey = null;

      function endRound(action) {
        if (gameInterval) {
          clearInterval(gameInterval);
          gameInterval = null;
        }
        if (onKey) {
          process.stdin.removeListener('data', onKey);
          onKey = null;
        }
        resolveRound(action);
      }

      try {
        if (process.stdin.isTTY) process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.setEncoding('utf8');
      } catch (_) {}

      onKey = function(chunk) {
        const data = chunk.toString();
        if (gameOver) return;

        // Direction reversal prevention
        if (data === '\x1B[A' || data === 'w' || data === 'W') {
          if (direction.y !== 1) nextDirection = { x: 0, y: -1 };
        } else if (data === '\x1B[B' || data === 's' || data === 'S') {
          if (direction.y !== -1) nextDirection = { x: 0, y: 1 };
        } else if (data === '\x1B[D' || data === 'a' || data === 'A') {
          if (direction.x !== 1) nextDirection = { x: -1, y: 0 };
        } else if (data === '\x1B[C' || data === 'd' || data === 'D') {
          if (direction.x !== -1) nextDirection = { x: 1, y: 0 };
        } else if (data === 'q' || data === 'Q' || data === '\x1B') {
          endRound('menu');
        }
      };

      process.stdin.on('data', onKey);

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

        // Self collision
        for (let i = 0; i < snake.length - 1; i++) {
          if (snake[i].x === newHead.x && snake[i].y === newHead.y) {
            triggerGameOver();
            return;
          }
        }

        // Food collision
        if (newHead.x === food.x && newHead.y === food.y) {
          score += 10;
          foodEaten++;
          growing = true;
          food = generateFood();

          // Progressive speed scaling every 3 food items
          if (foodEaten % 3 === 0 && tickMs > MIN_TICK_MS) {
            tickMs = Math.max(MIN_TICK_MS, tickMs - 8);
            if (gameInterval) {
              clearInterval(gameInterval);
              gameInterval = setInterval(tick, tickMs);
            }
          }
        }

        snake.unshift(newHead);
        if (!growing) {
          snake.pop();
        }
        growing = false;

        renderGame();
      }

      function triggerGameOver() {
        gameOver = true;
        const durationSeconds = Math.max(0, Math.round((Date.now() - roundStartTime) / 1000));
        try {
          gameState.recordCompletedSession('Snake', score, durationSeconds);
        } catch (err) {
          console.error('[Snake] Database error recording session:', err.message);
        }

        setTimeout(() => {
          endRound('gameover');
        }, 300);
      }

      renderGame();
      gameInterval = setInterval(tick, tickMs);
    });

    if (roundResult === 'menu') {
      keepPlaying = false;
      break;
    }

    const isNewPersonalBest = score > personalBest;
    if (isNewPersonalBest) {
      personalBest = score;
    }
    globalBest = Math.max(globalBest, score);

    const gameOverChoice = await showGameOverScreen(score, snake.length, cols, rows, personalBest, isNewPersonalBest, globalBest);
    if (gameOverChoice === 'restart') {
      keepPlaying = true;
    } else {
      keepPlaying = false;
    }
  }

  write(CLEAR + SHOW_CURSOR);
}

module.exports = playSnake;
module.exports.play = playSnake;
