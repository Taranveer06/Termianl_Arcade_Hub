
'use strict';
const renderer = require('./renderer');
const input = require('./input');

const ASCII_TITLE = [
  '████████╗███████╗██████╗ ███╗   ███╗██╗███╗   ██╗ █████╗ ██╗',
  '╚══██╔══╝██╔════╝██╔══██╗████╗ ████║██║████╗  ██║██╔══██╗██║',
  '   ██║   █████╗  ██████╔╝██╔████╔██║██║██╔██╗ ██║███████║██║',
  '   ██║   ██╔══╝  ██╔══██╗██║╚██╔╝██║██║██║╚██╗██║██╔══██║██║',
  '   ██║   ███████╗██║  ██║██║ ╚═╝ ██║██║██║ ╚████║██║  ██║███████╗',
  '   ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝'
];

const MENU_ITEMS = [
  { emoji: '🐦', name: 'Flappy Bird',    desc: 'Navigate through pipes! Press SPACE to flap.' },
  { emoji: '🦕', name: 'Dino Runner',    desc: 'Jump over obstacles! Press SPACE to jump.' },
  { emoji: '🐍', name: 'Snake',          desc: 'Eat food, grow longer! Use arrow keys or WASD.' },
  { emoji: '🏆', name: 'High Scores',    desc: 'View top scores for each game.' },
  { emoji: '📋', name: 'Instructions',   desc: 'How to play each game.' },
  { emoji: '🚪', name: 'Exit',           desc: 'Quit the arcade.' }
];

function drawMenu(selectedIndex) {
  const { cols, rows } = renderer.getTerminalSize();
  renderer.clear();
  renderer.drawBox(1, 1, cols, rows, renderer.colors.cyan);
  renderer.drawAsciiArt(Math.floor((cols - 65) / 2), 2, ASCII_TITLE, renderer.colors.brightYellow);
}

module.exports = { drawMenu };
