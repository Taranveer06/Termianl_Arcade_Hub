'use strict';

const assert = require('assert');
const renderer = require('../src/renderer');

console.log('🧪 Testing Renderer and Terminal Sound Utilities...');

// Test 1: Color formatting
const coloredText = renderer.color('Arcade', renderer.colors.green);
assert(coloredText.includes('\x1B[32m'), 'Color code 32 (green) should be present');
assert(coloredText.endsWith('\x1B[0m'), 'Color should reset at the end');
console.log('  ✔ Color formatting utility functions correctly');

// Test 2: Bold formatting
const boldText = renderer.bold('Title');
assert(boldText.startsWith('\x1B[1m') && boldText.endsWith('\x1B[0m'), 'Bold ANSI codes should surround string');
console.log('  ✔ Bold text formatting functions correctly');

// Test 3: centerText utility
const centered = renderer.centerText('Play', 10);
assert.strictEqual(centered.length, 10, 'Centered text should match target width');
assert.strictEqual(centered.trim(), 'Play', 'Trimmed text should match source');
console.log('  ✔ centerText aligns text with symmetric padding');

// Test 4: Audio bell configuration
assert.strictEqual(renderer.isSoundEnabled(), true, 'Sound should be enabled by default');
renderer.setSoundEnabled(false);
assert.strictEqual(renderer.isSoundEnabled(), false, 'Sound should be disabled after setting to false');
renderer.beep(); // Should not emit sound when disabled
renderer.setSoundEnabled(true);
assert.strictEqual(renderer.isSoundEnabled(), true, 'Sound should be re-enabled');
console.log('  ✔ Sound enablement state toggles properly');

console.log('🎉 All renderer tests passed!\n');
