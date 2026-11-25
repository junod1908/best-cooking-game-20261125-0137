// The order board: orders spawn over the shift, each with a recipe and a patience
// timer. Serving an order before its patience runs out pays its price plus bonuses;
// an order that runs out costs a heart.
import {
  FIRST_ORDER_SECONDS,
  MAX_ORDERS,
  ORDER_PATIENCE_RUSH_SECONDS,
  ORDER_PATIENCE_SECONDS,
  ORDER_SPAWN_RUSH_SECONDS,
  ORDER_SPAWN_SECONDS,
} from './config.js';
import { RECIPES } from './recipes.js';

export const EVENT_ORDER_EXPIRED = 1;
export const EVENT_ORDER_SERVED = 2;

/** Early orders are simple recipes; harder ones join as the shift goes on. */
function availableRecipes(elapsed, shiftSeconds) {
  const fraction = elapsed / shiftSeconds;
  if (fraction < 0.25) return RECIPES.slice(0, 3);
  if (fraction < 0.6) return RECIPES.slice(0, 5);
  return RECIPES;
}

export function createOrderBoard(random) {
  return {
    orders: [],
    nextId: 1,
    spawnIn: FIRST_ORDER_SECONDS,
    random,
  };
}

function spawnOrder(board, patience) {
  const pool = availableRecipes(board.elapsed ?? 0, board.shiftSeconds ?? 180);
  const recipe = board.random.pick(pool);
  board.orders.push({
    id: board.nextId,
    recipeId: recipe.id,
    name: recipe.name,
    needs: [...recipe.needs],
    price: recipe.price,
    patience,
    patienceMax: patience,
  });
  board.nextId += 1;
}

export function stepOrderBoard(board, dt, elapsed, shiftSeconds, rush) {
  board.elapsed = elapsed;
  board.shiftSeconds = shiftSeconds;
  let events = 0;
  const patience = rush ? ORDER_PATIENCE_RUSH_SECONDS : ORDER_PATIENCE_SECONDS;
  board.spawnIn -= dt;
  if (board.spawnIn <= 0 && board.orders.length < MAX_ORDERS) {
    spawnOrder(board, patience);
    board.spawnIn = rush ? ORDER_SPAWN_RUSH_SECONDS : ORDER_SPAWN_SECONDS;
  }
  for (let index = board.orders.length - 1; index >= 0; index -= 1) {
    board.orders[index].patience -= dt;
    if (board.orders[index].patience <= 0) {
      board.orders.splice(index, 1);
      events |= EVENT_ORDER_EXPIRED;
    }
  }
  return events;
}

/** Remove the order a served plate matches; returns it, or null. */
export function takeMatchingOrder(board, recipeId) {
  const index = board.orders.findIndex((order) => order.recipeId === recipeId);
  if (index === -1) return null;
  return board.orders.splice(index, 1)[0];
}
