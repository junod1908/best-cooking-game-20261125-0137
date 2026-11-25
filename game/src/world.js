// The kitchen simulation: orders, chopping, cooking, plating and serving. Pure
// logic — no DOM, no canvas — so the same step runs in the browser and in tests.
// One fixed step advances the shift timer, the chop needles, the pans, the order
// patience and the chef; E presses are edge-triggered through `input.interact`.
import {
  BURN_GRACE_SECONDS,
  CHEF_START,
  CHOP_EDGE_PROGRESS,
  CHOP_NEEDLE_SPEED,
  CHOP_OK_PROGRESS,
  CHOP_PERFECT_HIGH,
  CHOP_PERFECT_LOW,
  CHOP_PERFECT_PROGRESS,
  COMBO_CAP,
  COMBO_STEP,
  COOK_GOLDEN_HIGH,
  COOK_GOLDEN_LOW,
  PERFECT_COIN_BONUS,
  RUSH_SECONDS,
  SHIFT_SECONDS,
  START_HEARTS,
  STATIONS,
  TARGET_COINS,
} from './config.js';
import { createRandom } from './random.js';
import { createChef, moveChef } from './player.js';
import { nearestUsableStation, stationById } from './stations.js';
import { createOrderBoard, stepOrderBoard, takeMatchingOrder, EVENT_ORDER_EXPIRED } from './orders.js';
import { COOK_SECONDS, ingredientColor, prepFor, recipeForPlate } from './recipes.js';

export const EVENT_SERVED = 1;
export const EVENT_EXPIRED = 2;
export const EVENT_PERFECT = 4;
export const EVENT_BURNT = 8;
export const EVENT_OVER = 16;
export const EVENT_WIN = 32;

export function createWorld(seed) {
  const random = createRandom(seed);
  const boards = {};
  const stoves = {};
  const plates = {};
  for (const station of STATIONS) {
    if (station.kind === 'board') boards[station.id] = null;
    if (station.kind === 'stove') stoves[station.id] = null;
    if (station.kind === 'plate') plates[station.id] = { items: [], perfects: 0 };
  }
  return {
    random,
    seed,
    elapsed: 0,
    coins: 0,
    hearts: START_HEARTS,
    combo: 0,
    bestCombo: 0,
    served: 0,
    perfects: 0,
    burnt: 0,
    chef: createChef(CHEF_START.x, CHEF_START.y),
    board: createOrderBoard(random),
    boards,
    stoves,
    plates,
    over: false,
    won: false,
    flash: null,
    rush: false,
  };
}

export function resetWorld(world, seed) {
  const fresh = createWorld(seed ?? world.seed);
  Object.keys(world).forEach((key) => delete world[key]);
  Object.assign(world, fresh);
}

function setFlash(world, text) {
  world.flash = { text, ttl: 1.6 };
}

function isRush(world) {
  return world.elapsed >= SHIFT_SECONDS - RUSH_SECONDS;
}

function chopHit(world, slot) {
  const needle = slot.needle;
  let gained;
  let perfect = false;
  if (needle >= CHOP_PERFECT_LOW && needle <= CHOP_PERFECT_HIGH) {
    gained = CHOP_PERFECT_PROGRESS;
    perfect = true;
  } else if (needle >= 0.24 && needle <= 0.76) {
    gained = CHOP_OK_PROGRESS;
  } else {
    gained = CHOP_EDGE_PROGRESS;
  }
  slot.progress = Math.min(1, slot.progress + gained);
  if (perfect) {
    slot.perfect = true;
    world.combo += 1;
    world.bestCombo = Math.max(world.bestCombo, world.combo);
    world.perfects += 1;
    return EVENT_PERFECT;
  }
  return 0;
}

function servePlate(world, plate) {
  const recipe = recipeForPlate(plate.items);
  if (!recipe) {
    setFlash(world, 'No order wants this dish yet');
    return 0;
  }
  const order = takeMatchingOrder(world.board, recipe.id);
  if (!order) {
    setFlash(world, 'No order wants this dish yet');
    return 0;
  }
  const patienceBonus = Math.round((order.patience / order.patienceMax) * 10);
  const perfectBonus = plate.perfects * PERFECT_COIN_BONUS;
  const multiplier = 1 + Math.min(world.combo, 20) * COMBO_STEP;
  const earned = Math.round((order.price + patienceBonus + perfectBonus) * Math.min(multiplier, COMBO_CAP));
  world.coins += earned;
  world.served += 1;
  world.combo += 1;
  world.bestCombo = Math.max(world.bestCombo, world.combo);
  setFlash(world, `Served ${order.name}! +${earned} coins`);
  if (world.coins >= TARGET_COINS) {
    world.over = true;
    world.won = true;
    return EVENT_SERVED | EVENT_WIN;
  }
  return EVENT_SERVED;
}

/** One E press at the station the chef stands beside. Returns event bits. */
function interact(world) {
  const chef = world.chef;
  const station = nearestUsableStation(chef.x, chef.y);
  if (!station) return 0;
  const hands = chef.hands;

  if (station.kind === 'pantry') {
    if (hands) {
      setFlash(world, 'Hands full');
      return 0;
    }
    chef.hands = { kind: 'ingredient', ingredient: station.ingredient, state: 'raw', perfect: false };
    return 0;
  }

  if (station.kind === 'board') {
    const slot = world.boards[station.id];
    if (!slot) {
      if (hands?.kind === 'ingredient' && hands.state === 'raw' && prepFor(hands.ingredient) === 'chop') {
        world.boards[station.id] = {
          ingredient: hands.ingredient,
          progress: 0,
          needle: world.random.next(),
          needleDir: world.random.next() < 0.5 ? -1 : 1,
          perfect: false,
        };
        chef.hands = null;
      } else if (hands) {
        setFlash(world, 'This needs chopping first');
      }
      return 0;
    }
    if (slot.progress < 1) return chopHit(world, slot);
    if (!hands) {
      chef.hands = { kind: 'ingredient', ingredient: slot.ingredient, state: 'chopped', perfect: slot.perfect };
      world.boards[station.id] = null;
    } else {
      setFlash(world, 'Hands full');
    }
    return 0;
  }

  if (station.kind === 'stove') {
    const slot = world.stoves[station.id];
    if (!slot) {
      if (hands?.kind === 'ingredient' && hands.state === 'raw' && prepFor(hands.ingredient) === 'cook') {
        world.stoves[station.id] = {
          ingredient: hands.ingredient,
          progress: 0,
          perfect: false,
          burnt: false,
          burnTimer: 0,
        };
        chef.hands = null;
      } else if (hands) {
        setFlash(world, 'This needs cooking first');
      }
      return 0;
    }
    if (slot.burnt) {
      if (!hands) {
        chef.hands = { kind: 'ingredient', ingredient: slot.ingredient, state: 'burnt', perfect: false };
        world.stoves[station.id] = null;
        world.burnt += 1;
        return EVENT_BURNT;
      }
      setFlash(world, 'Hands full');
      return 0;
    }
    if (slot.progress >= COOK_GOLDEN_LOW && slot.progress <= COOK_GOLDEN_HIGH) {
      if (!hands) {
        chef.hands = { kind: 'ingredient', ingredient: slot.ingredient, state: 'cooked', perfect: true };
        world.stoves[station.id] = null;
        world.combo += 1;
        world.bestCombo = Math.max(world.bestCombo, world.combo);
        world.perfects += 1;
        return EVENT_PERFECT;
      }
      setFlash(world, 'Hands full');
      return 0;
    }
    if (slot.progress >= 1) {
      if (!hands) {
        chef.hands = { kind: 'ingredient', ingredient: slot.ingredient, state: 'cooked', perfect: false };
        world.stoves[station.id] = null;
      } else {
        setFlash(world, 'Hands full');
      }
      return 0;
    }
    setFlash(world, 'Not ready yet — wait for the golden band');
    return 0;
  }

  if (station.kind === 'plate') {
    const plate = world.plates[station.id];
    if (hands?.kind === 'ingredient') {
      if (hands.state === 'burnt') {
        setFlash(world, 'Burnt! Toss it in the trash');
        return 0;
      }
      // A raw ingredient is plate-ready only when it needs no preparation
      // (bun, cheese); anything else must be chopped or cooked first.
      if (hands.state === 'raw' && prepFor(hands.ingredient) !== 'none') {
        setFlash(world, 'Prepare it first');
        return 0;
      }
      if (plate.items.includes(hands.ingredient)) {
        setFlash(world, 'Already on the plate');
        return 0;
      }
      plate.items.push(hands.ingredient);
      if (hands.perfect) plate.perfects += 1;
      chef.hands = null;
      return 0;
    }
    if (hands?.kind === 'plate') {
      setFlash(world, 'One plate at a time');
      return 0;
    }
    if (plate.items.length > 0) {
      chef.hands = { kind: 'plate', items: [...plate.items], perfects: plate.perfects, from: station.id };
      world.plates[station.id] = { items: [], perfects: 0 };
    }
    return 0;
  }

  if (station.kind === 'serve') {
    if (hands?.kind !== 'plate') {
      setFlash(world, 'Bring a finished plate here');
      return 0;
    }
    const events = servePlate(world, hands);
    if (events & EVENT_SERVED) chef.hands = null;
    return events;
  }

  if (station.kind === 'trash') {
    if (!hands) return 0;
    if (hands.kind === 'plate' && hands.from) {
      world.plates[hands.from] = { items: [], perfects: 0 };
    }
    chef.hands = null;
    world.combo = 0;
    setFlash(world, 'Tossed');
    return 0;
  }

  return 0;
}

export function stepWorld(world, dt, input) {
  if (world.over) return 0;
  let events = 0;
  world.elapsed += dt;
  world.rush = isRush(world);
  if (world.flash) {
    world.flash.ttl -= dt;
    if (world.flash.ttl <= 0) world.flash = null;
  }

  moveChef(world.chef, input.dx, input.dy, dt);
  if (input.interact) events |= interact(world);

  for (const id of Object.keys(world.boards)) {
    const slot = world.boards[id];
    if (slot && slot.progress < 1) {
      slot.needle += slot.needleDir * CHOP_NEEDLE_SPEED * dt;
      if (slot.needle >= 1) { slot.needle = 1; slot.needleDir = -1; }
      if (slot.needle <= 0) { slot.needle = 0; slot.needleDir = 1; }
    }
  }
  for (const id of Object.keys(world.stoves)) {
    const slot = world.stoves[id];
    if (!slot) continue;
    if (slot.progress < 1) {
      slot.progress += dt / COOK_SECONDS[slot.ingredient];
    } else if (!slot.burnt) {
      slot.burnTimer += dt;
      if (slot.burnTimer >= BURN_GRACE_SECONDS) slot.burnt = true;
    }
  }

  const orderEvents = stepOrderBoard(world.board, dt, world.elapsed, SHIFT_SECONDS, world.rush);
  if (orderEvents & EVENT_ORDER_EXPIRED) {
    world.hearts -= 1;
    world.combo = 0;
    setFlash(world, 'An order walked out! -1 heart');
    events |= EVENT_EXPIRED;
    if (world.hearts <= 0) {
      world.over = true;
      world.won = false;
      return events | EVENT_OVER;
    }
  }

  if (world.elapsed >= SHIFT_SECONDS) {
    world.over = true;
    world.won = world.coins >= TARGET_COINS;
    return events | EVENT_OVER;
  }
  return events;
}

export { ingredientColor, stationById };
