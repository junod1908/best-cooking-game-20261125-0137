// Everything the player sees: the kitchen floor, the stations, the chef, the order
// board, the shift timer and the title / pause / end screens. All art is drawn in
// code — no images, no fonts beyond the system stack.
import {
  CHOP_OK_HIGH,
  CHOP_OK_LOW,
  CHOP_PERFECT_HIGH,
  CHOP_PERFECT_LOW,
  COOK_GOLDEN_HIGH,
  COOK_GOLDEN_LOW,
  DECOR,
  FLOOR,
  HUD_HEIGHT,
  SHIFT_SECONDS,
  STATIONS,
  TARGET_COINS,
  VIEW_HEIGHT,
  VIEW_WIDTH,
} from './config.js';
import { ingredientColor, ingredientDark } from './recipes.js';
import { stationById } from './stations.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const TILE = 40;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawIngredient(ctx, ingredient, x, y, size, state) {
  const color = ingredientColor(ingredient);
  const dark = ingredientDark(ingredient);
  const half = size / 2;
  ctx.save();
  ctx.translate(x, y);
  if (ingredient === 'tomato') {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, half, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2c6e3a';
    ctx.beginPath();
    ctx.moveTo(0, -half);
    ctx.lineTo(-5, -half - 6);
    ctx.lineTo(5, -half - 6);
    ctx.closePath();
    ctx.fill();
  } else if (ingredient === 'lettuce') {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, half, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = dark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, half * 0.55, 0, Math.PI * 2);
    ctx.stroke();
  } else if (ingredient === 'patty') {
    ctx.fillStyle = color;
    roundRect(ctx, -half, -half * 0.7, size, size * 0.7, 8);
    ctx.fill();
    ctx.fillStyle = dark;
    ctx.fillRect(-half * 0.5, -2, 4, 4);
    ctx.fillRect(0, -2, 4, 4);
    ctx.fillRect(half * 0.5, -2, 4, 4);
  } else if (ingredient === 'pasta') {
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    for (let i = -2; i <= 2; i += 1) {
      ctx.beginPath();
      ctx.moveTo(-half, i * 6);
      ctx.quadraticCurveTo(0, i * 6 - 6, half, i * 6);
      ctx.stroke();
    }
  } else if (ingredient === 'cheese') {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-half, half * 0.6);
    ctx.lineTo(half, half * 0.6);
    ctx.lineTo(half, -half * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.arc(0, 2, 3, 0, Math.PI * 2);
    ctx.arc(half * 0.5, 6, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (ingredient === 'bun') {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, half * 0.3, half, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = dark;
    ctx.fillRect(-half, half * 0.3, size, 4);
  }
  if (state === 'burnt') {
    ctx.fillStyle = 'rgba(20, 10, 5, 0.55)';
    ctx.beginPath();
    ctx.arc(0, 0, half, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPlateIcon(ctx, items, x, y, size) {
  ctx.fillStyle = '#f2f0e9';
  ctx.beginPath();
  ctx.ellipse(x, y, size / 2, size / 3.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c9c4b4';
  ctx.lineWidth = 2;
  ctx.stroke();
  items.forEach((ingredient, index) => {
    drawIngredient(ctx, ingredient, x + (index - (items.length - 1) / 2) * 16, y - 6, 18, 'ready');
  });
}

/** True when one ingredient of an order is already prepared and staged: on a
 * plate that fits the order, in the chef's hands, or finished at its station. */
function needDone(world, order, need) {
  for (const plate of Object.values(world.plates)) {
    if (plate.items.includes(need) && plate.items.every((item) => order.needs.includes(item))) return true;
  }
  const hands = world.chef.hands;
  if (hands?.kind === 'ingredient' && hands.ingredient === need && hands.state !== 'raw') return true;
  for (const slot of Object.values(world.boards)) {
    if (slot?.ingredient === need && slot.progress >= 1) return true;
  }
  for (const slot of Object.values(world.stoves)) {
    if (slot?.ingredient === need && !slot.burnt && slot.progress >= 0.8) return true;
  }
  return false;
}

/** Step tag for an ingredient: how it must be prepared. */
function stepTag(ingredient) {
  const prep = { tomato: 'CHOP', lettuce: 'CHOP', patty: 'PAN', pasta: 'PAN', cheese: 'FRESH', bun: 'FRESH' };
  return prep[ingredient] ?? 'PREP';
}

function drawOrderTicket(ctx, world, order, x, y, w, h) {
  const fraction = Math.max(0, order.patience / order.patienceMax);
  const urgent = fraction < 0.35;
  ctx.fillStyle = urgent ? '#5c1f1f' : '#2b2620';
  roundRect(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = urgent ? '#ff6b5e' : '#6b5d4f';
  ctx.lineWidth = urgent ? 3 : 1.5;
  ctx.stroke();
  ctx.fillStyle = '#fff3d6';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(order.name, x + 8, y + 13);
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`$${order.price}`, x + w - 8, y + 13);
  // Per-ingredient checklist: icon + step tag, ticked green when staged.
  order.needs.forEach((ingredient, index) => {
    const ix = x + 16 + index * 28;
    drawIngredient(ctx, ingredient, ix, y + 34, 20, 'ready');
    ctx.fillStyle = '#cbb896';
    ctx.font = 'bold 7px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(stepTag(ingredient), ix, y + 50);
    if (needDone(world, order, ingredient)) {
      ctx.fillStyle = '#46a758';
      ctx.beginPath();
      ctx.arc(ix + 8, y + 26, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px system-ui, sans-serif';
      ctx.fillText('✓', ix + 8, y + 26);
    }
  });
  ctx.fillStyle = '#3a332b';
  roundRect(ctx, x + 8, y + h - 10, w - 16, 5, 2);
  ctx.fill();
  ctx.fillStyle = fraction > 0.5 ? '#46a758' : fraction > 0.25 ? '#f5a524' : '#e5484d';
  roundRect(ctx, x + 8, y + h - 10, (w - 16) * fraction, 5, 2);
  ctx.fill();
}

function drawHud(ctx, world) {
  ctx.fillStyle = '#1d1712';
  ctx.fillRect(0, 0, VIEW_WIDTH, HUD_HEIGHT);
  ctx.fillStyle = '#2b2118';
  ctx.fillRect(0, HUD_HEIGHT - 4, VIEW_WIDTH, 4);

  // Order board on the left: up to four tickets with step checklists.
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('ORDER BOARD', 12, 18);
  if (world.board.orders.length === 0) {
    ctx.fillStyle = '#9a8f80';
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText('No orders yet — grab ingredients!', 12, 48);
  }
  world.board.orders.forEach((order, index) => {
    drawOrderTicket(ctx, world, order, 12 + index * 156, 24, 148, 66);
  });

  // Big shift timer, centred between the board and the score.
  const remaining = Math.max(0, SHIFT_SECONDS - world.elapsed);
  const minutes = Math.floor(remaining / 60);
  const seconds = Math.floor(remaining % 60);
  const timerX = 760;
  ctx.textAlign = 'center';
  ctx.fillStyle = world.rush ? '#ff6b5e' : '#fff3d6';
  ctx.font = 'bold 32px system-ui, sans-serif';
  ctx.fillText(`${minutes}:${String(seconds).padStart(2, '0')}`, timerX, 38);
  ctx.fillStyle = '#3a332b';
  roundRect(ctx, timerX - 90, 48, 180, 8, 4);
  ctx.fill();
  ctx.fillStyle = world.rush ? '#ff6b5e' : '#46a758';
  roundRect(ctx, timerX - 90, 48, 180 * (remaining / SHIFT_SECONDS), 8, 4);
  ctx.fill();
  if (world.rush) {
    ctx.fillStyle = '#ff6b5e';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText('⚡ RUSH HOUR', timerX, 76);
  } else {
    ctx.fillStyle = '#9a8f80';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('SHIFT', timerX, 74);
  }

  // Coins, hearts, combo on the right.
  const right = VIEW_WIDTH - 16;
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText(`🪙 ${world.coins} / ${TARGET_COINS}`, right, 34);
  ctx.fillStyle = '#ff6b5e';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText('♥'.repeat(Math.max(0, world.hearts)) + '♡'.repeat(Math.max(0, 3 - world.hearts)), right, 62);
  if (world.combo >= 2) {
    ctx.fillStyle = '#7dd3fc';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText(`COMBO x${Math.min(1 + Math.min(world.combo, 20) * 0.05, 1.5).toFixed(1)}`, right, 84);
  }
}

function drawStation(ctx, station, world) {
  const cx = station.x + station.w / 2;
  const cy = station.y + station.h / 2;
  ctx.save();
  if (station.kind === 'pantry') {
    ctx.fillStyle = '#6b4a2f';
    roundRect(ctx, station.x, station.y, station.w, station.h, 8);
    ctx.fill();
    ctx.strokeStyle = '#4a3018';
    ctx.lineWidth = 2;
    ctx.stroke();
    drawIngredient(ctx, station.ingredient, cx, cy - 8, 34, 'ready');
    ctx.fillStyle = '#fff3d6';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(station.label, cx, station.y + station.h - 8);
  } else if (station.kind === 'board') {
    ctx.fillStyle = '#a9805a';
    roundRect(ctx, station.x, station.y, station.w, station.h, 10);
    ctx.fill();
    ctx.strokeStyle = '#7a5a38';
    ctx.lineWidth = 2;
    ctx.stroke();
    const slot = world.boards[station.id];
    if (slot) {
      drawIngredient(ctx, slot.ingredient, cx - 40, cy, 44, 'ready');
      // Chop meter.
      const meterX = cx - 10;
      const meterW = 150;
      ctx.fillStyle = '#241a12';
      roundRect(ctx, meterX, cy - 26, meterW, 16, 8);
      ctx.fill();
      ctx.fillStyle = '#f5a524';
      roundRect(ctx, meterX + meterW * CHOP_OK_LOW, cy - 26, meterW * (CHOP_OK_HIGH - CHOP_OK_LOW), 16, 8);
      ctx.fill();
      ctx.fillStyle = '#46a758';
      roundRect(ctx, meterX + meterW * CHOP_PERFECT_LOW, cy - 26, meterW * (CHOP_PERFECT_HIGH - CHOP_PERFECT_LOW), 16, 8);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(meterX + meterW * slot.needle - 2, cy - 30, 4, 24);
      // Chop progress.
      ctx.fillStyle = '#3a332b';
      roundRect(ctx, meterX, cy + 12, meterW, 8, 4);
      ctx.fill();
      ctx.fillStyle = '#7dd3fc';
      roundRect(ctx, meterX, cy + 12, meterW * slot.progress, 8, 4);
      ctx.fill();
      ctx.fillStyle = '#fff3d6';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(slot.progress >= 1 ? 'CHOPPED — press E to take' : 'Press E in the green!', cx + 20, cy + 36);
    } else {
      ctx.fillStyle = '#e8d9bd';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CHOP BOARD', cx, cy - 4);
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillStyle = '#d9c8a8';
      ctx.fillText('drop tomato / lettuce, press E', cx, cy + 16);
    }
  } else if (station.kind === 'stove') {
    ctx.fillStyle = '#3d3a3f';
    roundRect(ctx, station.x, station.y, station.w, station.h, 10);
    ctx.fill();
    ctx.strokeStyle = '#232026';
    ctx.lineWidth = 2;
    ctx.stroke();
    const slot = world.stoves[station.id];
    ctx.fillStyle = '#17141a';
    ctx.beginPath();
    ctx.arc(cx, cy, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#55505a';
    ctx.stroke();
    if (slot) {
      drawIngredient(ctx, slot.ingredient, cx, cy, 40, slot.burnt ? 'burnt' : 'ready');
      // Cook progress ring with the golden band.
      ctx.strokeStyle = '#3a332b';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(cx, cy, 44, -Math.PI / 2, Math.PI * 1.5);
      ctx.stroke();
      ctx.strokeStyle = slot.burnt ? '#e5484d' : '#f5a524';
      ctx.beginPath();
      ctx.arc(cx, cy, 44, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, slot.progress));
      ctx.stroke();
      ctx.strokeStyle = '#46a758';
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.arc(cx, cy, 44, -Math.PI / 2 + Math.PI * 2 * COOK_GOLDEN_LOW, -Math.PI / 2 + Math.PI * 2 * COOK_GOLDEN_HIGH);
      ctx.stroke();
      ctx.fillStyle = '#fff3d6';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        slot.burnt ? 'BURNT — press E, then trash it' : slot.progress >= 1 ? 'Done! Press E to take' : 'Cooking… wait for green',
        cx,
        station.y + station.h - 8,
      );
    } else {
      ctx.fillStyle = '#c9c4d6';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('STOVE', cx, station.y + 14);
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillStyle = '#9d98ad';
      ctx.fillText('drop patty / pasta, flip in green', cx, cy + 16);
    }
  } else if (station.kind === 'plate') {
    const plate = world.plates[station.id];
    ctx.fillStyle = '#4a4038';
    roundRect(ctx, station.x, station.y, station.w, station.h, 10);
    ctx.fill();
    ctx.strokeStyle = '#2e2822';
    ctx.lineWidth = 2;
    ctx.stroke();
    if (plate.items.length > 0) {
      drawPlateIcon(ctx, plate.items, cx, cy - 6, 84);
      const fitting = world.board.orders.find(
        (order) => order.needs.length >= plate.items.length && plate.items.every((item) => order.needs.includes(item)),
      );
      const total = fitting ? fitting.needs.length : plate.items.length;
      const fraction = `${plate.items.length}/${total}`;
      const matches = fitting !== undefined && fitting.needs.length === plate.items.length;
      ctx.fillStyle = matches ? '#46a758' : '#ffd166';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        matches ? `✓ READY ${fraction}` : `Assembling ${fraction}`,
        cx,
        station.y + station.h - 8,
      );
    } else {
      ctx.fillStyle = '#e8e2d4';
      ctx.beginPath();
      ctx.ellipse(cx, cy, 34, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8a8172';
      ctx.font = '12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('empty plate', cx, station.y + station.h - 8);
    }
  } else if (station.kind === 'serve') {
    ctx.fillStyle = '#7a3b2e';
    roundRect(ctx, station.x, station.y, station.w, station.h, 10);
    ctx.fill();
    ctx.strokeStyle = '#542620';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🍽 SERVE', cx, cy - 8);
    ctx.fillStyle = '#f3d9b8';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('bring a finished plate', cx, cy + 14);
    ctx.fillText('press E to serve', cx, cy + 32);
  } else if (station.kind === 'trash') {
    ctx.fillStyle = '#2f3336';
    roundRect(ctx, station.x, station.y, station.w, station.h, 10);
    ctx.fill();
    ctx.strokeStyle = '#1d1f21';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#b8bec4';
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🗑 TRASH', cx, cy - 6);
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('toss burnt or wrong food', cx, cy + 16);
  }
  ctx.restore();
}

function drawChef(ctx, world) {
  const chef = world.chef;
  const bob = chef.moving ? Math.sin(chef.walkPhase) * 2 : 0;
  ctx.save();
  ctx.translate(chef.x, chef.y + bob);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(0, 16, 22, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body (apron).
  ctx.fillStyle = '#e8e2d4';
  roundRect(ctx, -16, -8, 32, 30, 10);
  ctx.fill();
  ctx.fillStyle = '#d94f3d';
  ctx.fillRect(-16, 4, 32, 8);
  // Head.
  ctx.fillStyle = '#f2c89b';
  ctx.beginPath();
  ctx.arc(0, -18, 13, 0, Math.PI * 2);
  ctx.fill();
  // Chef hat.
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-7, -30, 8, 0, Math.PI * 2);
  ctx.arc(0, -34, 9, 0, Math.PI * 2);
  ctx.arc(7, -30, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-13, -30, 26, 6);
  // Eyes.
  ctx.fillStyle = '#241a12';
  ctx.beginPath();
  ctx.arc(-5 * chef.facing + 2, -18, 2, 0, Math.PI * 2);
  ctx.arc(4 * chef.facing + 2, -18, 2, 0, Math.PI * 2);
  ctx.fill();
  // Carried item above the head.
  const hands = chef.hands;
  if (hands) {
    if (hands.kind === 'ingredient') {
      drawIngredient(ctx, hands.ingredient, 0, -52, 30, hands.state);
      if (hands.perfect) {
        ctx.fillStyle = '#ffd166';
        ctx.font = 'bold 12px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('★ PERFECT', 0, -70);
      }
    } else if (hands.kind === 'plate') {
      drawPlateIcon(ctx, hands.items, 0, -50, 56);
    }
  }
  ctx.restore();
}

function drawOverlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(15, 10, 6, 0.78)';
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  ctx.fillStyle = accent;
  ctx.font = 'bold 54px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, VIEW_WIDTH / 2, 250);
  ctx.fillStyle = '#fff3d6';
  ctx.font = '20px system-ui, sans-serif';
  lines.forEach((line, index) => {
    ctx.fillText(line, VIEW_WIDTH / 2, 330 + index * 34);
  });
}

export function createRenderer(canvas) {
  canvas.width = VIEW_WIDTH;
  canvas.height = VIEW_HEIGHT;
  const ctx = canvas.getContext('2d');

  function draw(world, screen, best) {
    // Floor.
    ctx.fillStyle = '#8a6f4d';
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    for (let y = FLOOR.y; y < FLOOR.y + FLOOR.h; y += TILE) {
      for (let x = FLOOR.x; x < FLOOR.x + FLOOR.w; x += TILE) {
        const odd = (Math.floor(x / TILE) + Math.floor(y / TILE)) % 2 === 0;
        ctx.fillStyle = odd ? '#9c7f58' : '#8a6f4d';
        ctx.fillRect(x, y, TILE, TILE);
      }
    }
    // Wall strip above the floor.
    ctx.fillStyle = '#5d4630';
    ctx.fillRect(0, HUD_HEIGHT, VIEW_WIDTH, 8);

    for (const item of DECOR) {
      ctx.fillStyle = '#7a6248';
      roundRect(ctx, item.x, item.y, item.w, item.h, 10);
      ctx.fill();
      ctx.fillStyle = '#cbb896';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.label, item.x + item.w / 2, item.y + item.h / 2);
    }

    for (const station of STATIONS) drawStation(ctx, station, world);
    drawChef(ctx, world);
    drawHud(ctx, world);

    if (world.flash) {
      ctx.fillStyle = 'rgba(20, 12, 6, 0.85)';
      const text = world.flash.text;
      ctx.font = 'bold 17px system-ui, sans-serif';
      const width = ctx.measureText(text).width + 28;
      roundRect(ctx, VIEW_WIDTH / 2 - width / 2, 108, width, 34, 17);
      ctx.fill();
      ctx.fillStyle = '#ffd166';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, VIEW_WIDTH / 2, 126);
    }

    if (screen === SCREEN_TITLE) {
      drawOverlay(ctx, '🍳 CHAR & CHIVE', [
        'A one-chef kitchen dash: chop, cook and plate against the clock.',
        '',
        'Move: WASD / arrows or click the floor  •  Interact: E or Space',
        'Chop on the board — press E inside the green band for a PERFECT chop.',
        'Cook on the stove — grab the pan inside the green band for a PERFECT flip.',
        'Plate the recipe, carry it to SERVE, and beat the order clock.',
        `Serve ${TARGET_COINS} coins before the 3-minute shift ends. Rush hour strikes in the last minute!`,
        '',
        'Press Space or click to start',
      ], '#ffd166');
    } else if (screen === SCREEN_PAUSED) {
      drawOverlay(ctx, 'PAUSED', ['Press P or Space to keep cooking.', `Coins ${world.coins} / ${TARGET_COINS}  •  Best ${best}`], '#7dd3fc');
    } else if (screen === SCREEN_OVER) {
      if (world.won) {
        drawOverlay(ctx, '🎉 SHIFT COMPLETE!', [
          `You served ${world.served} dishes and banked ${world.coins} coins!`,
          `Perfect preps: ${world.perfects}  •  Best combo: x${Math.min(1 + Math.min(world.bestCombo, 20) * 0.05, 1.5).toFixed(1)}`,
          `Best shift: ${best} coins`,
          '',
          'Press Space to cook another shift',
        ], '#46a758');
      } else {
        drawOverlay(ctx, '💔 SHIFT OVER', [
          world.hearts <= 0 ? 'Too many orders walked out.' : `The shift ended at ${world.coins} / ${TARGET_COINS} coins.`,
          `Dishes served: ${world.served}  •  Perfect preps: ${world.perfects}`,
          `Best shift: ${best} coins`,
          '',
          'Press Space to try again',
        ], '#ff6b5e');
      }
    }
  }

  return { draw };
}
