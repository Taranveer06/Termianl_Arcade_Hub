'use strict';

const path = require('path');
const fs = require('fs');
const gameState = require('../gameState');

// ─── High Score Persistence ───────────────────────────────────────────────────
const SCORES_FILE = path.join(__dirname, '../../scores.json');

function loadScores() {
  try {
    const data = fs.readFileSync(SCORES_FILE, 'utf8');
    const parsed = JSON.parse(data);
    return {
      flappyBird: parsed.flappyBird || [],
      dinoRunner: parsed.dinoRunner || [],
      snake: parsed.snake || [],
    };
  } catch {
    return { flappyBird: [], dinoRunner: [], snake: [] };
  }
}

function saveScores(scores) {
  try {
    fs.writeFileSync(SCORES_FILE, JSON.stringify(scores, null, 2));
  } catch { /* ignore write errors */ }
}

function addScore(game, name, scoreVal) {
  const scores = loadScores();
  scores[game] = scores[game] || [];
  scores[game].push({ name, score: scoreVal, date: new Date().toLocaleDateString() });
  scores[game].sort((a, b) => b.score - a.score);
  scores[game] = scores[game].slice(0, 5);
  saveScores(scores);
  return scores;
}

function getTopScores(game) {
  return loadScores()[game] || [];
}

function isNewHighScore(scoreVal) {
  const top = getTopScores('dinoRunner');
  return top.length < 5 || scoreVal > (top[top.length - 1]?.score ?? 0);
}

// ─── ANSI helpers ─────────────────────────────────────────────────────────────
const ESC = '\x1B';
const CLEAR = `${ESC}[2J${ESC}[H`;
const HIDE_CURSOR = `${ESC}[?25l`;
const SHOW_CURSOR = `${ESC}[?25h`;
const RESET = `${ESC}[0m`;
const BOLD = `${ESC}[1m`;
const DIM = `${ESC}[2m`;
const GREEN = `${ESC}[32m`;
const BRIGHT_GREEN = `${ESC}[92m`;
const YELLOW = `${ESC}[33m`;
const RED = `${ESC}[31m`;
const CYAN = `${ESC}[36m`;
const WHITE = `${ESC}[37m`;

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
  return ' '.repeat(pad) + text;
}

// ─── Dino ASCII art — 2 rows, 3 chars wide ───────────────────────────────────
const DINO_HEAD   = ' ô ';  // 3 chars
const DINO_BODY   = '╘═╛';  // 3 chars
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

// ─── Main exported function ───────────────────────────────────────────────────
async function playDinoRunner() {
  const cols = process.stdout.columns || 80;
  const rows = process.stdout.rows || 24;

  // Layout rows (1-based for ANSI)
  const STATUS_ROW      = 1;
  const GROUND_ROW      = rows - 3;   // dino stands here
  const GROUND_LINE_ROW = rows - 2;   // ═══ line
  const CONTROLS_ROW    = rows - 1;

  // Game constants
  const DINO_X        = 10;
  const GRAVITY       = 0.6;
  const JUMP_VELOCITY = -3.5;
  const TICK_MS = 60;
// Initial jump loop

  // ── Ensure raw mode ──────────────────────────────────────────────────────────
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  // ── Show start screen (blocks until SPACE) ───────────────────────────────────
  await showStartScreen(cols, rows, GROUND_ROW, GROUND_LINE_ROW, CONTROLS_ROW, DINO_X);

  const roundStartTime = Date.now();

  // ── Game state ───────────────────────────────────────────────────────────────
  let dinoY      = GROUND_ROW;
  let dinoVel    = 0;
  let isJumping  = false;
  let score      = 0;
  let speed      = 1;
  let gameOver   = false;
  let frame      = 0;
  let obstacles  = [];

  // Atmospheric clouds
  let clouds = [];
  for (let i = 0; i < 3; i++) {
    clouds.push({
      x: Math.floor(cols * 0.3 * i + 20),
      row: randomCloudRow(GROUND_ROW),
    });
  }

  function randomCloudRow(groundRow) {
    const sky = Math.max(2, groundRow - 4);
    return Math.floor(Math.random() * sky) + 2;
  }

  // Spawn initial obstacle
  function spawnObstacle() {
    const type = randomObstacleType();
    obstacles.push({ x: cols + Math.floor(Math.random() * 20) + 5, type });
  }
  spawnObstacle();

  // ── Rendering ─────────────────────────────────────────────────────────────────
  function render() {
    let out = CLEAR + HIDE_CURSOR;

    // Status bar
    out += cur(STATUS_ROW, 1);
    out += `${BOLD}${CYAN}Score: ${score}${RESET}  ${YELLOW}Speed: ${speed.toFixed(1)}x${RESET}`;

    // Sun (top-right, slow drift)
    const sunCol = Math.max(cols - 5, 1);
    out += cur(STATUS_ROW, sunCol);
    out += `${YELLOW}☀${RESET}`;

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
    out += `${DIM}SPACE: Jump  Q: Quit${RESET}`;

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

  // ── Collision detection ───────────────────────────────────────────────────────
  function checkCollision() {
    if (Math.round(dinoY) !== GROUND_ROW) return false;
    for (const obs of obstacles) {
      const def = OBSTACLE_TYPES[obs.type];
      // Dino: columns DINO_X .. DINO_X + DINO_WIDTH - 1
      // Obstacle: obs.x .. obs.x + def.width - 1
      if (obs.x + def.width - 1 >= DINO_X && obs.x <= DINO_X + DINO_WIDTH - 1) {
        return true;
      }
    }
    return false;
  }

  // ── Main game loop ────────────────────────────────────────────────────────────
  return new Promise((resolve) => {
    let interval = null;

    function cleanup() {
      clearInterval(interval);
      process.stdin.removeAllListeners('data');
      try { process.stdin.setRawMode(false); } catch {}
      write(SHOW_CURSOR);
    }

    function onKey(key) {
      if (gameOver) return;
      if (key === ' ' && !isJumping) {
        dinoVel   = JUMP_VELOCITY;
        isJumping = true;
      }
      if (key === 'q' || key === 'Q' || key === '\x1B') {
        cleanup();
        resolve();
      }
    }

    process.stdin.on('data', onKey);

    interval = setInterval(() => {
      frame++;

      // 1. Physics
      if (isJumping || dinoY < GROUND_ROW) {
        dinoVel += GRAVITY;
        dinoY   += dinoVel;
      }
      if (dinoY >= GROUND_ROW) {
        dinoY     = GROUND_ROW;
        dinoVel   = 0;
        isJumping = false;
      }

      // 2. Move obstacles & clouds
      for (const obs of obstacles) obs.x -= speed;
      for (const cloud of clouds) {
        cloud.x -= speed * 0.25;
        if (cloud.x + 3 < 1) {
          cloud.x   = cols + 5;
          cloud.row = randomCloudRow(GROUND_ROW);
        }
      }

      // 3. Remove off-screen obstacles
      obstacles = obstacles.filter(o => o.x > -10);

      // 4. Spawn new obstacle when rightmost passes 60% of screen
      const rightmostX = obstacles.reduce((mx, o) => Math.max(mx, o.x), 0);
      if (rightmostX < cols * 0.6) {
        spawnObstacle();
      }

      // 5. Score
      score++;

      // 6. Speed ramp (every 200 score, capped at 4)
      if (score % 200 === 0 && speed < 4) {
        speed = Math.min(4, parseFloat((speed + 0.2).toFixed(1)));
      }

      // 7. Collision
      if (checkCollision()) {
        gameOver = true;
        const durationSeconds = Math.max(0, Math.round((Date.now() - roundStartTime) / 1000));
        gameState.recordCompletedSession('Dino Runner', score, durationSeconds);
        render();
        clearInterval(interval);
        process.stdin.removeAllListeners('data');
        setTimeout(() => {
          handleGameOver(score, speed, cols, rows, cleanup, resolve);
        }, 500);
        return;
      }

      // 8. Render
      render();
    }, TICK_MS);
  });
}

module.exports = playDinoRunner;
module.exports.play = playDinoRunner;
module.exports.SCORES_FILE = SCORES_FILE;

// ─── Start Screen ─────────────────────────────────────────────────────────────
function showStartScreen(cols, rows, GROUND_ROW, GROUND_LINE_ROW, CONTROLS_ROW, DINO_X) {
  return new Promise((resolve) => {
    const title = [
      ' ██████╗ ██╗███╗  ██╗ ██████╗ ',
      ' ██╔══██╗██║████╗ ██║██╔═══██╗',
      ' ██║  ██║██║██╔██╗██║██║   ██║',
      ' ██║  ██║██║██║╚████║██║   ██║',
      ' ██████╔╝██║██║ ╚███║╚██████╔╝',
      ' ╚═════╝ ╚═╝╚═╝  ╚══╝ ╚═════╝ ',
    ];
    const subtitle = [
      '██████╗ ██╗   ██╗███╗  ██╗███╗  ██╗███████╗██████╗ ',
      '██╔══██╗██║   ██║████╗ ██║████╗ ██║██╔════╝██╔══██╗',
      '██████╔╝██║   ██║██╔██╗██║██╔██╗██║█████╗  ██████╔╝',
      '██╔══██╗██║   ██║██║╚████║██║╚████║██╔══╝  ██╔══██╗',
      '██║  ██║╚██████╔╝██║ ╚███║██║ ╚███║███████╗██║  ██║',
      '╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚══╝╚═╝  ╚══╝╚══════╝╚═╝  ╚═╝',
    ];

    let bounceY   = GROUND_ROW;
    let bounceV   = 0;
    let bounceJump = false;
    let frame     = 0;
    let blinkOn   = true;
    let entered   = false;

    function onKey(key) {
      if (entered) return;
      if (key === ' ') {
        entered = true;
        clearInterval(anim);
        process.stdin.removeAllListeners('data');
        resolve();
      } else if (key === 'q' || key === 'Q' || key === '\x1B') {
        clearInterval(anim);
        process.stdin.removeAllListeners('data');
        try { process.stdin.setRawMode(false); } catch {}
        write(SHOW_CURSOR + CLEAR);
        process.exit(0);
      }
    }

    process.stdin.on('data', onKey);

    const anim = setInterval(() => {
      if (entered) return;
      frame++;

      // Auto-bounce every ~1.5s
      if (!bounceJump && frame % 25 === 0) {
        bounceV    = -3.5;
        bounceJump = true;
      }
      if (bounceJump || bounceY < GROUND_ROW) {
        bounceV += 0.6;
        bounceY += bounceV;
      }
      if (bounceY >= GROUND_ROW) {
        bounceY    = GROUND_ROW;
        bounceV    = 0;
        bounceJump = false;
      }
      if (frame % 12 === 0) blinkOn = !blinkOn;

      let out = CLEAR + HIDE_CURSOR;

      // Draw "DINO" title centered
      const dinoStart = Math.max(1, Math.floor((rows - title.length * 2 - 4) / 2));
      for (let i = 0; i < title.length; i++) {
        const lineLen = title[i].length;
        const col = Math.max(1, Math.floor((cols - lineLen) / 2) + 1);
        out += cur(dinoStart + i, col);
        out += `${YELLOW}${BOLD}${title[i]}${RESET}`;
      }
      // Draw "RUNNER" subtitle
      const subStart = dinoStart + title.length + 1;
      for (let i = 0; i < subtitle.length; i++) {
        const lineLen = subtitle[i].length;
        const col = Math.max(1, Math.floor((cols - lineLen) / 2) + 1);
        out += cur(subStart + i, col);
        out += `${GREEN}${BOLD}${subtitle[i]}${RESET}`;
      }

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

      // Blinking prompt
      const promptText = '▶  PRESS SPACE TO START  ◀';
      const promptCol  = Math.max(1, Math.floor((cols - promptText.length) / 2) + 1);
      out += cur(CONTROLS_ROW, promptCol);
      out += blinkOn
        ? `${CYAN}${BOLD}${promptText}${RESET}`
        : ' '.repeat(promptText.length);

      write(out);
    }, 60);
  });
}

// ─── Game Over Handler ────────────────────────────────────────────────────────
function handleGameOver(score, speed, cols, rows, cleanup, resolve) {
  const high  = isNewHighScore(score);
  const boxW  = 48;
  const boxH  = high ? 12 : 10;
  const boxCol = Math.max(1, Math.floor((cols - boxW) / 2) + 1);
  const boxRow = Math.max(1, Math.floor((rows - boxH) / 2) + 1);
  const inner = boxW - 2;

  // Restore raw mode
  try { process.stdin.setRawMode(true); } catch {}
  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  function drawPanel(nameInput, phase) {
    let out = CLEAR + HIDE_CURSOR;

    // Box top
    out += cur(boxRow, boxCol) + `${RED}${BOLD}┌${'─'.repeat(inner)}┐${RESET}`;
    for (let r = boxRow + 1; r < boxRow + boxH - 1; r++) {
      out += cur(r, boxCol)         + `${RED}${BOLD}│${RESET}`;
      out += cur(r, boxCol + boxW - 1) + `${RED}${BOLD}│${RESET}`;
    }
    out += cur(boxRow + boxH - 1, boxCol) + `${RED}${BOLD}└${'─'.repeat(inner)}┘${RESET}`;

    // Title
    out += cur(boxRow + 1, boxCol + 1);
    out += centerPad(`${RED}${BOLD}💀  GAME OVER  💀${RESET}`, inner);

    // Divider
    out += cur(boxRow + 2, boxCol + 1);
    out += `${DIM}${'─'.repeat(inner)}${RESET}`;

    // Stats
    out += cur(boxRow + 3, boxCol + 1);
    out += centerPad(`${YELLOW}Score : ${BOLD}${score}${RESET}`, inner);
    out += cur(boxRow + 4, boxCol + 1);
    out += centerPad(`${YELLOW}Max Speed : ${BOLD}${speed.toFixed(1)}x${RESET}`, inner);

    if (high) {
      out += cur(boxRow + 5, boxCol + 1);
      out += centerPad(`${BRIGHT_GREEN}${BOLD}★  NEW HIGH SCORE!  ★${RESET}`, inner);
      out += cur(boxRow + 6, boxCol + 1);
      out += `${DIM}${'─'.repeat(inner)}${RESET}`;
      out += cur(boxRow + 7, boxCol + 1);
      out += centerPad(`${WHITE}Name: ${BOLD}${nameInput || ''}▌${RESET}`, inner);
      out += cur(boxRow + boxH - 2, boxCol + 1);
      out += centerPad(`${DIM}Type name + ENTER to save  |  ESC: skip${RESET}`, inner);
    } else {
      // Show top 3
      const top = getTopScores('dinoRunner').slice(0, 3);
      if (top.length) {
        out += cur(boxRow + 5, boxCol + 1);
        out += `${DIM}${'─'.repeat(inner)}${RESET}`;
        out += cur(boxRow + 6, boxCol + 1);
        out += centerPad(`${CYAN}${BOLD}Best Scores${RESET}`, inner);
        for (let i = 0; i < top.length; i++) {
          out += cur(boxRow + 7 + i, boxCol + 1);
          out += centerPad(`${CYAN}${i + 1}. ${top[i].name}  —  ${top[i].score}${RESET}`, inner);
        }
      }
      out += cur(boxRow + boxH - 2, boxCol + 1);
      out += centerPad(`${CYAN}${BOLD}[R] Restart   [Q] Main Menu${RESET}`, inner);
    }

    write(out);
  }

  // Phase 1: name entry if new high score
  if (high) {
    let nameInput = '';
    drawPanel(nameInput, 'name');

    const namePromise = new Promise((done) => {
      function onName(key) {
        if (key === '\r' || key === '\n') {
          if (!nameInput.trim()) nameInput = 'Player';
          addScore('dinoRunner', nameInput.trim(), score);
          process.stdin.removeAllListeners('data');
          done();
        } else if (key === '\x7F' || key === '\b') {
          nameInput = nameInput.slice(0, -1);
          drawPanel(nameInput, 'name');
        } else if (key === '\x1B' || key === 'q' || key === 'Q') {
          // Skip name entry
          process.stdin.removeAllListeners('data');
          done();
        } else if (key.length === 1 && nameInput.length < 15) {
          nameInput += key;
          drawPanel(nameInput, 'name');
        }
      }
      process.stdin.on('data', onName);
    });

    namePromise.then(() => waitAction());
  } else {
    drawPanel('', 'action');
    waitAction();
  }

  function waitAction() {
    drawPanel('', 'action');
    function onAction(key) {
      if (key === 'r' || key === 'R') {
        process.stdin.removeAllListeners('data');
        cleanup();
        // Restart game
        playDinoRunner().then(resolve);
      } else if (key === 'q' || key === 'Q' || key === '\x1B') {
        process.stdin.removeAllListeners('data');
        cleanup();
        resolve();
      }
    }
    process.stdin.on('data', onAction);
  }
}
