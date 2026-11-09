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
const GREEN        = `${ESC}[32m`;
const BRIGHT_GREEN = `${ESC}[92m`;
const YELLOW       = `${ESC}[33m`;
const BRIGHT_YELLOW= `${ESC}[93m`;
const RED          = `${ESC}[31m`;
const CYAN         = `${ESC}[36m`;
const BRIGHT_CYAN  = `${ESC}[96m`;
const WHITE        = `${ESC}[37m`;

function cur(row, col) {
  return `${ESC}[${Math.max(1, Math.round(row))};${Math.max(1, Math.round(col))}H`;
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

// ─── Dino ASCII art — 2 rows, 3 chars wide ───────────────────────────────────
const DINO_HEAD   = ' ô ';
const DINO_BODY   = '╘═╛';
const DINO_WIDTH  = 3;

// ─── Obstacle definitions ─────────────────────────────────────────────────────
const OBSTACLE_TYPES = {
  cactus: { chars: ' ╫ ', width: 3 },
  rock:   { chars: '▬▬',  width: 2 },
  stone:  { chars: '▲▲▲', width: 3 },
};
const OBSTACLE_KEYS = Object.keys(OBSTACLE_TYPES);

function randomObstacleType() {
  return OBSTACLE_KEYS[Math.floor(Math.random() * OBSTACLE_KEYS.length)];
}

// ─── Start Screen ─────────────────────────────────────────────────────────────
function showStartScreen(cols, rows, personalBest, globalBest) {
  return new Promise((resolve) => {
    let entered = false;
    let anim = null;
    let onKey = null;

    function cleanup() {
      if (anim) {
        clearInterval(anim);
        anim = null;
      }
      if (onKey) {
        process.stdin.removeListener('data', onKey);
        onKey = null;
      }
    }

    const title = [
      ' ██████╗ ██╗███╗  ██╗ ██████╗ ',
      ' ██╔══██╗██║████╗ ██║██╔═══██╗',
      ' ██║  ██║██║██╔██╗██║██║   ██║',
      ' ██║  ██║██║██║╚████║██║   ██║',
      ' ██████╔╝██║██║ ╚███║╚██████╔╝',
      ' ╚═════╝ ╚═╝╚═╝  ╚══╝ ╚═════╝ '
    ];
    const subtitle = [
      '██████╗ ██╗   ██╗███╗  ██╗███╗  ██╗███████╗██████╗ ',
      '██╔══██╗██║   ██║████╗ ██║████╗ ██║██╔════╝██╔══██╗',
      '██████╔╝██║   ██║██╔██╗██║██╔██╗██║█████╗  ██████╔╝',
      '██╔══██╗██║   ██║██║╚████║██║╚████║██╔══╝  ██╔══██╗',
      '██║  ██║╚██████╔╝██║ ╚███║██║ ╚███║███████╗██║  ██║',
      '╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚══╝╚═╝  ╚══╝╚══════╝╚═╝  ╚═╝'
    ];

    const GROUND_ROW = rows - 3;
    const GROUND_LINE_ROW = rows - 2;
    const CONTROLS_ROW = rows - 1;
    const DINO_X = 10;

    let bounceY = GROUND_ROW;
    let bounceV = 0;
    let bounceJump = false;
    let frame = 0;
    let blinkOn = true;

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
        resolve(true); // Start game
      } else if (key === 'q' || key === 'Q' || key === '\x1B') {
        entered = true;
        cleanup();
        resolve(false); // Return to menu cleanly (NO process.exit!)
      }
    };

    process.stdin.on('data', onKey);

    anim = setInterval(() => {
      if (entered) return;
      frame++;

      if (!bounceJump && frame % 25 === 0) {
        bounceV = -3.5;
        bounceJump = true;
      }
      if (bounceJump || bounceY < GROUND_ROW) {
        bounceV += 0.6;
        bounceY += bounceV;
      }
      if (bounceY >= GROUND_ROW) {
        bounceY = GROUND_ROW;
        bounceV = 0;
        bounceJump = false;
      }
      if (frame % 12 === 0) blinkOn = !blinkOn;

      let out = CLEAR + HIDE_CURSOR;

      // Draw title
      const dinoStart = Math.max(1, Math.floor((rows - title.length * 2 - 5) / 2));
      for (let i = 0; i < title.length; i++) {
        const lineLen = title[i].length;
        const col = Math.max(1, Math.floor((cols - lineLen) / 2) + 1);
        out += cur(dinoStart + i, col);
        out += `${YELLOW}${BOLD}${title[i]}${RESET}`;
      }
      // Draw subtitle
      const subStart = dinoStart + title.length + 1;
      for (let i = 0; i < subtitle.length; i++) {
        const lineLen = subtitle[i].length;
        const col = Math.max(1, Math.floor((cols - lineLen) / 2) + 1);
        out += cur(subStart + i, col);
        out += `${GREEN}${BOLD}${subtitle[i]}${RESET}`;
      }

      // Stats banner
      const statText = `Personal Best: ${personalBest}   |   Arcade Record: ${globalBest}`;
      const statCol = Math.max(1, Math.floor((cols - statText.length) / 2) + 1);
      out += cur(subStart + subtitle.length + 1, statCol);
      out += `${BRIGHT_CYAN}${statText}${RESET}`;

      // Ground line
      out += cur(GROUND_LINE_ROW, 1);
      out += `${DIM}${'═'.repeat(cols)}${RESET}`;

      // Bouncing dino
      const dy = Math.round(bounceY);
      if (dy - 1 >= 2) {
        out += cur(dy - 1, DINO_X);
        out += `${BRIGHT_GREEN}${DINO_HEAD}${RESET}`;
      }
      out += cur(dy, DINO_X);
      out += `${BRIGHT_GREEN}${DINO_BODY}${RESET}`;

      // Prompt
      const promptText = blinkOn
        ? '▶  PRESS SPACE TO JUMP IN  ◀   (Q/ESC to Return)'
        : '   PRESS SPACE TO JUMP IN      (Q/ESC to Return)';
      const promptCol = Math.max(1, Math.floor((cols - promptText.length) / 2) + 1);
      out += cur(CONTROLS_ROW, promptCol);
      out += `${BRIGHT_YELLOW}${BOLD}${promptText}${RESET}`;

      write(out);
    }, 60);
  });
}

// ─── Game Over Screen ─────────────────────────────────────────────────────────
function showGameOverScreen(score, speed, cols, rows, personalBest, isNewPersonalBest, globalBest) {
  return new Promise((resolve) => {
    const boxW = 50;
    const boxH = isNewPersonalBest ? 13 : 11;
    const boxCol = Math.max(1, Math.floor((cols - boxW) / 2) + 1);
    const boxRow = Math.max(1, Math.floor((rows - boxH) / 2) + 1);
    const inner = boxW - 2;

    let out = CLEAR + HIDE_CURSOR;

    // Outer border
    out += cur(boxRow, boxCol) + `${RED}${BOLD}╔${'═'.repeat(inner)}╗${RESET}`;
    for (let r = boxRow + 1; r < boxRow + boxH - 1; r++) {
      out += cur(r, boxCol) + `${RED}${BOLD}║${RESET}`;
      out += cur(r, boxCol + boxW - 1) + `${RED}${BOLD}║${RESET}`;
    }
    out += cur(boxRow + boxH - 1, boxCol) + `${RED}${BOLD}╚${'═'.repeat(inner)}╝${RESET}`;

    // Title
    out += cur(boxRow + 1, boxCol + 1);
    out += centerPad(`${RED}${BOLD}💀  G A M E   O V E R  💀${RESET}`, inner);

    // Divider
    out += cur(boxRow + 2, boxCol + 1);
    out += `${DIM}${'─'.repeat(inner)}${RESET}`;

    // Stats
    out += cur(boxRow + 3, boxCol + 1);
    out += centerPad(`${YELLOW}Final Score : ${BOLD}${score}${RESET}`, inner);
    out += cur(boxRow + 4, boxCol + 1);
    out += centerPad(`${YELLOW}Max Speed   : ${BOLD}${speed.toFixed(1)}x${RESET}`, inner);
    out += cur(boxRow + 5, boxCol + 1);
    out += centerPad(`${CYAN}Personal Best : ${BOLD}${Math.max(score, personalBest)}${RESET}`, inner);
    out += cur(boxRow + 6, boxCol + 1);
    out += centerPad(`${DIM}Arcade Record : ${globalBest}${RESET}`, inner);

    if (isNewPersonalBest && score > 0) {
      out += cur(boxRow + 7, boxCol + 1);
      out += centerPad(`${BRIGHT_GREEN}${BOLD}★  NEW PERSONAL BEST!  ★${RESET}`, inner);
      out += cur(boxRow + 8, boxCol + 1);
      out += centerPad(`${BRIGHT_YELLOW}Saved to SQLite Database${RESET}`, inner);
    }

    // Navigation
    out += cur(boxRow + boxH - 2, boxCol + 1);
    out += centerPad(`${BRIGHT_CYAN}${BOLD}[R] Play Again   [Q / ESC] Main Menu${RESET}`, inner);

    write(out);

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
async function playDinoRunner() {
  const cols = process.stdout.columns || 80;
  const rows = process.stdout.rows || 24;

  const STATUS_ROW      = 1;
  const GROUND_ROW      = rows - 3;
  const GROUND_LINE_ROW = rows - 2;
  const CONTROLS_ROW    = rows - 1;

  const DINO_X        = 10;
  const GRAVITY       = 0.6;
  const JUMP_VELOCITY = -3.5;
  const TICK_MS       = 60;

  // Retrieve player best & global record
  let personalBest = 0;
  let globalBest = 0;
  try {
    personalBest = gameState.getPlayerHighScore('Dino Runner') || 0;
    const topList = gameState.getGlobalTopScores('Dino Runner', 1);
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

  // 2. Main game session runner with restart capability
  let keepPlaying = true;

  while (keepPlaying) {
    const roundStartTime = Date.now();
    let dinoY     = GROUND_ROW;
    let dinoVel   = 0;
    let isJumping = false;
    let score     = 0;
    let speed     = 1.0;
    let gameOver  = false;
    let obstacles = [];

    // Atmospheric clouds
    let clouds = [];
    for (let i = 0; i < 3; i++) {
      clouds.push({
        x: Math.floor(cols * 0.3 * i + 20),
        row: Math.floor(Math.random() * Math.max(2, GROUND_ROW - 4)) + 2
      });
    }

    function spawnObstacle() {
      const type = randomObstacleType();
      obstacles.push({ x: cols + Math.floor(Math.random() * 20) + 5, type });
    }
    spawnObstacle();

    function renderGame() {
      let out = CLEAR + HIDE_CURSOR;

      // HUD: Live Score, Personal Best, Speed, Controls
      out += cur(STATUS_ROW, 1);
      out += `${BOLD}${BRIGHT_YELLOW} Dino Runner ${RESET}| ${BRIGHT_GREEN}Score: ${score}${RESET} | ${CYAN}Best: ${Math.max(score, personalBest)}${RESET} | ${YELLOW}Speed: ${speed.toFixed(1)}x${RESET} | [SPACE] Jump  [Q] Menu`;

      // Clouds
      for (const cloud of clouds) {
        const cx = Math.round(cloud.x);
        if (cx > 0 && cx + 3 <= cols) {
          out += cur(cloud.row, cx);
          out += `${DIM}${WHITE}~~~${RESET}`;
        }
      }

      // Ground line
      out += cur(GROUND_LINE_ROW, 1);
      out += `${DIM}${'═'.repeat(cols)}${RESET}`;

      // Controls
      out += cur(CONTROLS_ROW, 1);
      out += `${DIM}SPACE: Jump  |  Q: Quit to Main Menu${RESET}`;

      // Obstacles
      for (const obs of obstacles) {
        const ox = Math.round(obs.x);
        if (ox > 0 && ox + OBSTACLE_TYPES[obs.type].width - 1 <= cols) {
          out += cur(GROUND_ROW, ox);
          out += `${RED}${BOLD}${OBSTACLE_TYPES[obs.type].chars}${RESET}`;
        }
      }

      // Dino
      const dy = Math.round(dinoY);
      const dinoColor = gameOver ? RED : BRIGHT_GREEN;
      if (dy - 1 >= 2) {
        out += cur(dy - 1, DINO_X);
        out += `${dinoColor}${DINO_HEAD}${RESET}`;
      }
      out += cur(dy, DINO_X);
      out += `${dinoColor}${DINO_BODY}${RESET}`;

      write(out);
    }

    function checkCollision() {
      if (Math.round(dinoY) !== GROUND_ROW) return false;
      for (const obs of obstacles) {
        const def = OBSTACLE_TYPES[obs.type];
        if (obs.x + def.width - 1 >= DINO_X && obs.x <= DINO_X + DINO_WIDTH - 1) {
          return true;
        }
      }
      return false;
    }

    const roundResult = await new Promise((resolveSession) => {
      let interval = null;
      let onKey = null;

      function endSession(action) {
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
        if (onKey) {
          process.stdin.removeListener('data', onKey);
          onKey = null;
        }
        resolveSession(action);
      }

      try {
        if (process.stdin.isTTY) process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.setEncoding('utf8');
      } catch (_) {}

      onKey = function(chunk) {
        const key = chunk.toString();
        if (gameOver) return;
        if (key === ' ' && !isJumping) {
          dinoVel   = JUMP_VELOCITY;
          isJumping = true;
        } else if (key === 'q' || key === 'Q' || key === '\x1B') {
          endSession('menu');
        }
      };

      process.stdin.on('data', onKey);

      interval = setInterval(() => {
        // Physics
        if (isJumping || dinoY < GROUND_ROW) {
          dinoVel += GRAVITY;
          dinoY   += dinoVel;
        }
        if (dinoY >= GROUND_ROW) {
          dinoY     = GROUND_ROW;
          dinoVel   = 0;
          isJumping = false;
        }

        // Move obstacles & clouds
        for (const obs of obstacles) obs.x -= speed;
        for (const cloud of clouds) {
          cloud.x -= speed * 0.25;
          if (cloud.x + 3 < 1) {
            cloud.x   = cols + 5;
            cloud.row = Math.floor(Math.random() * Math.max(2, GROUND_ROW - 4)) + 2;
          }
        }

        obstacles = obstacles.filter(o => o.x > -10);

        const rightmostX = obstacles.reduce((mx, o) => Math.max(mx, o.x), 0);
        if (rightmostX < cols * 0.6) {
          spawnObstacle();
        }

        score++;

        // Speed ramping
        if (score % 150 === 0 && speed < 4.0) {
          speed = Math.min(4.0, parseFloat((speed + 0.2).toFixed(1)));
        }

        // Check collision
        if (checkCollision()) {
          gameOver = true;
          renderGame();

          const durationSeconds = Math.max(0, Math.round((Date.now() - roundStartTime) / 1000));
          try {
            gameState.recordCompletedSession('Dino Runner', score, durationSeconds);
          } catch (err) {
            console.error('[DinoRunner] Database error recording session:', err.message);
          }

          setTimeout(() => {
            endSession('gameover');
          }, 400);
          return;
        }

        renderGame();
      }, TICK_MS);
    });

    if (roundResult === 'menu') {
      keepPlaying = false;
      break;
    }

    // Show game over screen
    const isNewPersonalBest = score > personalBest;
    if (isNewPersonalBest) {
      personalBest = score;
    }
    globalBest = Math.max(globalBest, score);

    const gameOverChoice = await showGameOverScreen(score, speed, cols, rows, personalBest, isNewPersonalBest, globalBest);
    if (gameOverChoice === 'restart') {
      keepPlaying = true;
    } else {
      keepPlaying = false;
    }
  }

  write(CLEAR + SHOW_CURSOR);
}

module.exports = playDinoRunner;
module.exports.play = playDinoRunner;
