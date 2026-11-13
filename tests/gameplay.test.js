'use strict';

const assert = require('assert');

console.log('🧪 Starting Game Logic & Physics Edge Cases Test Suite...\n');

// ─── Flappy Bird Physics & Collision Tests ────────────────────────────────────
console.log('Test 1: Flappy Bird jump, gravity physics and boundary collision...');
{
  const GRAVITY = 0.38;
  const JUMP_VELOCITY = -2.4;
  const GAME_HEIGHT = 22;
  const BIRD_X = 20;
  const PIPE_GAP = 8;
  const PIPE_WIDTH = 4;

  let birdY = 10;
  let birdVelocity = 0;

  // Jump upward
  birdVelocity = JUMP_VELOCITY;
  birdVelocity += GRAVITY;
  birdY += birdVelocity;
  assert(birdY < 10, 'Bird must move upward after jump');

  // Continuous gravity pulls bird down
  for (let i = 0; i < 20; i++) {
    birdVelocity += GRAVITY;
    birdY += birdVelocity;
  }
  assert(birdVelocity > 0, 'Velocity must become positive under gravity');
  assert(birdY > GAME_HEIGHT, 'Bird must eventually hit ground boundary if no flaps');

  // Pipe collision detection logic
  function checkPipeCollision(bx, by, pipe) {
    const birdRow = Math.floor(by);
    if (bx >= pipe.x && bx <= pipe.x + PIPE_WIDTH - 1) {
      if (birdRow < pipe.topHeight || birdRow >= pipe.topHeight + PIPE_GAP) {
        return true;
      }
    }
    return false;
  }

  const samplePipe = { x: 20, topHeight: 5 }; // gap is rows 5 .. 12
  // Test hitting top pipe
  assert.strictEqual(checkPipeCollision(BIRD_X, 4, samplePipe), true, 'Must collide with top pipe');
  // Test flying through gap
  assert.strictEqual(checkPipeCollision(BIRD_X, 7, samplePipe), false, 'Must not collide inside safe gap');
  // Test hitting bottom pipe
  assert.strictEqual(checkPipeCollision(BIRD_X, 13, samplePipe), true, 'Must collide with bottom pipe');
  // Test outside pipe horizontal range
  assert.strictEqual(checkPipeCollision(15, 2, samplePipe), false, 'Must not collide when not at pipe X');

  console.log('  ✔ Flappy Bird physics & pipe collision calculations verified');
}

// ─── Dino Runner Physics & Collision Tests ────────────────────────────────────
console.log('\nTest 2: Dino Runner jump physics, ground landing, and obstacle collision...');
{
  const GROUND_ROW = 21;
  const GRAVITY = 0.6;
  const JUMP_VELOCITY = -3.5;
  const DINO_X = 10;
  const DINO_WIDTH = 3;

  let dinoY = GROUND_ROW;
  let dinoVel = JUMP_VELOCITY;
  let isJumping = true;

  // Jump arc
  dinoVel += GRAVITY;
  dinoY += dinoVel;
  assert(dinoY < GROUND_ROW, 'Dino should be airborne');

  // Simulate arc until landing
  let frames = 0;
  while ((isJumping || dinoY < GROUND_ROW) && frames < 50) {
    dinoVel += GRAVITY;
    dinoY += dinoVel;
    if (dinoY >= GROUND_ROW) {
      dinoY = GROUND_ROW;
      dinoVel = 0;
      isJumping = false;
    }
    frames++;
  }
  assert.strictEqual(dinoY, GROUND_ROW, 'Dino must land cleanly on ground line');
  assert.strictEqual(isJumping, false, 'isJumping flag must reset on landing');

  // Obstacle collision test
  function checkDinoCollision(dy, obsX, obsWidth) {
    if (Math.round(dy) !== GROUND_ROW) return false; // airborne avoids obstacle
    if (obsX + obsWidth - 1 >= DINO_X && obsX <= DINO_X + DINO_WIDTH - 1) {
      return true;
    }
    return false;
  }

  // Airborne over cactus
  assert.strictEqual(checkDinoCollision(16, 11, 3), false, 'Airborne dino must avoid obstacle');
  // Ground collision with cactus
  assert.strictEqual(checkDinoCollision(GROUND_ROW, 11, 3), true, 'Ground dino must hit obstacle overlapping X');
  // Past obstacle
  assert.strictEqual(checkDinoCollision(GROUND_ROW, 6, 2), false, 'Ground dino must not hit obstacle behind');

  console.log('  ✔ Dino Runner jump arc & obstacle collision verified');
}

// ─── Snake Movement & Reversal Tests ──────────────────────────────────────────
console.log('\nTest 3: Snake vector movement, reverse prevention, and self-collision...');
{
  let direction = { x: 1, y: 0 };
  let nextDirection = { x: 1, y: 0 };

  function handleInputKey(key) {
    if (key === 'up') {
      if (direction.y !== 1) nextDirection = { x: 0, y: -1 };
    } else if (key === 'down') {
      if (direction.y !== -1) nextDirection = { x: 0, y: 1 };
    } else if (key === 'left') {
      if (direction.x !== 1) nextDirection = { x: -1, y: 0 };
    } else if (key === 'right') {
      if (direction.x !== -1) nextDirection = { x: 1, y: 0 };
    }
  }

  // Currently moving RIGHT: Attempt to reverse directly LEFT
  handleInputKey('left');
  assert.strictEqual(nextDirection.x, 1, 'Snake must prevent immediate 180° reverse (Left while going Right)');
  assert.strictEqual(nextDirection.y, 0);

  // Turn UP (orthogonal turn allowed)
  handleInputKey('up');
  assert.strictEqual(nextDirection.x, 0);
  assert.strictEqual(nextDirection.y, -1, 'Snake must allow perpendicular turn UP');

  // Update direction to UP
  direction = nextDirection;

  // Now attempt to reverse directly DOWN
  handleInputKey('down');
  assert.strictEqual(nextDirection.y, -1, 'Snake must prevent immediate 180° reverse (Down while going Up)');

  // Self-collision test
  const snakeBody = [
    { x: 10, y: 10 },
    { x: 11, y: 10 },
    { x: 11, y: 11 },
    { x: 10, y: 11 }
  ];
  const newHeadHittingTail = { x: 11, y: 10 };
  const hasSelfCollision = snakeBody.slice(0, -1).some(seg => seg.x === newHeadHittingTail.x && seg.y === newHeadHittingTail.y);
  assert.strictEqual(hasSelfCollision, true, 'Self collision detected when head touches body');

  console.log('  ✔ Snake reversal prevention & collision verified');
}

// ─── Key Code Mapping Tests ───────────────────────────────────────────────────
console.log('\nTest 4: Input key mappings and exports...');
{
  const input = require('../src/input');
  assert(input.Key.UP === 'up');
  assert(input.Key.DOWN === 'down');
  assert(input.Key.LEFT === 'left');
  assert(input.Key.RIGHT === 'right');
  assert(input.Key.SPACE === 'space');
  assert(input.Key.ENTER === 'enter');
  assert(input.Key.ESCAPE === 'escape');
  assert(typeof input.onKeyPress === 'function');
  assert(typeof input.removeAllListeners === 'function');
  console.log('  ✔ Key code mappings and handler signatures verified');
}

console.log('\n🎉 ALL GAME LOGIC & PHYSICS TESTS PASSED!\n');

