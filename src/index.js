
'use strict';
process.stdout.write('\x1B]0;Terminal Arcade Hub\x07');
process.stdout.write('\x1B[?25l');
process.stdin.setRawMode(true);
process.stdin.resume();
const menu = require('./menu');
function cleanup() {
  process.stdout.write('\x1B[?25h\x1B[2J\x1B[H');
  console.log('Thanks for playing Terminal Arcade Hub! Goodbye!');
  process.exit(0);
}
process.on('SIGINT', cleanup);
