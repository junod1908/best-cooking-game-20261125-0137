// The chef: position, facing and what the hands carry. Movement is free 2D with
// WASD/arrows or a mouse click target. Each step is split into small sub-steps
// with a push-out after each one, so the chef slides around counter corners
// instead of wedging into them.
import { CHEF_RADIUS, CHEF_SPEED } from './config.js';
import { clampToFloor, pushOutOfRect, solidRects } from './stations.js';

export function createChef(x, y) {
  return {
    x,
    y,
    facing: 1,
    moving: false,
    // hands: null, or { kind: 'ingredient', ingredient, state: 'raw'|'chopped'|'cooked', perfect }
    //        or { kind: 'plate', items: [...ingredients], perfects }
    hands: null,
    walkPhase: 0,
  };
}

const SUB_STEPS = 8;

export function moveChef(chef, dx, dy, dt) {
  const length = Math.hypot(dx, dy);
  if (length < 0.001) {
    chef.moving = false;
    return;
  }
  const nx = dx / length;
  const ny = dy / length;
  chef.facing = nx < -0.1 ? -1 : nx > 0.1 ? 1 : chef.facing;
  chef.moving = true;
  chef.walkPhase += dt * 10;
  const solids = solidRects();
  let pos = { x: chef.x, y: chef.y };
  const stepX = (nx * CHEF_SPEED * dt) / SUB_STEPS;
  const stepY = (ny * CHEF_SPEED * dt) / SUB_STEPS;
  for (let index = 0; index < SUB_STEPS; index += 1) {
    pos = { x: pos.x + stepX, y: pos.y + stepY };
    for (const rect of solids) {
      pos = pushOutOfRect(pos.x, pos.y, CHEF_RADIUS, rect);
    }
    pos = clampToFloor(pos.x, pos.y);
  }
  chef.x = pos.x;
  chef.y = pos.y;
}
