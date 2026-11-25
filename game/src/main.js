// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps, and the renderer paints what is there. The game moves between four
// screens: title, play, paused and game over.
//
// ?seed=N fixes the order pattern. ?shot=cover|chop|rush|end (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, STEP, TARGET_COINS } from './config.js';
import { createWorld, EVENT_BURNT, EVENT_EXPIRED, EVENT_OVER, EVENT_PERFECT, EVENT_SERVED, EVENT_WIN, resetWorld, stepWorld } from './world.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { nearestUsableStation } from './stations.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(seed);
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let clickStationId = null;

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    resetWorld(world, seed);
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce(`Playing. Serve ${TARGET_COINS} coins before the shift ends.`);
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.coins > best) {
      best = world.coins;
      saveBest(best);
    }
    audio.stopSizzle();
    announce(world.won ? `Shift complete! ${world.coins} coins.` : `Shift over. ${world.coins} coins. Best ${best}.`);
  }

  function playSounds(events) {
    if (events & EVENT_SERVED) audio.serve();
    if (events & EVENT_PERFECT) audio.chop(true);
    if (events & EVENT_EXPIRED) audio.expire();
    if (events & EVENT_BURNT) audio.error();
    if (events & EVENT_WIN) audio.win();
  }

  function updateSizzle() {
    const cooking = Object.values(world.stoves).some((slot) => slot !== null);
    if (cooking) audio.startSizzle();
    else audio.stopSizzle();
  }

  function step(actions) {
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Muted.' : 'Sound on.');
    }
    const clicked = input.takeClickStation();
    if (clicked) clickStationId = clicked;
    let interact = Boolean(actions & ACTION_CONFIRM);
    if (clickStationId) {
      const near = nearestUsableStation(world.chef.x, world.chef.y);
      if (near && near.id === clickStationId) {
        interact = true;
        clickStationId = null;
      }
    }
    const direction = input.direction(world.chef);
    const events = stepWorld(world, STEP, { dx: direction.dx, dy: direction.dy, interact });
    playSounds(events);
    updateSizzle();
    if (events & EVENT_OVER) endGame();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = input.takeActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_OVER) {
      if (actions & ACTION_CONFIRM) {
        audio.unlock();
        startGame();
      }
    } else if (screen === SCREEN_PAUSED) {
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    } else if (screen === SCREEN_PLAY) {
      if (actions & ACTION_PAUSE) {
        screen = SCREEN_PAUSED;
        audio.stopSizzle();
        announce('Paused.');
      } else {
        // The frame's actions apply to the first step only, so one E press is
        // one interaction even when a slow frame catches up several steps.
        let first = true;
        while (accumulator >= STEP && screen === SCREEN_PLAY) {
          step(first ? actions : 0);
          first = false;
          accumulator -= STEP;
        }
      }
    }
    if (screen !== SCREEN_PLAY) accumulator = 0;
    renderer.draw(world, screen, best);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      audio.stopSizzle();
      announce('Paused.');
    }
  });

  canvas.addEventListener('pointerdown', () => audio.unlock(), { once: true });
  announce('Char & Chive. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
