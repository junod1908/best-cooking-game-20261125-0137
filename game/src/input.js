// Keyboard and mouse input. WASD/arrows move the chef, E or Space interacts, P
// pauses, M mutes. Clicking the floor sets a walk target; clicking a station walks
// the chef there and interacts once on arrival.
import { STATIONS } from './config.js';
import { stationCenter } from './stations.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let clickTarget = null;
  let clickStationId = null;

  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) event.preventDefault();
    if (event.repeat) return;
    keys.add(key);
    if (key === 'e' || key === ' ' || key === 'enter') actions |= ACTION_CONFIRM;
    if (key === 'p' || key === 'escape') actions |= ACTION_PAUSE;
    if (key === 'm') actions |= ACTION_MUTE;
  });
  window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));

  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (canvas.width / rect.width);
    const y = (event.clientY - rect.top) * (canvas.height / rect.height);
    const station = STATIONS.find((s) => x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h);
    if (station) {
      clickStationId = station.id;
      const centre = stationCenter(station);
      clickTarget = { x: centre.x, y: centre.y + station.h / 2 + 30 };
    } else {
      clickStationId = null;
      clickTarget = { x, y };
    }
  });

  return {
    /** Movement direction from keys, or toward the click target. */
    direction(chef) {
      let dx = 0;
      let dy = 0;
      if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
      if (keys.has('d') || keys.has('arrowright')) dx += 1;
      if (keys.has('w') || keys.has('arrowup')) dy -= 1;
      if (keys.has('s') || keys.has('arrowdown')) dy += 1;
      if (dx !== 0 || dy !== 0) {
        clickTarget = null;
        clickStationId = null;
        return { dx, dy };
      }
      if (clickTarget) {
        const tx = clickTarget.x - chef.x;
        const ty = clickTarget.y - chef.y;
        const distance = Math.hypot(tx, ty);
        if (distance < 10) {
          clickTarget = null;
          return { dx: 0, dy: 0 };
        }
        return { dx: tx / distance, dy: ty / distance };
      }
      return { dx: 0, dy: 0 };
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** The id of a station the player clicked, to interact with on arrival. */
    takeClickStation() {
      const id = clickStationId;
      clickStationId = null;
      return id;
    },
  };
}
