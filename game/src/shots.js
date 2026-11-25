// Screenshot scenes behind ?shot=cover|chop|rush|end. Each one plays the real rules
// forward from a fresh world, steered by an autopilot that works the oldest order
// first — fetch, chop, cook, plate, serve — so every frame is what a real game
// looks like and the same seed always gives the same frame.
import { CHEF_RADIUS, COOK_GOLDEN_HIGH, COOK_GOLDEN_LOW, FLOOR, STATIONS, STEP, VIEW_HEIGHT, VIEW_WIDTH } from './config.js';
import { EVENT_OVER, resetWorld, stepWorld } from './world.js';
import { circleHitsRect, nearestUsableStation, solidRects, stationById, stationCenter } from './stations.js';
import { prepFor, recipeForPlate } from './recipes.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const SAMPLE = STEP;

/** Where the chef stands to use a station: just outside its nearest edge. The
 * offset is small (30) so the nearest station from the approach point is always
 * the station itself, never a neighbour. */
function approachPoint(station) {
  const centre = stationCenter(station);
  if (station.kind === 'pantry') return { x: centre.x, y: station.y + station.h + 30 };
  if (station.kind === 'board') return { x: station.x + station.w + 30, y: centre.y };
  if (station.kind === 'stove') return { x: station.x - 30, y: centre.y };
  return { x: centre.x, y: station.y - 30 };
}

function moveToward(world, point) {
  const chef = world.chef;
  const path = planPath(world, point);
  const target = path.length > 0 ? path[0] : point;
  if (path.length > 0 && Math.hypot(target.x - chef.x, target.y - chef.y) < 16) {
    path.shift();
  }
  const goal = path.length > 0 ? path[0] : point;
  const dx = goal.x - chef.x;
  const dy = goal.y - chef.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 12) return { dx: 0, dy: 0 };
  return { dx: dx / distance, dy: dy / distance };
}

// --- Grid pathfinding for the autopilot -------------------------------------
// The kitchen's counters make straight lines unreliable (a chef can wedge
// against a counter's side face), so the autopilot plans a route on a coarse
// grid and follows it. A* over 40x25 cells, 8-way moves, no diagonal through
// a blocked corner. Paths are cached per target and replanned when the target
// moves or the path runs out.
const CELL = 32;
const COLS = Math.ceil(VIEW_WIDTH / CELL);
const ROWS = Math.ceil(VIEW_HEIGHT / CELL);
const SOLIDS = solidRects();

function cellBlocked(col, row) {
  const x = col * CELL + CELL / 2;
  const y = row * CELL + CELL / 2;
  if (x < FLOOR.x || x > FLOOR.x + FLOOR.w || y < FLOOR.y || y > FLOOR.y + FLOOR.h) return true;
  return SOLIDS.some((rect) => circleHitsRect(x, y, CHEF_RADIUS + 4, rect));
}

const BLOCKED_GRID = Array.from({ length: ROWS }, (_, row) =>
  Array.from({ length: COLS }, (_, col) => cellBlocked(col, row)),
);

function cellOf(point) {
  return {
    col: Math.max(0, Math.min(COLS - 1, Math.floor(point.x / CELL))),
    row: Math.max(0, Math.min(ROWS - 1, Math.floor(point.y / CELL))),
  };
}

function nearestFreeCell(col, row) {
  if (!BLOCKED_GRID[row][col]) return { col, row };
  for (let radius = 1; radius < 6; radius += 1) {
    for (let dc = -radius; dc <= radius; dc += 1) {
      for (let dr = -radius; dr <= radius; dr += 1) {
        const c = col + dc;
        const r = row + dr;
        if (c >= 0 && c < COLS && r >= 0 && r < ROWS && !BLOCKED_GRID[r][c]) return { col: c, row: r };
      }
    }
  }
  return { col, row };
}

function findPath(from, to) {
  const start = nearestFreeCell(...Object.values(cellOf(from)));
  const goal = nearestFreeCell(...Object.values(cellOf(to)));
  const key = (col, row) => row * COLS + col;
  const open = [{ col: start.col, row: start.row, g: 0, f: 0, parent: null }];
  const best = new Map([[key(start.col, start.row), 0]]);
  const closed = new Set();
  const DIRS = [
    [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
    [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414],
  ];
  while (open.length > 0) {
    let lowest = 0;
    for (let i = 1; i < open.length; i += 1) if (open[i].f < open[lowest].f) lowest = i;
    const current = open.splice(lowest, 1)[0];
    if (current.col === goal.col && current.row === goal.row) {
      const cells = [];
      let node = current;
      while (node) {
        cells.unshift({ x: node.col * CELL + CELL / 2, y: node.row * CELL + CELL / 2 });
        node = node.parent;
      }
      return cells;
    }
    closed.add(key(current.col, current.row));
    for (const [dc, dr, cost] of DIRS) {
      const nc = current.col + dc;
      const nr = current.row + dr;
      if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS || BLOCKED_GRID[nr][nc]) continue;
      if (dc !== 0 && dr !== 0 && (BLOCKED_GRID[current.row][nc] || BLOCKED_GRID[nr][current.col])) continue;
      const nk = key(nc, nr);
      if (closed.has(nk)) continue;
      const g = current.g + cost;
      if (best.has(nk) && best.get(nk) <= g) continue;
      best.set(nk, g);
      const h = Math.abs(nc - goal.col) + Math.abs(nr - goal.row);
      open.push({ col: nc, row: nr, g, f: g + h, parent: current });
    }
  }
  return [];
}

let pathCache = { key: '', path: [] };

function planPath(world, point) {
  const cacheKey = `${Math.round(point.x / 16)}:${Math.round(point.y / 16)}`;
  const cached = pathCache.path;
  const stale =
    pathCache.key !== cacheKey ||
    cached.length === 0 ||
    Math.hypot(cached[0].x - world.chef.x, cached[0].y - world.chef.y) > 160;
  if (stale) {
    const cells = findPath({ x: world.chef.x, y: world.chef.y }, point);
    // Drop the first cell (the chef's own) and aim at the real target last.
    const waypoints = cells.slice(1);
    if (waypoints.length > 0) waypoints[waypoints.length - 1] = { x: point.x, y: point.y };
    pathCache = { key: cacheKey, path: waypoints };
  }
  return pathCache.path;
}

function stationIsNear(world, station) {
  // The world answers an E press at the nearest station, so the autopilot
  // only counts as "near" when the world would pick this station too — and
  // the chef must be standing on the approach point, so the screenshots show
  // the chef working at the station, not pressing from a corridor.
  // (With the 30 px approach points, the target station is always the nearest
  // from its own approach point.)
  const point = approachPoint(station);
  return (
    nearestUsableStation(world.chef.x, world.chef.y)?.id === station.id &&
    Math.hypot(world.chef.x - point.x, world.chef.y - point.y) <= 18
  );
}

/** Items already on plates, being prepared, or in the chef's hands. */
function coveredIngredients(world) {
  const covered = [];
  for (const plate of Object.values(world.plates)) covered.push(...plate.items);
  for (const slot of Object.values(world.boards)) if (slot) covered.push(slot.ingredient);
  for (const slot of Object.values(world.stoves)) if (slot) covered.push(slot.ingredient);
  if (world.chef.hands?.kind === 'ingredient') covered.push(world.chef.hands.ingredient);
  return covered;
}

function freeBoard(world) {
  return STATIONS.find((s) => s.kind === 'board' && !world.boards[s.id]) ?? null;
}

function freeStove(world) {
  return STATIONS.find((s) => s.kind === 'stove' && !world.stoves[s.id]) ?? null;
}

/** The plate to add to: one whose items fit an open order, else an empty one.
 * Returns null when the ingredient is already staged on a plate — a second copy
 * would only block the other plate. */
function choosePlate(world, ingredient) {
  for (const station of STATIONS.filter((s) => s.kind === 'plate')) {
    if (world.plates[station.id].items.includes(ingredient)) return null;
  }
  for (const station of STATIONS.filter((s) => s.kind === 'plate')) {
    const plate = world.plates[station.id];
    if (plate.items.length === 0) continue;
    const candidate = [...plate.items, ingredient];
    const fits = world.board.orders.some(
      (order) => candidate.every((item) => order.needs.includes(item)) && candidate.length <= order.needs.length,
    );
    if (fits) return station;
  }
  return STATIONS.find((s) => s.kind === 'plate' && world.plates[s.id].items.length === 0) ?? null;
}

/**
 * The autopilot's next move. `options.serve` false keeps plates on the counter
 * (used for the cover, where a finished plate should stay visible).
 */
export function autopilot(world, options = {}) {
  const serve = options.serve !== false;
  const chef = world.chef;
  const hands = chef.hands;

  // 1. Carry a finished plate to the serving window.
  if (serve && hands?.kind === 'plate') {
    const recipe = recipeForPlate(hands.items);
    if (recipe && world.board.orders.some((order) => order.recipeId === recipe.id)) {
      const serveStation = stationById('serve');
      if (stationIsNear(world, serveStation)) return { dx: 0, dy: 0, interact: true };
      return { ...moveToward(world, approachPoint(serveStation)), interact: false };
    }
  }

  // 1b. Pick up a finished plate that matches an open order.
  if (serve && !hands) {
    for (const station of STATIONS.filter((s) => s.kind === 'plate')) {
      const plate = world.plates[station.id];
      const recipe = recipeForPlate(plate.items);
      if (recipe && world.board.orders.some((order) => order.recipeId === recipe.id)) {
        if (stationIsNear(world, station)) return { dx: 0, dy: 0, interact: true };
        return { ...moveToward(world, approachPoint(station)), interact: false };
      }
    }
  }

  // 2. Carry a prepared ingredient to a plate.
  if (hands?.kind === 'ingredient' && hands.state !== 'raw' && hands.state !== 'burnt') {
    const plateStation = choosePlate(world, hands.ingredient);
    if (plateStation) {
      if (stationIsNear(world, plateStation)) return { dx: 0, dy: 0, interact: true };
      return { ...moveToward(world, approachPoint(plateStation)), interact: false };
    }
    // No plate can take it (already staged or no fitting plate): bin it.
    const trash = stationById('trash');
    if (stationIsNear(world, trash)) return { dx: 0, dy: 0, interact: true };
    return { ...moveToward(world, approachPoint(trash)), interact: false };
  }

  // 3. Put a raw ingredient where it is prepared.
  if (hands?.kind === 'ingredient' && hands.state === 'raw') {
    const prep = prepFor(hands.ingredient);
    // A stale ingredient no open order wants anymore goes in the trash.
    const wanted = world.board.orders.some((order) => order.needs.includes(hands.ingredient))
      || Object.values(world.plates).some((plate) => plate.items.includes(hands.ingredient));
    if (!wanted) {
      const trash = stationById('trash');
      if (stationIsNear(world, trash)) return { dx: 0, dy: 0, interact: true };
      return { ...moveToward(world, approachPoint(trash)), interact: false };
    }
    const target = prep === 'chop' ? freeBoard(world) : prep === 'cook' ? freeStove(world) : null;
    if (target) {
      if (stationIsNear(world, target)) return { dx: 0, dy: 0, interact: true };
      return { ...moveToward(world, approachPoint(target)), interact: false };
    }
    if (prep === 'none') {
      const plateStation = choosePlate(world, hands.ingredient);
      if (plateStation) {
        if (stationIsNear(world, plateStation)) return { dx: 0, dy: 0, interact: true };
        return { ...moveToward(world, approachPoint(plateStation)), interact: false };
      }
    }
  }

  // 4. Pick up a burnt pan item and bin it.
  if (hands?.kind === 'ingredient' && hands.state === 'burnt') {
    const trash = stationById('trash');
    if (stationIsNear(world, trash)) return { dx: 0, dy: 0, interact: true };
    return { ...moveToward(world, approachPoint(trash)), interact: false };
  }

  // 5. Collect a finished chop.
  for (const station of STATIONS.filter((s) => s.kind === 'board')) {
    const slot = world.boards[station.id];
    if (slot && slot.progress >= 1) {
      if (stationIsNear(world, station)) return { dx: 0, dy: 0, interact: true };
      return { ...moveToward(world, approachPoint(station)), interact: false };
    }
  }

  // 6. Collect a pan in its golden band, or a finished one.
  for (const station of STATIONS.filter((s) => s.kind === 'stove')) {
    const slot = world.stoves[station.id];
    if (slot && (slot.burnt || (slot.progress >= COOK_GOLDEN_LOW + 0.02 && slot.progress <= COOK_GOLDEN_HIGH - 0.02) || slot.progress >= 1)) {
      if (stationIsNear(world, station)) return { dx: 0, dy: 0, interact: true };
      return { ...moveToward(world, approachPoint(station)), interact: false };
    }
  }

  // 7. Keep chopping: press E only while the needle is in the green band.
  for (const station of STATIONS.filter((s) => s.kind === 'board')) {
    const slot = world.boards[station.id];
    if (slot && slot.progress < 1) {
      const near = stationIsNear(world, station);
      const inGreen = slot.needle >= 0.44 && slot.needle <= 0.56;
      if (near) return { dx: 0, dy: 0, interact: inGreen };
      return { ...moveToward(world, approachPoint(station)), interact: false };
    }
  }

  // 8. Hands empty: fetch the oldest order's next missing ingredient.
  if (!hands && world.board.orders.length > 0) {
    const order = world.board.orders[0];
    const covered = coveredIngredients(world);
    const missing = order.needs.filter((need) => !covered.includes(need));
    const want = missing[0] ?? order.needs[0];
    const prep = prepFor(want);
    const blocked =
      (prep === 'chop' && !freeBoard(world)) || (prep === 'cook' && !freeStove(world));
    if (!blocked) {
      const pantry = STATIONS.find((s) => s.kind === 'pantry' && s.ingredient === want);
      if (pantry) {
        if (stationIsNear(world, pantry)) return { dx: 0, dy: 0, interact: true };
        return { ...moveToward(world, approachPoint(pantry)), interact: false };
      }
    }
  }

  // 9. Nothing to do: wait by a cooking pan.
  for (const station of STATIONS.filter((s) => s.kind === 'stove')) {
    if (world.stoves[station.id]) {
      return { ...moveToward(world, approachPoint(station)), interact: false };
    }
  }
  return { dx: 0, dy: 0, interact: false };
}

/** Run the world forward with the autopilot until `stop` says enough. */
function runAutopilot(world, stop, options) {
  let steps = 0;
  const maxSteps = 60 * 240;
  while (steps < maxSteps) {
    const input = autopilot(world, options);
    const events = stepWorld(world, SAMPLE, input);
    steps += 1;
    if (events & EVENT_OVER) break;
    if (stop(world, steps)) break;
  }
  return world.over;
}

/**
 * Set `world` to the named scene and return the screen to draw over it.
 * cover: ~50 s of real play with serving held back, so a finished plate and a
 * mid-assembly plate both sit on the counter. chop: freeze mid-chop with the
 * needle sweeping. rush: play into rush hour. end: a careless shift that loses
 * its hearts to expired orders.
 */
export function stageShot(name, world) {
  resetWorld(world);
  if (name === 'chop') {
    runAutopilot(world, (w) => Object.values(w.boards).some((slot) => slot && slot.progress >= 0.25 && slot.progress < 1), {});
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'rush') {
    runAutopilot(world, (w) => w.elapsed >= 132, {});
    return { screen: world.over ? SCREEN_OVER : SCREEN_PLAY, best: world.coins };
  }
  if (name === 'end') {
    // A careless chef: never serves, never chops — orders walk out until the
    // shift ends in defeat.
    let steps = 0;
    while (steps < 60 * 240) {
      const events = stepWorld(world, SAMPLE, { dx: 0, dy: 0, interact: false });
      steps += 1;
      if (events & EVENT_OVER) break;
    }
    return { screen: SCREEN_OVER, best: world.coins };
  }
  // cover (default): play into rush hour with serving on, then hold serving
  // back for a few seconds so a finished plate and a mid-assembly plate both
  // sit on the counter when the frame freezes.
  runAutopilot(world, (w) => w.elapsed >= 121, {});
  if (!world.over) {
    runAutopilot(
      world,
      (w) => {
        const plates = Object.values(w.plates);
        const ready = plates.some((plate) => {
          const recipe = recipeForPlate(plate.items);
          return recipe && w.board.orders.some((order) => order.recipeId === recipe.id);
        });
        const assembling = plates.some(
          (plate) => plate.items.length > 0 && !recipeForPlate(plate.items),
        );
        return (ready && assembling) || w.elapsed >= 152;
      },
      { serve: false },
    );
  }
  return { screen: world.over ? SCREEN_OVER : SCREEN_PLAY, best: world.coins };
}
