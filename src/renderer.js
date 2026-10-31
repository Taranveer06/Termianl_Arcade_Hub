'use strict';

const colors = {
  red: 31,
  green: 32,
  yellow: 33,
  blue: 34,
  magenta: 35,
  cyan: 36,
  white: 37,
  brightRed: 91,
  brightGreen: 92,
  brightYellow: 93,
  brightBlue: 94,
  brightMagenta: 95,
  brightCyan: 96,
  brightWhite: 97,
  bgBlack: 40
};

function clear() {
  process.stdout.write('\x1B[2J\x1B[H');
}

function moveCursor(x, y) {
  process.stdout.write(`\x1B[${y};${x}H`);
}

function hideCursor() {
  process.stdout.write('\x1B[?25l');
}

function showCursor() {
  process.stdout.write('\x1B[?25h');
}

function color(text, colorCode) {
  return `\x1B[${colorCode}m${text}\x1B[0m`;
}

function bold(text) {
  return `\x1B[1m${text}\x1B[0m`;
}

function drawBox(x, y, width, height, colorCode) {
  const top = '┌' + '─'.repeat(width - 2) + '┐';
  const mid = '│' + ' '.repeat(width - 2) + '│';
  const bot = '└' + '─'.repeat(width - 2) + '┘';

  const applyColor = (str) => colorCode ? color(str, colorCode) : str;

  moveCursor(x, y);
  process.stdout.write(applyColor(top));

  for (let i = 1; i < height - 1; i++) {
    moveCursor(x, y + i);
    process.stdout.write(applyColor(mid));
  }

  moveCursor(x, y + height - 1);
  process.stdout.write(applyColor(bot));
}

function writeAt(x, y, text, colorCode) {
  moveCursor(x, y);
  if (colorCode !== undefined) {
    process.stdout.write(color(text, colorCode));
  } else {
    process.stdout.write(text);
  }
}

function getTerminalSize() {
  return {
    cols: process.stdout.columns || 80,
    rows: process.stdout.rows || 24
  };
}

function centerText(text, width) {
  const len = text.length;
  if (len >= width) return text;
  const pad = Math.floor((width - len) / 2);
  return ' '.repeat(pad) + text + ' '.repeat(width - len - pad);
}

function drawAsciiArt(x, y, lines, colorCode) {
  lines.forEach((line, i) => {
    moveCursor(x, y + i);
    if (colorCode !== undefined) {
      process.stdout.write(color(line, colorCode));
    } else {
      process.stdout.write(line);
    }
  });
}

module.exports = {
  clear,
  moveCursor,
  hideCursor,
  showCursor,
  color,
  bold,
  colors,
  drawBox,
  writeAt,
  getTerminalSize,
  centerText,
  drawAsciiArt
};

// Auto layout dimensions
