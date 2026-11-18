// Ember Tide: the game loop and the screens. Title -> playing -> upgrade
// choice between waves -> victory on wave 10, or game over. A ?shot=
// query stages one fixed scene instead, for screenshots.

import { BEST_KEY, FIELD, STEP, UPGRADES } from './config.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { drawGame, SCREEN_OVER, SCREEN_PAUSE, SCREEN_PLAY, SCREEN_TITLE, SCREEN_UPGRADE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';
import { EVENT_COLLECT, EVENT_DASH, EVENT_HIT, EVENT_KILL, EVENT_OVER, EVENT_SHOOT, EVENT_WAVE_CLEAR, EVENT_WIN, chooseUpgrade, createWorld, resetWorld, startWave, stepWorld } from './world.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

function fitCanvas() {
  const scale = Math.min(window.innerWidth / FIELD.width, window.innerHeight / FIELD.height);
  canvas.width = FIELD.width;
  canvas.height = FIELD.height;
  canvas.style.width = `${Math.floor(FIELD.width * scale)}px`;
  canvas.style.height = `${Math.floor(FIELD.height * scale)}px`;
}
fitCanvas();
window.addEventListener('resize', fitCanvas);

const input = createInput(canvas);
const audio = createAudio();
const world = createWorld(20261118);
let screen = SCREEN_TITLE;
let best = 0;
try {
  best = Number(window.localStorage.getItem(BEST_KEY)) || 0;
} catch {
  best = 0;
}
world.state.best = best;

function saveBest() {
  if (world.state.score > best) {
    best = world.state.score;
    world.state.best = best;
    try {
      window.localStorage.setItem(BEST_KEY, String(best));
    } catch {
      // Best score is a nicety; a browser that refuses storage still plays.
    }
  }
}

function announce(text) {
  if (statusEl) statusEl.textContent = text;
}

function playEvents(events) {
  if (events & EVENT_SHOOT) audio.play('shoot');
  if (events & EVENT_COLLECT) audio.play('collect', world.state.combo);
  if (events & EVENT_KILL) audio.play('kill');
  if (events & EVENT_DASH) audio.play('dash');
  if (events & EVENT_HIT) audio.play('hit');
  if (events & EVENT_WAVE_CLEAR) audio.play('wave');
  if (events & EVENT_WIN) { audio.play('win'); saveBest(); }
  if (events & EVENT_OVER) { audio.play('lose'); saveBest(); }
}

function startGame() {
  audio.unlock();
  resetWorld(world);
  world.state.best = best;
  startWave(world, 1);
  screen = SCREEN_PLAY;
  announce('Wave 1. Gather embers and shatter the shadows.');
}

function restart() {
  startGame();
}

function pickUpgrade(index) {
  const choice = world.choices[index];
  if (!choice) return;
  if (chooseUpgrade(world, choice.id, UPGRADES)) {
    audio.play('upgrade');
    startWave(world, world.wave + 1);
    screen = SCREEN_PLAY;
    announce(`Wave ${world.wave}. Blessing: ${choice.name}.`);
  }
}

function upgradeCardAt(x, y) {
  // Cards are drawn at x 240 + i*280, y 250, size 240x190 (see render.js).
  if (y < 250 || y > 440) return -1;
  for (let i = 0; i < 3; i += 1) {
    if (x >= 240 + i * 280 && x <= 480 + i * 280) return i;
  }
  return -1;
}

// Screenshot mode: stage one fixed scene and draw it, frozen.
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  const staged = stageShot(shot, world);
  screen = staged.screen;
  best = staged.best;
  world.state.best = best;
  drawGame(ctx, world, screen, 4, best);
  announce('Ember Tide screenshot scene.');
} else {
  let last = performance.now();
  let acc = 0;
  let time = 0;

  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    time += dt;

    if (input.wasPressed('KeyM')) {
      const muted = audio.toggleMute();
      announce(muted ? 'Sound off.' : 'Sound on.');
    }

    if (screen === SCREEN_TITLE) {
      stepWorld(world, STEP, { x: 0, y: 0 }, null, false, false);
      if (input.wasPressed('Enter') || input.wasPressed('Space') || input.wasPressed('Mouse')) startGame();
    } else if (screen === SCREEN_PLAY) {
      if (input.wasPressed('KeyP') || input.wasPressed('Escape')) {
        screen = SCREEN_PAUSE;
      } else {
        const move = input.axis();
        const dash = input.wasPressed('Space') || input.wasPressed('ShiftLeft') || input.wasPressed('ShiftRight');
        acc += dt;
        let events = 0;
        while (acc >= STEP) {
          events |= stepWorld(world, STEP, move, { x: input.mouseX, y: input.mouseY }, dash, input.mouseDown || input.mouseSeen);
          acc -= STEP;
        }
        playEvents(events);
        if (events & EVENT_WIN) screen = SCREEN_WIN;
        else if (events & EVENT_OVER) screen = SCREEN_OVER;
        else if (world.betweenWaves) screen = SCREEN_UPGRADE;
      }
    } else if (screen === SCREEN_UPGRADE) {
      if (input.wasPressed('Digit1')) pickUpgrade(0);
      else if (input.wasPressed('Digit2')) pickUpgrade(1);
      else if (input.wasPressed('Digit3')) pickUpgrade(2);
      else if (input.wasPressed('Mouse')) {
        const picked = upgradeCardAt(input.mouseX, input.mouseY);
        if (picked >= 0) pickUpgrade(picked);
      }
    } else if (screen === SCREEN_PAUSE) {
      if (input.wasPressed('KeyP') || input.wasPressed('Escape') || input.wasPressed('Enter')) screen = SCREEN_PLAY;
    } else if (screen === SCREEN_OVER || screen === SCREEN_WIN) {
      if (input.wasPressed('KeyR') || input.wasPressed('Enter') || input.wasPressed('Mouse')) restart();
    }

    drawGame(ctx, world, screen, time, best);
    input.endFrame();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
