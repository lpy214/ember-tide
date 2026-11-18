// A small seeded random source (mulberry32), so a screenshot scene staged
// from one seed always plays out the same way.

export function makeRandom(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function range(rng, low, high) {
  return low + rng() * (high - low);
}

export function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

export function clamp(value, low, high) {
  return value < low ? low : value > high ? high : value;
}

export function distance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}
