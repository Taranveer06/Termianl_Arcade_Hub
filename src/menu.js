'use strict';

const renderer = require('./renderer');
const input = require('./input');
const sessionRepository = require('./database/sessionRepository');
const gameRepository = require('./database/gameRepository');
const statisticsRepository = require('./database/statisticsRepository');
const gameState = require('./gameState');

const ASCII_TITLE = [
  '████████╗███████╗██████╗ ███╗   ███╗██╗███╗   ██╗ █████╗ ██╗',
  '╚══██╔══╝██╔════╝██╔══██╗████╗ ████║██║████╗  ██║██╔══██╗██║',
  '   ██║   █████╗  ██████╔╝██╔████╔██║██║██╔██╗ ██║███████║██║',
  '   ██║   ██╔══╝  ██╔══██╗██║╚██╔╝██║██║██║╚██╗██║██╔══██║██║',
  '   ██║   ███████╗██║  ██║██║ ╚═╝ ██║██║██║ ╚████║██║  ██║███████╗',
  '   ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝',
  '',
  ' █████╗ ██████╗  ██████╗ █████╗ ██████╗ ███████╗',
  '██╔══██╗██╔══██╗██╔════╝██╔══██╗██╔══██╗██╔════╝',
  '███████║██████╔╝██║     ███████║██║  ██║█████╗  ',
  '██╔══██║██╔══██╗██║     ██╔══██║██║  ██║██╔══╝  ',
  '██║  ██║██║  ██║╚██████╗██║  ██║██████╔╝███████╗',
  '╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚═════╝ ╚══════╝',
  '',
  '██╗  ██╗██╗   ██╗██████╗ ',
  '██║  ██║██║   ██║██╔══██╗',
  '███████║██║   ██║██████╔╝',
  '██╔══██║██║   ██║██╔══██╗',
  '██║  ██║╚██████╔╝██████╔╝',
  '╚═╝  ╚═╝ ╚═════╝ ╚═════╝ '
];

const MENU_ITEMS = [
  { emoji: '🐦', name: 'Play Flappy Bird',        desc: 'Navigate through pipes! Press SPACE to flap.' },
  { emoji: '🦕', name: 'Play Dino Runner',        desc: 'Jump over obstacles! Press SPACE to jump.' },
  { emoji: '🐍', name: 'Play Snake',              desc: 'Eat food, grow longer! Use arrow keys or WASD.' },
  { emoji: '🌍', name: 'View Global Leaderboard', desc: 'Top scores for each game from database.' },
  { emoji: '📜', name: 'View My Game History',    desc: 'Your personal session history and scores.' },
  { emoji: '👤', name: 'View Player Statistics',  desc: 'Your stats, high scores and aggregates.' },
  { emoji: '🚪', name: 'Exit',                    desc: 'Quit the arcade.' }
];

function drawMenu(selectedIndex, player) {
  const { cols, rows } = renderer.getTerminalSize();
  renderer.clear();

  // Outer border box
  renderer.drawBox(1, 1, cols, rows, renderer.colors.cyan);

  // Center title block
  const titleStartY = 2;
  const titleStartX = Math.max(2, Math.floor((cols - 65) / 2));
  renderer.drawAsciiArt(titleStartX, titleStartY, ASCII_TITLE, renderer.colors.brightYellow);

  // Tagline with player name
  const username = player ? player.username : 'Player';
  const tagline = `[ LOGGED IN AS: ${username.toUpperCase()} | READY TO PLAY ]`;
  const tagX = Math.max(2, Math.floor((cols - tagline.length) / 2));
  const tagY = titleStartY + ASCII_TITLE.length + 1;
  renderer.writeAt(tagX, tagY, tagline, renderer.colors.cyan);

  // Menu items
  const menuStartY = tagY + 2;
  MENU_ITEMS.forEach((item, i) => {
    const prefix = `  ${i + 1}. ${item.emoji} ${item.name}`;
    const desc = `  — ${item.desc}`;
    const line = prefix + desc;
    const lineX = Math.max(4, Math.floor((cols - line.length) / 2));
    const lineY = menuStartY + i * 2;

    if (i === selectedIndex) {
      renderer.moveCursor(lineX - 1, lineY);
      process.stdout.write(
        `\x1B[${renderer.colors.brightGreen}m\x1B[1m ${line} \x1B[0m`
      );
    } else {
      renderer.writeAt(lineX, lineY, line, renderer.colors.white);
    }
  });

  // Bottom hint
  const hint = '↑↓ Navigate   Enter Select   1-7 Direct Choice   Q Quit';
  renderer.writeAt(Math.max(2, Math.floor((cols - hint.length) / 2)), rows - 1, hint, renderer.colors.brightCyan);

  renderer.moveCursor(1, rows);
}

function waitForKey() {
  return new Promise((resolve) => {
    const cleanup = input.onKeyPress(() => {
      cleanup();
      resolve();
    });
  });
}

async function showGlobalLeaderboard() {
  const { cols, rows } = renderer.getTerminalSize();
  renderer.clear();
  renderer.drawBox(1, 1, cols, rows, renderer.colors.yellow);

  const title = '🏆  GLOBAL LEADERBOARD (TOP 5 PER GAME)  🏆';
  renderer.writeAt(Math.max(2, Math.floor((cols - title.length) / 2)), 2, title, renderer.colors.brightYellow);

  const gameDefs = [
    { name: 'Flappy Bird', emoji: '🐦' },
    { name: 'Dino Runner', emoji: '🦕' },
    { name: 'Snake',       emoji: '🐍' }
  ];

  const colWidth = Math.max(24, Math.floor((cols - 6) / 3));

  gameDefs.forEach((g, gi) => {
    const startX = 4 + gi * colWidth;
    renderer.writeAt(startX, 4, `${g.emoji} ${g.name}`, renderer.colors.brightCyan);
    renderer.writeAt(startX, 5, '─'.repeat(Math.min(colWidth - 2, 28)), renderer.colors.cyan);

    try {
      const gameRecord = gameRepository.getGameByName(g.name);
      if (!gameRecord) {
        renderer.writeAt(startX, 6, 'No game data', renderer.colors.white);
        return;
      }

      const topScores = sessionRepository.getTopScores(gameRecord.game_id, 5);
      if (!topScores || topScores.length === 0) {
        renderer.writeAt(startX, 6, 'No scores yet', renderer.colors.white);
      } else {
        topScores.forEach((entry, i) => {
          const user = (entry.username || 'Anonymous').slice(0, 8).padEnd(8);
          const sc = String(entry.score).padStart(5);
          const dateStr = entry.played_at ? entry.played_at.slice(0, 10) : '';
          const line = `${i + 1}. ${user} ${sc} (${dateStr})`;
          renderer.writeAt(startX, 6 + i * 2, line, renderer.colors.white);
        });
      }
    } catch (err) {
      renderer.writeAt(startX, 6, 'Error loading scores', renderer.colors.red);
    }
  });

  const hint = 'Press any key to return to the menu...';
  renderer.writeAt(Math.max(2, Math.floor((cols - hint.length) / 2)), rows - 2, hint, renderer.colors.brightMagenta);

  await waitForKey();
}

async function showPlayerHistory(player) {
  const { cols, rows } = renderer.getTerminalSize();
  renderer.clear();
  renderer.drawBox(1, 1, cols, rows, renderer.colors.blue);

  const username = player ? player.username : 'PLAYER';
  const title = `📜  GAME HISTORY FOR: ${username.toUpperCase()}  📜`;
  renderer.writeAt(Math.max(2, Math.floor((cols - title.length) / 2)), 2, title, renderer.colors.brightCyan);

  try {
    const history = player ? sessionRepository.getPlayerHistory(player.player_id) : [];

    const header = '  #   GAME            SCORE    DURATION     DATE & TIME';
    renderer.writeAt(4, 4, header, renderer.colors.brightYellow);
    renderer.writeAt(4, 5, '─'.repeat(Math.min(cols - 8, 65)), renderer.colors.cyan);

    if (!history || history.length === 0) {
      renderer.writeAt(6, 7, 'No games played yet. Play a game to record your session!', renderer.colors.white);
    } else {
      const maxRows = Math.min(history.length, rows - 9);
      for (let i = 0; i < maxRows; i++) {
        const h = history[i];
        const num = String(i + 1).padStart(2);
        const gameName = (h.game_name || 'Unknown').padEnd(14);
        const score = String(h.score).padStart(6);
        const dur = `${h.duration_seconds || 0}s`.padStart(8);
        const date = h.played_at || '';
        const line = `  ${num}  ${gameName}  ${score}    ${dur}     ${date}`;
        renderer.writeAt(4, 6 + i, line, renderer.colors.white);
      }
    }
  } catch (err) {
    renderer.writeAt(6, 7, 'Error reading player history from database.', renderer.colors.red);
  }

  const hint = 'Press any key to return to the menu...';
  renderer.writeAt(Math.max(2, Math.floor((cols - hint.length) / 2)), rows - 2, hint, renderer.colors.brightMagenta);

  await waitForKey();
}

async function showPlayerStatistics(player) {
  const { cols, rows } = renderer.getTerminalSize();
  renderer.clear();
  renderer.drawBox(1, 1, cols, rows, renderer.colors.green);

  const username = player ? player.username : 'PLAYER';
  const title = `👤  STATISTICS FOR: ${username.toUpperCase()}  👤`;
  renderer.writeAt(Math.max(2, Math.floor((cols - title.length) / 2)), 2, title, renderer.colors.brightGreen);

  try {
    const history = player ? sessionRepository.getPlayerHistory(player.player_id) : [];
    const totalSessions = history.length;

    let highestScore = 0;
    let scoreSum = 0;
    const gameCounts = { 'Flappy Bird': 0, 'Dino Runner': 0, 'Snake': 0 };
    const gameHighs = { 'Flappy Bird': 0, 'Dino Runner': 0, 'Snake': 0 };

    history.forEach((h) => {
      if (h.score > highestScore) highestScore = h.score;
      scoreSum += h.score;
      if (gameCounts[h.game_name] !== undefined) {
        gameCounts[h.game_name]++;
        if (h.score > gameHighs[h.game_name]) gameHighs[h.game_name] = h.score;
      }
    });

    const avgScore = totalSessions > 0 ? (scoreSum / totalSessions).toFixed(1) : 0;

    let mostPlayed = 'None';
    let maxPlayedCount = 0;
    for (const [name, count] of Object.entries(gameCounts)) {
      if (count > maxPlayedCount) {
        maxPlayedCount = count;
        mostPlayed = `${name} (${count} games)`;
      }
    }

    const startX = 6;
    renderer.writeAt(startX, 4, '── PERSONAL SUMMARY ──────────────────────────', renderer.colors.yellow);
    renderer.writeAt(startX, 5, `• Total Games Played:  ${totalSessions}`, renderer.colors.white);
    renderer.writeAt(startX, 6, `• Overall High Score:  ${highestScore}`, renderer.colors.brightYellow);
    renderer.writeAt(startX, 7, `• Average Score:       ${avgScore}`, renderer.colors.white);
    renderer.writeAt(startX, 8, `• Most Played Game:    ${mostPlayed}`, renderer.colors.white);

    renderer.writeAt(startX, 10, '── BREAKDOWN PER GAME ────────────────────────', renderer.colors.yellow);
    renderer.writeAt(startX, 11, `• Flappy Bird:  ${gameCounts['Flappy Bird']} played | High Score: ${gameHighs['Flappy Bird']}`, renderer.colors.white);
    renderer.writeAt(startX, 12, `• Dino Runner:  ${gameCounts['Dino Runner']} played | High Score: ${gameHighs['Dino Runner']}`, renderer.colors.white);
    renderer.writeAt(startX, 13, `• Snake:        ${gameCounts['Snake']} played | High Score: ${gameHighs['Snake']}`, renderer.colors.white);

    // Global stats comparison
    const globalTotal = statisticsRepository.getTotalGamesPlayed();
    const globalAvg = statisticsRepository.getAverageScore();
    const globalHigh = statisticsRepository.getHighestScore();

    renderer.writeAt(startX, 15, '── GLOBAL ARCADE BENCHMARKS ──────────────────', renderer.colors.cyan);
    renderer.writeAt(startX, 16, `• Arcade Total Sessions: ${globalTotal}`, renderer.colors.white);
    renderer.writeAt(startX, 17, `• Arcade Average Score:  ${Number(globalAvg).toFixed(1)}`, renderer.colors.white);
    renderer.writeAt(startX, 18, `• Arcade All-Time High:  ${globalHigh}`, renderer.colors.brightGreen);
  } catch (err) {
    renderer.writeAt(6, 6, 'Error loading player statistics.', renderer.colors.red);
  }

  const hint = 'Press any key to return to the menu...';
  renderer.writeAt(Math.max(2, Math.floor((cols - hint.length) / 2)), rows - 2, hint, renderer.colors.brightMagenta);

  await waitForKey();
}

async function showMainMenu(player) {
  let selectedIndex = 0;
  let running = true;

  while (running) {
    drawMenu(selectedIndex, player);

    const result = await new Promise((resolve) => {
      const cleanup = input.onKeyPress((key) => {
        if (key === input.Key.UP) {
          selectedIndex = (selectedIndex - 1 + MENU_ITEMS.length) % MENU_ITEMS.length;
          drawMenu(selectedIndex, player);
        } else if (key === input.Key.DOWN) {
          selectedIndex = (selectedIndex + 1) % MENU_ITEMS.length;
          drawMenu(selectedIndex, player);
        } else if (key === input.Key.ENTER) {
          cleanup();
          resolve({ action: selectedIndex });
        } else if (key === input.Key.Q || key === input.Key.ESCAPE) {
          cleanup();
          resolve({ action: 6 }); // Exit
        } else if (['1', '2', '3', '4', '5', '6', '7'].includes(key)) {
          cleanup();
          resolve({ action: parseInt(key, 10) - 1 });
        }
      });
    });

    input.removeAllListeners();

    switch (result.action) {
      case 0: {
        // Play Flappy Bird
        try {
          const flappyBird = require('./games/flappyBird');
          await flappyBird.play();
        } catch (e) {
          renderer.clear();
          renderer.writeAt(4, 4, `Flappy Bird error: ${e.message}`, renderer.colors.red);
          renderer.writeAt(4, 6, 'Press any key to return...', renderer.colors.white);
          await waitForKey();
        }
        break;
      }
      case 1: {
        // Play Dino Runner
        try {
          const dinoRunner = require('./games/dinoRunner');
          await dinoRunner.play();
        } catch (e) {
          renderer.clear();
          renderer.writeAt(4, 4, `Dino Runner error: ${e.message}`, renderer.colors.red);
          renderer.writeAt(4, 6, 'Press any key to return...', renderer.colors.white);
          await waitForKey();
        }
        break;
      }
      case 2: {
        // Play Snake
        try {
          const snake = require('./games/snake');
          await snake.play();
        } catch (e) {
          renderer.clear();
          renderer.writeAt(4, 4, `Snake error: ${e.message}`, renderer.colors.red);
          renderer.writeAt(4, 6, 'Press any key to return...', renderer.colors.white);
          await waitForKey();
        }
        break;
      }
      case 3: {
        // View Global Leaderboard
        await showGlobalLeaderboard();
        break;
      }
      case 4: {
        // View My Game History
        await showPlayerHistory(player);
        break;
      }
      case 5: {
        // View Player Statistics
        await showPlayerStatistics(player);
        break;
      }
      case 6: {
        // Exit
        running = false;
        renderer.clear();
        renderer.showCursor();
        console.log('\nThanks for playing Terminal Arcade Hub! Goodbye!\n');
        process.exit(0);
        break;
      }
    }
  }
}

module.exports = {
  showMainMenu,
  showGlobalLeaderboard,
  showPlayerHistory,
  showPlayerStatistics
};
