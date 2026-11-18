// Every tuning number and colour in one place. The playfield is a fixed
// 1280x720 logical area; the renderer scales it to the window, so no rule
// below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 20,
  speed: 360,
  fireInterval: 0.24,
  boltSpeed: 640,
  boltDamage: 1,
  dashSpeed: 980,
  dashTime: 0.16,
  dashCooldown: 2.4,
  invulnerable: 1.3,
  magnetRadius: 90,
};

export const LIVES = 3;

/** Ember orbs the player collects. */
export const ORB = {
  radius: 11,
  drift: 26,
  interval: 0.9,
  intervalJitter: 0.5,
  points: 10,
  comboWindow: 4,
};

/** Shadow wisps that chase the player. Kinds: dart, wisp, brute, splitter. */
export const WISP = {
  dart: { radius: 13, speed: 235, hp: 1, points: 15, touch: 1 },
  wisp: { radius: 17, speed: 150, hp: 2, points: 25, touch: 1 },
  brute: { radius: 26, speed: 92, hp: 5, points: 60, touch: 1 },
  splitter: { radius: 19, speed: 135, hp: 2, points: 40, touch: 1 },
  mini: { radius: 10, speed: 265, hp: 1, points: 10, touch: 1 },
};

/** The Tide King, boss of wave 10. */
export const BOSS = {
  radius: 58,
  speed: 68,
  hp: 90,
  points: 500,
  volleyInterval: 2.1,
  volleyBolts: 8,
  minionInterval: 6,
};

/** Wave plan: how many wisps each wave spawns, and how fast they arrive. */
export const WAVES = 10;
export function wavePlan(wave) {
  return {
    count: 6 + wave * 3,
    interval: Math.max(0.35, 1.05 - wave * 0.06),
    bruteFrom: wave >= 3 ? 2 : 0,
    splitterFrom: wave >= 4 ? 2 : 0,
  };
}

/** Upgrade cards offered between waves. id, name, line, apply. */
export const UPGRADES = [
  { id: 'rapid', name: 'Swift Flame', line: 'Shoot 25% faster', apply: (p) => { p.fireInterval *= 0.75; } },
  { id: 'twin', name: 'Twin Lanterns', line: '+1 bolt per shot', apply: (p) => { p.bolts += 1; } },
  { id: 'pierce', name: 'Piercing Light', line: 'Bolts pass through +1 wisp', apply: (p) => { p.pierce += 1; } },
  { id: 'magnet', name: 'Ember Magnet', line: 'Pull orbs from much further', apply: (p) => { p.magnetRadius += 110; } },
  { id: 'swift', name: 'Tide Runner', line: 'Move 18% faster', apply: (p) => { p.speed *= 1.18; } },
  { id: 'heart', name: 'Warm Heart', line: 'Restore 1 heart', apply: (p) => { p.lives = Math.min(LIVES, p.lives + 1); } },
  { id: 'dash', name: 'Ghost Dash', line: 'Dash recharges 40% faster', apply: (p) => { p.dashCooldown *= 0.6; } },
  { id: 'power', name: 'Bright Burn', line: 'Bolts deal +1 damage', apply: (p) => { p.boltDamage += 1; } },
];

export const PALETTE = {
  deep: '#070b1e',
  sea: '#0d1533',
  tide: '#16224d',
  foam: '#2b3f7a',
  ember: '#ffb347',
  emberHot: '#ffe08a',
  gold: '#f2c94c',
  player: '#ffd98a',
  flame: '#ff9a3d',
  wisp: '#8b7bff',
  wispDark: '#241f4d',
  brute: '#b06bff',
  boss: '#ff5d8f',
  bolt: '#ffe9a8',
  enemyBolt: '#ff7ab8',
  panel: '#141b38',
  panelEdge: '#2e3d73',
  text: '#f2f0ff',
  muted: '#9aa3c7',
  danger: '#ff5d6c',
  good: '#7dffb0',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'ember-tide.best';
