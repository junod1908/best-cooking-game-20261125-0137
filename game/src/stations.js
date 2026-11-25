// Station geometry: where each station sits, which one the chef is standing at, and
// the collision boxes the chef slides around.
import { CHEF_RADIUS, DECOR, FLOOR, STATIONS } from './config.js';

export function stationById(id) {
  return STATIONS.find((station) => station.id === id) ?? null;
}

export function stationCenter(station) {
  return { x: station.x + station.w / 2, y: station.y + station.h / 2 };
}

/** True when the chef stands close enough to use this specific station. */
export function isNearStation(x, y, station, range = 48) {
  const cx = Math.max(station.x, Math.min(x, station.x + station.w));
  const cy = Math.max(station.y, Math.min(y, station.y + station.h));
  return Math.hypot(x - cx, y - cy) <= range;
}

/** The station whose edge the chef is close enough to use, or null. */
export function nearestUsableStation(x, y) {
  let best = null;
  let bestDistance = Infinity;
  for (const station of STATIONS) {
    const cx = Math.max(station.x, Math.min(x, station.x + station.w));
    const cy = Math.max(station.y, Math.min(y, station.y + station.h));
    const distance = Math.hypot(x - cx, y - cy);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = station;
    }
  }
  return bestDistance <= 48 ? best : null;
}

/** All solid rectangles the chef cannot walk through: stations, decor and walls. */
export function solidRects() {
  const rects = STATIONS.map((station) => ({ x: station.x, y: station.y, w: station.w, h: station.h }));
  for (const item of DECOR) rects.push({ x: item.x, y: item.y, w: item.w, h: item.h });
  return rects;
}

/** True when a circle at (x, y) overlaps a rectangle. */
export function circleHitsRect(x, y, radius, rect) {
  const cx = Math.max(rect.x, Math.min(x, rect.x + rect.w));
  const cy = Math.max(rect.y, Math.min(y, rect.y + rect.h));
  return Math.hypot(x - cx, y - cy) < radius;
}
export function pushOutOfRect(x, y, radius, rect) {
  const cx = Math.max(rect.x, Math.min(x, rect.x + rect.w));
  const cy = Math.max(rect.y, Math.min(y, rect.y + rect.h));
  const dx = x - cx;
  const dy = y - cy;
  const distance = Math.hypot(dx, dy);
  if (distance >= radius) return { x, y };
  if (distance > 0) {
    const push = radius - distance;
    return { x: x + (dx / distance) * push, y: y + (dy / distance) * push };
  }
  // Centre inside the rectangle: leave by the nearest edge.
  const left = x - rect.x + radius;
  const right = rect.x + rect.w - x + radius;
  const top = y - rect.y + radius;
  const bottom = rect.y + rect.h - y + radius;
  const min = Math.min(left, right, top, bottom);
  if (min === left) return { x: rect.x - radius, y };
  if (min === right) return { x: rect.x + rect.w + radius, y };
  if (min === top) return { x, y: rect.y - radius };
  return { x, y: rect.y + rect.h + radius };
}

export function clampToFloor(x, y) {
  return {
    x: Math.max(FLOOR.x + CHEF_RADIUS, Math.min(FLOOR.x + FLOOR.w - CHEF_RADIUS, x)),
    y: Math.max(FLOOR.y + CHEF_RADIUS, Math.min(FLOOR.y + FLOOR.h - CHEF_RADIUS, y)),
  };
}
