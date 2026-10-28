'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const gameState = require('../gameState');

// ─── Score helpers ────────────────────────────────────────────────────────────
const SCORES_FILE = path.join(__dirname, '../../scores.json');

function loadScores() {
  try {
    return JSON.parse(fs.readFileSync(SCORES_FILE, 'utf8'));
  } catch {
    return { flappyBird: [], dinoRunner: [], snake: [] };
  }
}

function saveScore(name, score) {
  const scores = loadScores();
  if (!Array.isArray(scores.flappyBird)) scores.flappyBird = [];
  scores.flappyBird.push({ name, score, date: new Date().toLocaleDateString() });
  scores.flappyBird.sort((a, b) => b.score - a.score);
  scores.flappyBird = scores.flappyBird.slice(0, 5);
  fs.writeFileSync(SCORES_FILE, JSON.stringify(scores, null, 2));
}

function getTopScore() {
  const scores = loadScores();
  const list = scores.flappyBird;
  if (!Array.isArray(list) || list.length === 0) return 0;
  return list[0].score || 0;
}

// ─── ANSI helpers ─────────────────────────────────────────────────────────────
const ESC          = '\x1B';
const CLEAR        = `${ESC}[2J${ESC}[H`;
const HIDE_CURSOR  = `${ESC}[?25l`;
const SHOW_CURSOR  = `${ESC}[?25h`;
const RESET        = `${ESC}[0m`;
const BOLD         = `${ESC}[1m`;
const RED          = `${ESC}[31m`;
const GREEN        = `${ESC}[32m`;
const YELLOW       = `${ESC}[33m`;
const CYAN         = `${ESC}[36m`;
const BRIGHT_GREEN = `${ESC}[92m`;

function moveTo(row, col) {
  return `${ESC}[${row};${col}H`;
}

function write(s) {
  process.stdout.write(s);
}

// ─── Game constants ───────────────────────────────────────────────────────────
const GRAVITY       = 0.4;
const JUMP_VELOCITY = -2.5;
const PIPE_WIDTH    = 4;
const PIPE_GAP      = 8;
const PIPE_SPEED    = 1;
const TICK_MS       = 80;

// ─── Pipe factory ─────────────────────────────────────────────────────────────
function makePipe(x, gameHeight) {
  const topHeight = Math.floor(Math.random() * (gameHeight - PIPE_GAP - 4)) + 2;
  return { x, topHeight };
}

// ─── Start screen ─────────────────────────────────────────────────────────────
function showStartScreen(cols, rows) {
  write(CLEAR + HIDE_CURSOR);

  const titleLines = [
    ' ███████ ██       █████  ██████  ██████  ██    ██ ',
    ' ██      ██      ██   ██ ██   ██ ██   ██  ██  ██  ',
    ' █████   ██      ███████ ██████  ██████    ████   ',
    ' ██      ██      ██   ██ ██      ██         ██    ',
    ' ██      ███████ ██   ██ ██      ██         ██    ',
  ];
  const subtitleLine = '    B I R D  —  T e r m i n a l  E d i t i o n    ';

  const birdArt = [
    '    .--.',
    "   ( o.o)",
    "    \\>  /",
    "   _/ \\_",
  ];

  // Draw title centered
  const titleWidth = titleLines[0].length;
  const titleCol = Math.max(1, Math.floor((cols - titleWidth) / 2) + 1);
  write(YELLOW + BOLD);
  for (let i = 0; i < titleLines.length; i++) {
    write(moveTo(2 + i, titleCol) + titleLines[i]);
  }
  write(RESET);

  // Subtitle
  const subCol = Math.max(1, Math.floor((cols - subtitleLine.length) / 2) + 1);
  write(moveTo(2 + titleLines.length + 1, subCol) + CYAN + subtitleLine + RESET);

  // Bird art
  const birdRow = 2 + titleLines.length + 3;
  const birdCol = Math.floor(cols / 2) - 4;
  write(YELLOW + BOLD);
  for (let i = 0; i < birdArt.length; i++) {
    write(moveTo(birdRow + i, birdCol) + birdArt[i]);
  }
  write(RESET);

  // Instructions box
  const instructions = [
    `${CYAN}╔══════════════════════════════════╗${RESET}`,
    `${CYAN}║${RESET}  ${BOLD}${YELLOW}Controls:${RESET}                        ${CYAN}║${RESET}`,
    `${CYAN}╠══════════════════════════════════╣${RESET}`,
    `${CYAN}║${RESET}  ${GREEN}[SPACE]${RESET}  Flap wings              ${CYAN}║${RESET}`,
    `${CYAN}║${RESET}  ${GREEN}[Q/ESC]${RESET}  Quit to main menu       ${CYAN}║${RESET}`,
    `${CYAN}╠══════════════════════════════════╣${RESET}`,
    `${CYAN}║${RESET}  Navigate through the pipes!      ${CYAN}║${RESET}`,
    `${CYAN}║${RESET}  Don't hit the walls or pipes!    ${CYAN}║${RESET}`,
    `${CYAN}╠══════════════════════════════════╣${RESET}`,
    `${CYAN}║${RESET}  ${YELLOW + BOLD}Press SPACE to begin...${RESET}         ${CYAN}║${RESET}`,
    `${CYAN}╚══════════════════════════════════╝${RESET}`,
  ];

  const boxWidth = 36;
  const boxCol = Math.max(1, Math.floor((cols - boxWidth) / 2) + 1);
  const boxRow = birdRow + birdArt.length + 2;
  for (let i = 0; i < instructions.length; i++) {
    write(moveTo(boxRow + i, boxCol) + instructions[i]);
  }
}

// ─── Game over screen ─────────────────────────────────────────────────────────
function showGameOverScreen(cols, rows, score, isNewHighScore) {
  write(CLEAR + HIDE_CURSOR);

  const lines = [
    `${RED}${BOLD}╔══════════════════════════════╗${RESET}`,
    `${RED}${BOLD}║          GAME  OVER          ║${RESET}`,
    `${RED}${BOLD}╚══════════════════════════════╝${RESET}`,
    '',
    `      ${YELLOW}${BOLD}Final Score: ${score}${RESET}`,
    '',
  ];

  if (isNewHighScore && score > 0) {
    lines.push(`  ${BRIGHT_GREEN}${BOLD}🎉 NEW HIGH SCORE! 🎉${RESET}`);
    lines.push('');
  }

  lines.push(`  ${CYAN}[R] Restart   [Q] Main Menu${RESET}`);

  const boxH = lines.length;
  const startRow = Math.max(1, Math.floor((rows - boxH) / 2));
  const contentWidth = 32;
  const startCol = Math.max(1, Math.floor((cols - contentWidth) / 2) + 1);

  for (let i = 0; i < lines.length; i++) {
    write(moveTo(startRow + i, startCol) + lines[i]);
  }
}

// ─── Name entry ───────────────────────────────────────────────────────────────
async function promptForName(cols, rows) {
  return new Promise((resolve) => {
    try { process.stdin.setRawMode(false); } catch {}
    process.stdin.resume();

    const promptRow = Math.floor(rows / 2) + 5;
    const promptCol = Math.max(1, Math.floor(cols / 2) - 15);
    write(moveTo(promptRow, promptCol) + YELLOW + BOLD + 'Enter your name: ' + RESET + SHOW_CURSOR);

    let name = '';

    function onData(chunk) {
      const ch = chunk.toString();
      // Handle Enter
      if (ch === '\n' || ch === '\r') {
        process.stdin.removeListener('data', onData);
        write(HIDE_CURSOR);
        try { process.stdin.setRawMode(true); } catch {}
        resolve(name.trim() || 'Anonymous');
        return;
      }
      // Handle backspace
      if (ch === '\x7F' || ch === '\b') {
        if (name.length > 0) {
          name = name.slice(0, -1);
          write('\b \b');
        }
        return;
      }
      // Printable chars
      if (ch >= ' ' && name.length < 20) {
        name += ch;
        write(ch);
      }
    }

    process.stdin.on('data', onData);
  });
}

// ─── Main exported function ───────────────────────────────────────────────────
async function playFlappyBird() {
  return new Promise((resolve) => {
    const cols = process.stdout.columns || 80;
    const rows = process.stdout.rows || 24;

    const GAME_WIDTH  = cols;
    const GAME_HEIGHT = rows - 2;
    const BIRD_X      = Math.floor(GAME_WIDTH / 4);

    // ── Pipe characters set ──
    const PIPE_CHARS = new Set(['║', '█', '╔', '╗', '╚', '╝', '═']);

    // ── State ──
    let birdY        = GAME_HEIGHT / 2;
    let birdVelocity = 0;
    let pipes        = [];
    let score        = 0;
    let gameRunning  = false;
    let gameOver     = false;
    let gameInterval = null;
    let currentKeyHandler = null;
    let roundStartTime = null;

    // ── Input management ──
    function setKeyHandler(fn) {
      if (currentKeyHandler) {
        process.stdin.removeListener('data', currentKeyHandler);
      }
      currentKeyHandler = fn;
      if (fn) {
        try {
          process.stdin.setRawMode(true);
          process.stdin.resume();
          process.stdin.setEncoding('utf8');
        } catch {}
        process.stdin.on('data', fn);
      }
    }

    function clearKeyHandler() {
      if (currentKeyHandler) {
        process.stdin.removeListener('data', currentKeyHandler);
        currentKeyHandler = null;
      }
    }

    // ── Cleanup & exit ──
    function cleanup() {
      if (gameInterval) { clearInterval(gameInterval); gameInterval = null; }
      clearKeyHandler();
    }

    function exitToMenu() {
      cleanup();
      write(SHOW_CURSOR + CLEAR);
      resolve();
    }

    // ── Init pipes ──
    function initPipes() {
      pipes = [];
      const spacing = Math.floor(GAME_WIDTH / 2);
      pipes.push(makePipe(GAME_WIDTH, GAME_HEIGHT));
      pipes.push(makePipe(GAME_WIDTH + spacing, GAME_HEIGHT));
    }

    // ── Render one frame ──
    function render() {
      const totalRows = GAME_HEIGHT + 1; // row 0 = status bar, rows 1..GAME_HEIGHT = play field

      // Build 2D buffer
      const frame = [];
      for (let r = 0; r < totalRows; r++) {
        frame.push(new Array(GAME_WIDTH).fill(' '));
      }

      // Status bar (frame row 0)
      const statusText = `Score: ${score}  |  [SPACE] Flap  [Q] Quit`;
      for (let c = 0; c < Math.min(statusText.length, GAME_WIDTH); c++) {
        frame[0][c] = statusText[c];
      }

      // Sky dots
      for (let r = 1; r < GAME_HEIGHT; r++) {
        for (let c = 0; c < GAME_WIDTH; c++) {
          if ((r * 7 + c * 3) % 23 === 0) frame[r][c] = '.';
        }
      }

      // Ground (frame row GAME_HEIGHT)
      for (let c = 0; c < GAME_WIDTH; c++) {
        frame[GAME_HEIGHT][c] = '═';
      }

      // Pipes (frame rows 1..GAME_HEIGHT-1)
      for (const pipe of pipes) {
        const px = pipe.x;
        if (px + PIPE_WIDTH <= 0 || px >= GAME_WIDTH) continue;

        for (let pc = 0; pc < PIPE_WIDTH; pc++) {
          const col = px + pc;
          if (col < 0 || col >= GAME_WIDTH) continue;

          // Top pipe: frame rows 1..pipe.topHeight
          for (let r = 1; r <= pipe.topHeight && r < totalRows; r++) {
            if (r === pipe.topHeight) {
              frame[r][col] = pc === 0 ? '╔' : pc === PIPE_WIDTH - 1 ? '╗' : '═';
            } else {
              frame[r][col] = (pc === 0 || pc === PIPE_WIDTH - 1) ? '║' : '█';
            }
          }

          // Bottom pipe: frame rows (pipe.topHeight + PIPE_GAP + 1)..(GAME_HEIGHT - 1)
          const bottomStart = pipe.topHeight + PIPE_GAP + 1;
          for (let r = bottomStart; r < GAME_HEIGHT && r < totalRows; r++) {
            if (r === bottomStart) {
              frame[r][col] = pc === 0 ? '╚' : pc === PIPE_WIDTH - 1 ? '╝' : '═';
            } else {
              frame[r][col] = (pc === 0 || pc === PIPE_WIDTH - 1) ? '║' : '█';
            }
          }
        }
      }

      // Bird position in frame coordinates
      const birdFrameRow = Math.floor(birdY) + 1; // +1 for status bar
      const birdInBounds = birdFrameRow >= 1 && birdFrameRow < GAME_HEIGHT && BIRD_X >= 0 && BIRD_X < GAME_WIDTH;

      // Render to string
      const out = [CLEAR, HIDE_CURSOR];
      for (let r = 0; r < totalRows; r++) {
        out.push(moveTo(r + 1, 1));
        if (r === 0) {
          // Status bar: yellow
          out.push(YELLOW + frame[r].join('') + RESET);
        } else if (r === GAME_HEIGHT) {
          // Ground: cyan
          out.push(CYAN + frame[r].join('') + RESET);
        } else {
          // Play field
          let line = '';
          let inColor = false;
          for (let c = 0; c < GAME_WIDTH; c++) {
            const ch = frame[r][c];
            const isBird = birdInBounds && r === birdFrameRow && c === BIRD_X;

            if (isBird) {
              if (inColor) { line += RESET; inColor = false; }
              line += YELLOW + BOLD + '@' + RESET;
            } else if (PIPE_CHARS.has(ch)) {
              if (!inColor) { line += GREEN; inColor = true; }
              line += ch;
            } else {
              if (inColor) { line += RESET; inColor = false; }
              line += ch;
            }
          }
          if (inColor) line += RESET;
          out.push(line);
        }
      }
      write(out.join(''));
    }

    // ── Tick ──
    function tick() {
      if (!gameRunning || gameOver) return;

      // Physics
      birdVelocity += GRAVITY;
      birdY += birdVelocity;

      // Move pipes & score
      for (const pipe of pipes) {
        pipe.x -= PIPE_SPEED;
        if (pipe.x + PIPE_WIDTH === BIRD_X) {
          score++;
        }
      }

      // Recycle pipes that scrolled off
      pipes = pipes.filter(p => p.x + PIPE_WIDTH > 0);

      // Ensure we always have pipes approaching
      const maxPipeX = pipes.reduce((m, p) => Math.max(m, p.x), 0);
      if (maxPipeX < GAME_WIDTH) {
        pipes.push(makePipe(Math.max(GAME_WIDTH, maxPipeX + Math.floor(GAME_WIDTH / 2)), GAME_HEIGHT));
      }

      // Bounds collision
      if (birdY < 0 || birdY >= GAME_HEIGHT) {
        clearInterval(gameInterval);
        gameInterval = null;
        gameOver = true;
        gameRunning = false;
        handleGameOver();
        return;
      }

      // Pipe collision
      const birdRow = Math.floor(birdY);
      for (const pipe of pipes) {
        if (BIRD_X >= pipe.x && BIRD_X <= pipe.x + PIPE_WIDTH - 1) {
          if (birdRow < pipe.topHeight || birdRow >= pipe.topHeight + PIPE_GAP) {
            clearInterval(gameInterval);
            gameInterval = null;
            gameOver = true;
            gameRunning = false;
            handleGameOver();
            return;
          }
        }
      }

      render();
    }

    // ── Handle game over (async) ──
    async function handleGameOver() {
      clearKeyHandler();

      const durationSeconds = roundStartTime ? Math.max(0, Math.round((Date.now() - roundStartTime) / 1000)) : 0;
      gameState.recordCompletedSession('Flappy Bird', score, durationSeconds);

      const topScore = getTopScore();
      const isNewHighScore = score > 0 && score > topScore;

      showGameOverScreen(cols, rows, score, isNewHighScore);

      if (isNewHighScore) {
        const name = await promptForName(cols, rows);
        saveScore(name, score);
        // Re-draw game over screen after name entry
        showGameOverScreen(cols, rows, score, isNewHighScore);
      }

      // Attach game-over key handler
      setKeyHandler(function onGameOverKey(key) {
        if (key === 'r' || key === 'R') {
          clearKeyHandler();
          startGame();
        } else if (
          key === 'q' || key === 'Q' ||
          key === '\x1B' || key === '\r' || key === '\n'
        ) {
          exitToMenu();
        }
      });
    }

    // ── Start / restart game ──
    function startGame() {
      birdY        = GAME_HEIGHT / 2;
      birdVelocity = 0;
      score        = 0;
      gameOver     = false;
      gameRunning  = true;
      roundStartTime = Date.now();

      initPipes();
      render();

      gameInterval = setInterval(tick, TICK_MS);

      setKeyHandler(function onPlayKey(key) {
        if (!gameRunning || gameOver) return;
        if (key === ' ') {
          birdVelocity = JUMP_VELOCITY;
        } else if (key === 'q' || key === 'Q' || key === '\x1B') {
          exitToMenu();
        }
      });
    }

    // ── Show start screen and wait for SPACE ──
    showStartScreen(cols, rows);

    setKeyHandler(function onStartKey(key) {
      if (key === ' ') {
        clearKeyHandler();
        startGame();
      } else if (key === 'q' || key === 'Q' || key === '\x1B') {
        exitToMenu();
      }
    });
  });
}

module.exports = { play: playFlappyBird };
