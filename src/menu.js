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
  '     █████╗ ██████╗  ██████╗ █████╗ ██████╗ ███████╗',
  '    ██╔══██╗██╔══██╗██╔════╝██╔══██╗██╔══██╗██╔════╝',
  '    ███████║██████╔╝██║     ███████║██║  ██║█████╗  ',
  '    ██╔══██║██╔══██╗██║     ██╔══██║██║  ██║██╔══╝  ',
  '    ██║  ██║██║  ██║╚██████╗██║  ██║██████╔╝███████╗',
  '    ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚═════╝ ╚══════╝'
];

const MENU_ITEMS = [
  { emoji: '🐦', name: 'Play Flappy Bird',       gameKey: 'Flappy Bird', desc: 'Flap wings & navigate pipe gaps!' },
  { emoji: '🦕', name: 'Play Dino Runner',       gameKey: 'Dino Runner', desc: 'Leap over obstacles at ramping speed!' },
  { emoji: '🐍', name: 'Play Snake',             gameKey: 'Snake',       desc: 'Eat food & grow longer without crashing!' },
  { emoji: '🏆', name: 'Global Leaderboard',     gameKey: null,          desc: 'Top 5 scores per game across all players' },
  { emoji: '📜', name: 'My Game History',         gameKey: null,          desc: 'Personal game sessions and timestamps' },
  { emoji: '📊', name: 'Player Statistics',       gameKey: null,          desc: 'Personal stats, averages and records' },
  { emoji: '🚪', name: 'Exit',                   gameKey: null,          desc: 'Leave the arcade' }
];

function drawMenu(selectedIndex, player) {
  const { cols, rows } = renderer.getTerminalSize();
  renderer.clear();
  renderer.hideCursor();

  // Outer neon double border
  renderer.drawDoubleBox(1, 1, cols, rows, renderer.colors.brightCyan);

  // Center title banner
  const titleStartY = 2;
  const titleStartX = Math.max(2, Math.floor((cols - 62) / 2));
  renderer.drawAsciiArt(titleStartX, titleStartY, ASCII_TITLE, renderer.colors.brightYellow);

  // Welcome & Player status bar
  const username = player ? player.username : 'PLAYER';
  const tagline = `⚡ WELCOME, ${username.toUpperCase()}! | RETRO ARCADE HUB READY ⚡`;
  const tagX = Math.max(2, Math.floor((cols - tagline.length) / 2));
  const tagY = titleStartY + ASCII_TITLE.length + 1;
  renderer.writeAt(tagX, tagY, tagline, renderer.colors.brightGreen);

  // Arcade quick stats summary
  let arcadeTotal = 0;
  let arcadeHigh = 0;
  try {
    arcadeTotal = statisticsRepository.getTotalGamesPlayed();
    arcadeHigh = statisticsRepository.getHighestScore();
  } catch (_) {}
  const statsBar = `[ Arcade Stats: ${arcadeTotal} Sessions Recorded | All-Time High Score: ${arcadeHigh} ]`;
  const statsBarX = Math.max(2, Math.floor((cols - statsBar.length) / 2));
  renderer.writeAt(statsBarX, tagY + 1, statsBar, renderer.colors.cyan);

  // Fetch personal high scores for all games
  let playerHighs = {};
  if (player && player.player_id) {
    try {
      playerHighs = sessionRepository.getPlayerAllHighScores(player.player_id);
    } catch (_) {}
  }

  // Menu items list
  const menuStartY = tagY + 3;
  MENU_ITEMS.forEach((item, i) => {
    let bestText = '';
    if (item.gameKey) {
      const best = playerHighs[item.gameKey] || 0;
      bestText = ` [Best: ${best}]`;
    }

    const prefix = `${i + 1}. ${item.emoji} ${item.name.padEnd(20)}${bestText.padEnd(14)}`;
    const desc = `— ${item.desc}`;
    const fullLine = `${prefix}  ${desc}`;
    const maxLineLen = cols - 8;
    const truncatedLine = fullLine.length > maxLineLen ? fullLine.slice(0, maxLineLen - 1) + '…' : fullLine;
    const lineX = Math.max(4, Math.floor((cols - truncatedLine.length) / 2));
    const lineY = menuStartY + i;

    if (lineY < rows - 2) {
      if (i === selectedIndex) {
        renderer.moveCursor(lineX - 2, lineY);
        process.stdout.write(
          `\x1B[${renderer.colors.bgCyan}m\x1B[30m\x1B[1m ▶ ${truncatedLine} ◀ \x1B[0m`
        );
      } else {
        renderer.writeAt(lineX, lineY, truncatedLine, renderer.colors.brightWhite);
      }
    }
  });

  // Bottom navigation instructions
  const hint = '↑/↓ Navigate   |   ENTER Select   |   1-7 Direct Pick   |   Q / ESC Exit';
  renderer.writeAt(Math.max(2, Math.floor((cols - hint.length) / 2)), rows - 1, hint, renderer.colors.brightYellow);
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
  renderer.drawDoubleBox(1, 1, cols, rows, renderer.colors.brightYellow);

  const title = '🏆  GLOBAL ARCADE LEADERBOARD (TOP 5 PER GAME)  🏆';
  renderer.writeAt(Math.max(2, Math.floor((cols - title.length) / 2)), 2, title, renderer.colors.brightYellow);

  const gameDefs = [
    { name: 'Flappy Bird', emoji: '🐦' },
    { name: 'Dino Runner', emoji: '🦕' },
    { name: 'Snake',       emoji: '🐍' }
  ];

  const colWidth = Math.max(24, Math.floor((cols - 8) / 3));

  gameDefs.forEach((g, gi) => {
    const startX = 4 + gi * colWidth;
    renderer.writeAt(startX, 4, `${g.emoji} ${g.name}`, renderer.colors.brightCyan);
    renderer.writeAt(startX, 5, '═'.repeat(Math.min(colWidth - 3, 26)), renderer.colors.cyan);

    try {
      const gameRecord = gameRepository.getGameByName(g.name);
      if (!gameRecord) {
        renderer.writeAt(startX, 7, 'No game record', renderer.colors.white);
        return;
      }

      const topScores = sessionRepository.getTopScores(gameRecord.game_id, 5);
      if (!topScores || topScores.length === 0) {
        renderer.writeAt(startX, 7, 'No scores recorded yet', renderer.colors.white);
      } else {
        const medals = ['🥇', '🥈', '🥉', '4.', '5.'];
        topScores.forEach((entry, i) => {
          const medal = medals[i] || `${i + 1}.`;
          const user = (entry.username || 'Anonymous').slice(0, 9).padEnd(9);
          const sc = String(entry.score).padStart(5);
          const dateStr = entry.played_at ? entry.played_at.slice(0, 10) : '';
          const line = `${medal} ${user} ${sc} (${dateStr})`;
          const colorCode = i === 0 ? renderer.colors.brightYellow : (i === 1 ? renderer.colors.brightWhite : (i === 2 ? renderer.colors.yellow : renderer.colors.white));
          renderer.writeAt(startX, 7 + i * 2, line, colorCode);
        });
      }
    } catch (err) {
      renderer.writeAt(startX, 7, `Error: ${err.message}`, renderer.colors.red);
    }
  });

  const hint = 'Press any key to return to the Main Menu...';
  renderer.writeAt(Math.max(2, Math.floor((cols - hint.length) / 2)), rows - 2, hint, renderer.colors.brightMagenta);

  await waitForKey();
}

async function showPlayerHistory(player) {
  const { cols, rows } = renderer.getTerminalSize();
  renderer.clear();
  renderer.drawDoubleBox(1, 1, cols, rows, renderer.colors.brightBlue);

  const username = player ? player.username : 'PLAYER';
  const title = `📜  PERSONAL GAME HISTORY FOR: ${username.toUpperCase()}  📜`;
  renderer.writeAt(Math.max(2, Math.floor((cols - title.length) / 2)), 2, title, renderer.colors.brightCyan);

  try {
    const history = player ? sessionRepository.getPlayerHistory(player.player_id) : [];

    const header = '  #   GAME            SCORE    DURATION     DATE & TIME';
    renderer.writeAt(4, 4, header, renderer.colors.brightYellow);
    renderer.writeAt(4, 5, '═'.repeat(Math.min(cols - 8, 65)), renderer.colors.cyan);

    if (!history || history.length === 0) {
      renderer.writeAt(6, 7, 'No games played yet! Jump into Flappy Bird, Dino Runner, or Snake to record your sessions.', renderer.colors.white);
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
    renderer.writeAt(6, 7, `Error reading player history: ${err.message}`, renderer.colors.red);
  }

  const hint = 'Press any key to return to the Main Menu...';
  renderer.writeAt(Math.max(2, Math.floor((cols - hint.length) / 2)), rows - 2, hint, renderer.colors.brightMagenta);

  await waitForKey();
}

async function showPlayerStatistics(player) {
  const { cols, rows } = renderer.getTerminalSize();
  renderer.clear();
  renderer.drawDoubleBox(1, 1, cols, rows, renderer.colors.brightGreen);

  const username = player ? player.username : 'PLAYER';
  const title = `📊  STATISTICS DASHBOARD: ${username.toUpperCase()}  📊`;
  renderer.writeAt(Math.max(2, Math.floor((cols - title.length) / 2)), 2, title, renderer.colors.brightGreen);

  try {
    const stats = player ? statisticsRepository.getPlayerStatistics(player.player_id) : null;
    const startX = 6;

    renderer.writeAt(startX, 4, '── PERSONAL SUMMARY ──────────────────────────────────────', renderer.colors.brightYellow);
    renderer.writeAt(startX, 5, `• Total Sessions Played : ${stats ? stats.totalSessions : 0}`, renderer.colors.white);
    renderer.writeAt(startX, 6, `• Personal High Score   : ${stats ? stats.maxScore : 0}`, renderer.colors.brightYellow);
    renderer.writeAt(startX, 7, `• Average Score         : ${stats ? stats.avgScore : 0}`, renderer.colors.white);
    renderer.writeAt(startX, 8, `• Most Played Game      : ${stats ? stats.mostPlayedGame : 'None'}`, renderer.colors.white);

    renderer.writeAt(startX, 10, '── BREAKDOWN PER GAME ────────────────────────────────────', renderer.colors.brightYellow);
    if (stats && stats.gameBreakdown && stats.gameBreakdown.length > 0) {
      stats.gameBreakdown.forEach((gb, idx) => {
        const line = `• ${gb.game_name.padEnd(12)} : ${String(gb.sessions).padStart(2)} sessions  |  High: ${String(gb.max_score).padStart(4)}  |  Avg: ${gb.avg_score}`;
        renderer.writeAt(startX, 11 + idx, line, renderer.colors.white);
      });
    } else {
      renderer.writeAt(startX, 11, '• No game records available.', renderer.colors.white);
    }

    // Global arcade benchmarks
    const globalTotal = statisticsRepository.getTotalGamesPlayed();
    const globalAvg = statisticsRepository.getAverageScore();
    const globalHigh = statisticsRepository.getHighestScore();
    const mostPopular = statisticsRepository.getMostPlayedGame();

    renderer.writeAt(startX, 15, '── GLOBAL ARCADE BENCHMARKS ──────────────────────────────', renderer.colors.brightCyan);
    renderer.writeAt(startX, 16, `• Total Arcade Sessions : ${globalTotal}`, renderer.colors.white);
    renderer.writeAt(startX, 17, `• Global Average Score  : ${Number(globalAvg).toFixed(1)}`, renderer.colors.white);
    renderer.writeAt(startX, 18, `• All-Time Arcade High  : ${globalHigh}`, renderer.colors.brightGreen);
    renderer.writeAt(startX, 19, `• Most Popular Game     : ${mostPopular}`, renderer.colors.white);
  } catch (err) {
    renderer.writeAt(6, 6, `Error loading player statistics: ${err.message}`, renderer.colors.red);
  }

  const hint = 'Press any key to return to the Main Menu...';
  renderer.writeAt(Math.max(2, Math.floor((cols - hint.length) / 2)), rows - 2, hint, renderer.colors.brightMagenta);

  await waitForKey();
}

async function showMainMenu(player) {
  let selectedIndex = 0;
  let running = true;

  // Handle window resizing
  const onResize = () => {
    if (running) {
      drawMenu(selectedIndex, player);
    }
  };
  process.stdout.on('resize', onResize);

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
          renderer.writeAt(4, 6, 'Press any key to return to menu...', renderer.colors.white);
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
          renderer.writeAt(4, 6, 'Press any key to return to menu...', renderer.colors.white);
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
          renderer.writeAt(4, 6, 'Press any key to return to menu...', renderer.colors.white);
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
        process.stdout.removeListener('resize', onResize);
        renderer.clear();
        renderer.showCursor();
        console.log('\nThanks for playing Terminal Arcade Hub! Goodbye!\n');
        process.exit(0);
        break;
      }
    }
  }

  process.stdout.removeListener('resize', onResize);
}

module.exports = {
  showMainMenu,
  showGlobalLeaderboard,
  showPlayerHistory,
  showPlayerStatistics
};
