// Shared constants for Sizzle Rush: canvas size, shift rules, timing windows and the
// kitchen floor plan. Every other module reads its numbers from here, so tuning the
// game means editing this one file.
export const VIEW_WIDTH = 1280;
export const VIEW_HEIGHT = 800;
export const HUD_HEIGHT = 96;
export const STEP = 1 / 60;

export const SHIFT_SECONDS = 180;
export const TARGET_COINS = 450;
export const START_HEARTS = 3;
export const MAX_ORDERS = 4;
export const ORDER_SPAWN_SECONDS = 13;
export const ORDER_SPAWN_RUSH_SECONDS = 14;
export const ORDER_PATIENCE_SECONDS = 50;
export const ORDER_PATIENCE_RUSH_SECONDS = 50;
export const RUSH_SECONDS = 60;
export const FIRST_ORDER_SECONDS = 2;

export const CHEF_SPEED = 270;
export const CHEF_RADIUS = 20;

// Chop meter: the needle sweeps 0..1 and back. Landing inside the perfect band is
// worth double progress and grows the combo; the ok band is worth half.
export const CHOP_NEEDLE_SPEED = 1.7;
export const CHOP_PERFECT_LOW = 0.42;
export const CHOP_PERFECT_HIGH = 0.58;
export const CHOP_OK_LOW = 0.24;
export const CHOP_OK_HIGH = 0.76;
export const CHOP_PERFECT_PROGRESS = 0.5;
export const CHOP_OK_PROGRESS = 0.25;
export const CHOP_EDGE_PROGRESS = 0.1;

// Cooking: the pan fills 0..1 over its cook time. Serving inside the golden band is a
// perfect cook; past 1.0 the dish overcooks and burns after the grace period.
export const COOK_GOLDEN_LOW = 0.8;
export const COOK_GOLDEN_HIGH = 0.95;
export const BURN_GRACE_SECONDS = 4;

// Coins: base recipe price, plus a patience bonus for serving early, plus a perfect
// bonus per perfectly prepared ingredient, all scaled by the combo multiplier.
export const PERFECT_COIN_BONUS = 5;
export const COMBO_STEP = 0.05;
export const COMBO_CAP = 1.5;

export const BEST_KEY = 'char-chive-best-coins';

// Station kinds.
export const KIND_PANTRY = 'pantry';
export const KIND_BOARD = 'board';
export const KIND_STOVE = 'stove';
export const KIND_PLATE = 'plate';
export const KIND_SERVE = 'serve';
export const KIND_TRASH = 'trash';

// The kitchen floor plan. Pantry crates along the top wall, chopping boards on the
// left, stoves on the right, plating counter and serving window along the bottom.
export const STATIONS = [
  { id: 'pantry-tomato', kind: KIND_PANTRY, ingredient: 'tomato', x: 60, y: 108, w: 96, h: 64, label: 'Tomato' },
  { id: 'pantry-lettuce', kind: KIND_PANTRY, ingredient: 'lettuce', x: 168, y: 108, w: 96, h: 64, label: 'Lettuce' },
  { id: 'pantry-patty', kind: KIND_PANTRY, ingredient: 'patty', x: 276, y: 108, w: 96, h: 64, label: 'Patty' },
  { id: 'pantry-cheese', kind: KIND_PANTRY, ingredient: 'cheese', x: 384, y: 108, w: 96, h: 64, label: 'Cheese' },
  { id: 'pantry-bun', kind: KIND_PANTRY, ingredient: 'bun', x: 492, y: 108, w: 96, h: 64, label: 'Bun' },
  { id: 'pantry-pasta', kind: KIND_PANTRY, ingredient: 'pasta', x: 600, y: 108, w: 96, h: 64, label: 'Pasta' },
  { id: 'board-1', kind: KIND_BOARD, x: 70, y: 300, w: 260, h: 100, label: 'Chop Board' },
  { id: 'board-2', kind: KIND_BOARD, x: 70, y: 430, w: 260, h: 100, label: 'Chop Board' },
  { id: 'stove-1', kind: KIND_STOVE, x: 950, y: 300, w: 260, h: 100, label: 'Stove' },
  { id: 'stove-2', kind: KIND_STOVE, x: 950, y: 430, w: 260, h: 100, label: 'Stove' },
  { id: 'plate-1', kind: KIND_PLATE, x: 500, y: 636, w: 130, h: 96, label: 'Plate' },
  { id: 'plate-2', kind: KIND_PLATE, x: 650, y: 636, w: 130, h: 96, label: 'Plate' },
  { id: 'serve', kind: KIND_SERVE, x: 1010, y: 620, w: 200, h: 112, label: 'Serve' },
  { id: 'trash', kind: KIND_TRASH, x: 70, y: 620, w: 160, h: 112, label: 'Trash' },
];

// Decorative counters that fill the kitchen out (no interaction). Corridors
// between them and the stations stay at least 70 px wide so the chef (40 px)
// always has room to pass.
export const DECOR = [
  { x: 760, y: 108, w: 450, h: 64, label: 'Spices' },
  { x: 400, y: 300, w: 160, h: 100, label: 'Counter' },
  { x: 720, y: 300, w: 160, h: 100, label: 'Counter' },
];

export const FLOOR = { x: 24, y: HUD_HEIGHT + 8, w: VIEW_WIDTH - 48, h: VIEW_HEIGHT - HUD_HEIGHT - 32 };
export const CHEF_START = { x: 640, y: 580 };
