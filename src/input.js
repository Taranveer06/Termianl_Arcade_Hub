'use strict';

const Key = {
  UP: 'up',
  DOWN: 'down',
  LEFT: 'left',
  RIGHT: 'right',
  SPACE: 'space',
  ENTER: 'enter',
  ESCAPE: 'escape',
  Q: 'q',
  W: 'w',
  A: 'a',
  S: 's',
  D: 'd',
  R: 'r'
};

function onKeyPress(callback) {
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  function handler(sequence) {
    let key = sequence;

    switch (sequence) {
      case '\x1B[A': key = Key.UP; break;
      case '\x1B[B': key = Key.DOWN; break;
      case '\x1B[C': key = Key.RIGHT; break;
      case '\x1B[D': key = Key.LEFT; break;
      case ' ':       key = Key.SPACE; break;
      case '\r':
      case '\n':      key = Key.ENTER; break;
      case '\x1B':    key = Key.ESCAPE; break;
      case 'q':
      case 'Q':       key = Key.Q; break;
      case 'w':
      case 'W':       key = Key.W; break;
      case 'a':
      case 'A':       key = Key.A; break;
      case 's':
      case 'S':       key = Key.S; break;
      case 'd':
      case 'D':       key = Key.D; break;
      case 'r':
      case 'R':       key = Key.R; break;
      default:        key = sequence; break;
    }

    callback(key, sequence);
  }

  process.stdin.on('data', handler);

  // Return cleanup function
  return function cleanup() {
    process.stdin.removeListener('data', handler);
  };
}

function removeAllListeners() {
  process.stdin.removeAllListeners('data');
}

module.exports = {
  onKeyPress,
  removeAllListeners,
  Key
};
