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
const WHITE        = `${ESC}[37m`;

function moveTo(row, col) {
  return `${ESC}[${row};${col}H`;
}

function write(s) {
  process.stdout.write(s);
}

// ─── Game constants ───────────────────────────────────────────────────────────
const GRAVITY         = 0.38;
const JUMP_VELOCITY   = -2.4;
const PIPE_WIDTH      = 4;
const PIPE_GAP        = 8;
const PIPE_SPEED      = 1;
const BASE_TICK_MS    = 80;
const MIN_TICK_MS     = 45;

// ─── Pipe factory ─────────────────────────────────────────────────────────────
function makePipe(x, gameHeight) {
  const topHeight = Math.floor(Math.random() * (gameHeight - PIPE_GAP - 4)) + 2;
  return { x, topHeight, scored: false };
}

// ─── Start screen ─────────────────────────────────────────────────────────────
function showStartScreen(cols, rows, personalBest, globalBest) {
  write(CLEAR + HIDE_CURSOR);

  const titleLines = [
    ' ███████╗██╗      █████╗ ██████╗ ██████╗ ██╗   ██╗',
    ' ██╔════╝██║     ██╔══██╗██╔══██╗██╔══██╗╚██╗ ██╔╝',
    ' █████╗  ██║     ███████║██████╔╝██████╔╝ ╚████╔╝ ',
    ' ██╔══╝  ██║     ██╔══██║██╔═══╝ ██╔═══╝   ╚██╔╝  ',
    ' ██║     ███████╗██║  ██║██║     ██║        ██║   ',
    ' ╚═╝     ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝        ╚═╝   '
  ];
  const subtitleLine = '─── B I R D  :  R E T R O   A R C A D E ───';

  const birdArt = [
    '    .--.',
    "   ( o.o)",
    "    \\>  /",
    "   _/ \\_",
  ];

  const titleWidth = titleLines[0].length;
  const titleCol = Math.max(1, Math.floor((cols - titleWidth) / 2) + 1);
  write(BRIGHT_YELLOW + BOLD);
  for (let i = 0; i < titleLines.length; i++) {
    write(moveTo(2 + i, titleCol) + titleLines[i]);
  }
  write(RESET);

  const subCol = Math.max(1, Math.floor((cols - subtitleLine.length) / 2) + 1);
  write(moveTo(2 + titleLines.length + 1, subCol) + BRIGHT_CYAN + subtitleLine + RESET);

  const birdRow = 2 + titleLines.length + 3;
  const birdCol = Math.max(1, Math.floor(cols / 2) - 4);
  write(YELLOW + BOLD);
  for (let i = 0; i < birdArt.length; i++) {
    write(moveTo(birdRow + i, birdCol) + birdArt[i]);
  }
  write(RESET);

  const statLine = `Personal Best: ${personalBest}   |   Arcade Record: ${globalBest}`;
  const statCol = Math.max(1, Math.floor((cols - statLine.length) / 2) + 1);
  write(moveTo(birdRow + birdArt.length + 1, statCol) + BRIGHT_GREEN + statLine + RESET);

  const instructions = [
    `${CYAN}╔══════════════════════════════════════════╗${RESET}`,
    `${CYAN}║${RESET}  ${BOLD}${YELLOW}Controls & Objectives${RESET}                   ${CYAN}║${RESET}`,
    `${CYAN}╠══════════════════════════════════════════╣${RESET}`,
    `${CYAN}║${RESET}  ${GREEN}[SPACE]${RESET}    Flap wings upward            ${CYAN}║${RESET}`,
    `${CYAN}║${RESET}  ${GREEN}[Q / ESC]${RESET}  Return to Main Menu          ${CYAN}║${RESET}`,
    `${CYAN}╠══════════════════════════════════════════╣${RESET}`,
    `${CYAN}║${RESET}  Fly through pipe gaps. Difficulty        ${CYAN}║${RESET}`,
    `${CYAN}║${RESET}  increases progressively as score climbs! ${CYAN}║${RESET}`,
    `${CYAN}╠══════════════════════════════════════════╣${RESET}`,
    `${CYAN}║${RESET}  ${BRIGHT_YELLOW + BOLD}▶ Press SPACE to launch! ◀${RESET}              ${CYAN}║${RESET}`,
    `${CYAN}╚══════════════════════════════════════════╝${RESET}`,
  ];

  const boxWidth = 44;
  const boxCol = Math.max(1, Math.floor((cols - boxWidth) / 2) + 1);
  const boxRow = birdRow + birdArt.length + 3;
  for (let i = 0; i < instructions.length; i++) {
    write(moveTo(boxRow + i, boxCol) + instructions[i]);
  }
}

// ─── Game over screen ─────────────────────────────────────────────────────────
function showGameOverScreen(cols, rows, score, personalBest, isNewPersonalBest, globalBest) {
  write(CLEAR + HIDE_CURSOR);

  const boxW = 46;
  const boxH = isNewPersonalBest ? 13 : 11;
  const startCol = Math.max(1, Math.floor((cols - boxW) / 2) + 1);
  const startRow = Math.max(1, Math.floor((rows - boxH) / 2) + 1);
  const inner = boxW - 2;

  const center = (text) => {
    // Strip ANSI for length calculation
    const rawLen = text.replace(/\x1B\[[0-9;]*[A-Za-z]/g, '').length;
    const pad = Math.max(0, Math.floor((inner - rawLen) / 2));
    return ' '.repeat(pad) + text + ' '.repeat(Math.max(0, inner - rawLen - pad));
  };

  const lines = [];
  lines.push(`${RED}${BOLD}╔${'═'.repeat(inner)}╗${RESET}`);
  lines.push(`${RED}${BOLD}║${center(`${RED}${BOLD}💀  G A M E   O V E R  💀${RESET}`)}║${RESET}`);
  lines.push(`${RED}${BOLD}╠${'═'.repeat(inner)}╣${RESET}`);
  lines.push(`${RED}${BOLD}║${center(`${YELLOW}Final Score : ${BOLD}${score}${RESET}`)}║${RESET}`);
  lines.push(`${RED}${BOLD}║${center(`${CYAN}Personal Best : ${BOLD}${Math.max(score, personalBest)}${RESET}`)}║${RESET}`);
  lines.push(`${RED}${BOLD}║${center(`${DIM}Arcade Record : ${globalBest}${RESET}`)}║${RESET}`);

  if (isNewPersonalBest && score > 0) {
    lines.push(`${RED}${BOLD}║${center(`${BRIGHT_GREEN}${BOLD}★  NEW PERSONAL BEST!  ★${RESET}`)}║${RESET}`);
    lines.push(`${RED}${BOLD}║${center(`${BRIGHT_YELLOW}Saved to SQLite Database${RESET}`)}║${RESET}`);
  }

  lines.push(`${RED}${BOLD}╠${'═'.repeat(inner)}╣${RESET}`);
  lines.push(`${RED}${BOLD}║${center(`${BRIGHT_CYAN}${BOLD}[R] Play Again   [Q / ESC] Main Menu${RESET}`)}║${RESET}`);
  lines.push(`${RED}${BOLD}╚${'═'.repeat(inner)}╝${RESET}`);

  for (let i = 0; i < lines.length; i++) {
    write(moveTo(startRow + i, startCol) + lines[i]);
  }
}

// ─── Main exported function ───────────────────────────────────────────────────
function playFlappyBird() {
  return new Promise((resolve) => {
    let active = true;

    function safeExit() {
      if (!active) return;
      active = false;
      cleanup();
      write(CLEAR + SHOW_CURSOR);
      resolve();
    }

    const cols = process.stdout.columns || 80;
    const rows = process.stdout.rows || 24;

    const GAME_WIDTH  = cols;
    const GAME_HEIGHT = rows - 2;
    const BIRD_X      = Math.max(4, Math.floor(GAME_WIDTH / 4));

    const PIPE_CHARS = new Set(['║', '█', '╔', '╗', '╚', '╝', '═']);

    // Fetch personal high score & global top score from SQLite
    let personalBest = 0;
    let globalBest = 0;
    try {
      personalBest = gameState.getPlayerHighScore('Flappy Bird') || 0;
      const topList = gameState.getGlobalTopScores('Flappy Bird', 1);
      if (topList && topList.length > 0) {
        globalBest = topList[0].score;
      }
    } catch (_) {}

    // State variables
    let birdY           = Math.floor(GAME_HEIGHT / 2);
    let birdVelocity    = 0;
    let pipes           = [];
    let score           = 0;
    let gameRunning     = false;
    let gameOver        = false;
    let gameInterval    = null;
    let currentKeyHandler = null;
    let roundStartTime  = null;
    let currentTickMs   = BASE_TICK_MS;

    function setKeyHandler(fn) {
      clearKeyHandler();
      currentKeyHandler = fn;
      if (fn) {
        try {
          if (process.stdin.isTTY) process.stdin.setRawMode(true);
          process.stdin.resume();
          process.stdin.setEncoding('utf8');
        } catch (_) {}
        process.stdin.on('data', fn);
      }
    }

    function clearKeyHandler() {
      if (currentKeyHandler) {
        process.stdin.removeListener('data', currentKeyHandler);
        currentKeyHandler = null;
      }
    }

    function cleanup() {
      if (gameInterval) {
        clearInterval(gameInterval);
        gameInterval = null;
      }
      clearKeyHandler();
    }

    function initPipes() {
      pipes = [];
      const spacing = Math.floor(GAME_WIDTH / 2);
      pipes.push(makePipe(GAME_WIDTH, GAME_HEIGHT));
      pipes.push(makePipe(GAME_WIDTH + spacing, GAME_HEIGHT));
    }

    function render() {
      const totalRows = GAME_HEIGHT + 1;
      const frame = [];
      for (let r = 0; r < totalRows; r++) {
        frame.push(new Array(GAME_WIDTH).fill(' '));
      }

      // Status HUD: Live Score, Personal Best, Speed/Difficulty, Controls
      const diffLevel = Math.min(5, Math.floor(score / 3) + 1);
      const statusText = ` Flappy Bird | Score: ${score} | Best: ${Math.max(score, personalBest)} | Level: ${diffLevel} | [SPACE] Flap  [Q] Menu`;
      for (let c = 0; c < Math.min(statusText.length, GAME_WIDTH); c++) {
        frame[0][c] = statusText[c];
      }

      // Sky background dots
      for (let r = 1; r < GAME_HEIGHT; r++) {
        for (let c = 0; c < GAME_WIDTH; c++) {
          if ((r * 7 + c * 3) % 29 === 0) frame[r][c] = '.';
        }
      }

      // Ground border
      for (let c = 0; c < GAME_WIDTH; c++) {
        frame[GAME_HEIGHT][c] = '═';
      }

      // Pipes
      for (const pipe of pipes) {
        const px = Math.round(pipe.x);
        if (px + PIPE_WIDTH <= 0 || px >= GAME_WIDTH) continue;

        for (let pc = 0; pc < PIPE_WIDTH; pc++) {
          const col = px + pc;
          if (col < 0 || col >= GAME_WIDTH) continue;

          // Top pipe
          for (let r = 1; r <= pipe.topHeight && r < totalRows; r++) {
            if (r === pipe.topHeight) {
              frame[r][col] = pc === 0 ? '╔' : pc === PIPE_WIDTH - 1 ? '╗' : '═';
            } else {
              frame[r][col] = (pc === 0 || pc === PIPE_WIDTH - 1) ? '║' : '█';
            }
          }

          // Bottom pipe
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

      // Bird position
      const birdFrameRow = Math.floor(birdY) + 1;
      const birdInBounds = birdFrameRow >= 1 && birdFrameRow < GAME_HEIGHT && BIRD_X >= 0 && BIRD_X < GAME_WIDTH;

      const out = [CLEAR, HIDE_CURSOR];
      for (let r = 0; r < totalRows; r++) {
        out.push(moveTo(r + 1, 1));
        if (r === 0) {
          out.push(BRIGHT_YELLOW + BOLD + frame[r].join('') + RESET);
        } else if (r === GAME_HEIGHT) {
          out.push(BRIGHT_CYAN + frame[r].join('') + RESET);
        } else {
          let line = '';
          let inColor = false;
          for (let c = 0; c < GAME_WIDTH; c++) {
            const ch = frame[r][c];
            const isBird = birdInBounds && r === birdFrameRow && c === BIRD_X;

            if (isBird) {
              if (inColor) { line += RESET; inColor = false; }
              line += BRIGHT_YELLOW + BOLD + '@' + RESET;
            } else if (PIPE_CHARS.has(ch)) {
              if (!inColor) { line += BRIGHT_GREEN; inColor = true; }
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

    function tick() {
      if (!gameRunning || gameOver) return;

      // Physics
      birdVelocity += GRAVITY;
      birdY += birdVelocity;

      // Move pipes & calculate score
      for (const pipe of pipes) {
        pipe.x -= PIPE_SPEED;
        if (!pipe.scored && pipe.x + PIPE_WIDTH <= BIRD_X) {
          pipe.scored = true;
          score++;

          // Progressive difficulty increase: adjust tick interval
          const newTick = Math.max(MIN_TICK_MS, BASE_TICK_MS - Math.floor(score / 3) * 5);
          if (newTick !== currentTickMs) {
            currentTickMs = newTick;
            if (gameInterval) {
              clearInterval(gameInterval);
              gameInterval = setInterval(tick, currentTickMs);
            }
          }
        }
      }

      // Recycle off-screen pipes
      pipes = pipes.filter(p => p.x + PIPE_WIDTH > 0);

      // Procedural pipe spawn
      const maxPipeX = pipes.reduce((m, p) => Math.max(m, p.x), 0);
      if (maxPipeX < GAME_WIDTH) {
        pipes.push(makePipe(Math.max(GAME_WIDTH, maxPipeX + Math.floor(GAME_WIDTH / 2)), GAME_HEIGHT));
      }

      // Bounds collision
      if (birdY < 0 || birdY >= GAME_HEIGHT) {
        triggerGameOver();
        return;
      }

      // Pipe collision
      const birdRow = Math.floor(birdY);
      for (const pipe of pipes) {
        if (BIRD_X >= pipe.x && BIRD_X <= pipe.x + PIPE_WIDTH - 1) {
          if (birdRow < pipe.topHeight || birdRow >= pipe.topHeight + PIPE_GAP) {
            triggerGameOver();
            return;
          }
        }
      }

      render();
    }

    function triggerGameOver() {
      if (gameOver) return;
      gameOver = true;
      gameRunning = false;
      if (gameInterval) {
        clearInterval(gameInterval);
        gameInterval = null;
      }

      const durationSeconds = roundStartTime ? Math.max(0, Math.round((Date.now() - roundStartTime) / 1000)) : 0;

      // Persist completed session to SQLite
      try {
        gameState.recordCompletedSession('Flappy Bird', score, durationSeconds);
      } catch (err) {
        console.error('[FlappyBird] Error recording session:', err.message);
      }

      const isNewPersonalBest = score > personalBest;
      if (isNewPersonalBest) {
        personalBest = score;
      }
      globalBest = Math.max(globalBest, score);

      showGameOverScreen(cols, rows, score, personalBest, isNewPersonalBest, globalBest);

      setKeyHandler(function onGameOverKey(chunk) {
        const key = chunk.toString();
        if (key === 'r' || key === 'R') {
          startGame();
        } else if (key === 'q' || key === 'Q' || key === '\x1B' || key === '\r' || key === '\n') {
          safeExit();
        }
      });
    }

    function startGame() {
      clearKeyHandler();
      if (gameInterval) {
        clearInterval(gameInterval);
        gameInterval = null;
      }

      birdY         = Math.floor(GAME_HEIGHT / 2);
      birdVelocity  = 0;
      score         = 0;
      gameOver      = false;
      gameRunning   = true;
      currentTickMs = BASE_TICK_MS;
      roundStartTime = Date.now();

      initPipes();
      render();

      gameInterval = setInterval(tick, currentTickMs);

      setKeyHandler(function onPlayKey(chunk) {
        const key = chunk.toString();
        if (!gameRunning || gameOver) return;
        if (key === ' ') {
          birdVelocity = JUMP_VELOCITY;
        } else if (key === 'q' || key === 'Q' || key === '\x1B') {
          safeExit();
        }
      });
    }

    // Start with start screen
    showStartScreen(cols, rows, personalBest, globalBest);

    setKeyHandler(function onStartKey(chunk) {
      const key = chunk.toString();
      if (key === ' ') {
        startGame();
      } else if (key === 'q' || key === 'Q' || key === '\x1B') {
        safeExit();
      }
    });
  });
}

module.exports = { play: playFlappyBird };
