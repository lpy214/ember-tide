// The simulation: one lantern-keeper, drifting ember orbs to collect, shadow
// wisps that chase and must be shot, ten waves, upgrade choices between
// waves, and the Tide King on wave 10. Pure logic, no drawing, no sound:
// the caller plays sounds from the events this returns.

import { BOSS, FIELD, LIVES, ORB, PLAYER, STEP, UPGRADES, WAVES, WISP, wavePlan } from './config.js';
import { clamp, distance, makeRandom, range } from './random.js';

export const EVENT_NONE = 0;
export const EVENT_WAVE_CLEAR = 1;
export const EVENT_OVER = 2;
export const EVENT_WIN = 4;
export const EVENT_HIT = 8;
export const EVENT_KILL = 16;
export const EVENT_COLLECT = 32;
export const EVENT_SHOOT = 64;
export const EVENT_DASH = 128;
export const EVENT_BOSS = 256;

export function createWorld(seed) {
  const rng = makeRandom(seed);
  const world = {
    rng,
    time: 0,
    state: null,
    orbs: [],
    wisps: [],
    bolts: [],
    enemyBolts: [],
    particles: [],
    floats: [],
    spawnTimer: 0,
    orbTimer: 0,
    toSpawn: 0,
    spawnQueue: [],
    boss: null,
    bossVolley: 0,
    bossMinion: 0,
    wave: 0,
    waveActive: false,
    betweenWaves: false,
    choices: [],
    shake: 0,
    over: false,
    won: false,
  };
  resetWorld(world);
  return world;
}

export function resetWorld(world) {
  world.time = 0;
  world.orbs = [];
  world.wisps = [];
  world.bolts = [];
  world.enemyBolts = [];
  world.particles = [];
  world.floats = [];
  world.spawnTimer = 0;
  world.orbTimer = 0;
  world.toSpawn = 0;
  world.spawnQueue = [];
  world.boss = null;
  world.wave = 0;
  world.waveActive = false;
  world.betweenWaves = false;
  world.choices = [];
  world.shake = 0;
  world.over = false;
  world.won = false;
  world.state = {
    score: 0,
    best: 0,
    lives: LIVES,
    combo: 0,
    comboTimer: 0,
    kills: 0,
    collected: 0,
    shots: 0,
    wave: 0,
    enemiesLeft: 0,
    x: FIELD.width / 2,
    y: FIELD.height / 2 + 80,
    vx: 0,
    vy: 0,
    radius: PLAYER.radius,
    aimX: FIELD.width / 2,
    aimY: FIELD.height / 2 - 100,
    fireTimer: 0,
    dashTimer: 0,
    dashCooldown: 0,
    invuln: 0,
    speed: PLAYER.speed,
    fireInterval: PLAYER.fireInterval,
    bolts: 1,
    pierce: 0,
    boltDamage: PLAYER.boltDamage,
    magnetRadius: PLAYER.magnetRadius,
    dashCooldownMax: PLAYER.dashCooldown,
    moving: false,
  };
}

function spawnEdge(world, radius) {
  const side = Math.floor(world.rng() * 4);
  const m = radius + 8;
  if (side === 0) return { x: range(world.rng, m, FIELD.width - m), y: -m };
  if (side === 1) return { x: range(world.rng, m, FIELD.width - m), y: FIELD.height + m };
  if (side === 2) return { x: -m, y: range(world.rng, m, FIELD.height - m) };
  return { x: FIELD.width + m, y: range(world.rng, m, FIELD.height - m) };
}

function makeWisp(world, kind) {
  const spec = WISP[kind];
  const at = spawnEdge(world, spec.radius);
  return {
    kind, x: at.x, y: at.y, radius: spec.radius, speed: spec.speed * range(world.rng, 0.9, 1.15),
    hp: spec.hp, maxHp: spec.hp, points: spec.points, wobble: world.rng() * Math.PI * 2,
    flash: 0, dead: false,
  };
}

function planWave(world, wave) {
  const plan = wavePlan(wave);
  const queue = [];
  for (let i = 0; i < plan.count; i += 1) {
    let kind = 'wisp';
    const roll = world.rng();
    if (wave >= 3 && i % 5 === 0) kind = 'brute';
    else if (wave >= 4 && i % 4 === 0) kind = 'splitter';
    else if (roll < 0.3) kind = 'dart';
    queue.push(kind);
  }
  world.spawnQueue = queue;
  world.toSpawn = queue.length;
  world.spawnTimer = 0.4;
  world.waveActive = true;
  world.state.wave = wave;
  if (wave === WAVES) {
    const at = spawnEdge(world, BOSS.radius);
    world.boss = {
      kind: 'boss', x: at.x, y: 120, radius: BOSS.radius, speed: BOSS.speed,
      hp: BOSS.hp, maxHp: BOSS.hp, points: BOSS.points, wobble: 0, flash: 0, dead: false,
    };
    world.bossVolley = 2;
    world.bossMinion = 4;
  }
}

export function startWave(world, wave) {
  world.wave = wave;
  world.betweenWaves = false;
  world.choices = [];
  planWave(world, wave);
}

export function chooseUpgrade(world, id, upgrades) {
  const found = upgrades.find((u) => u.id === id);
  if (!found || !world.betweenWaves) return false;
  found.apply(world.state);
  world.betweenWaves = false;
  return true;
}

function burst(world, x, y, color, count, speed) {
  for (let i = 0; i < count; i += 1) {
    const a = world.rng() * Math.PI * 2;
    const v = range(world.rng, speed * 0.3, speed);
    world.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: range(world.rng, 0.35, 0.8), max: 0.8, color, size: range(world.rng, 2, 5) });
  }
}

function addFloat(world, x, y, text, color) {
  world.floats.push({ x, y, text, color, life: 1 });
}

function killWisp(world, wisp, events) {
  wisp.dead = true;
  const s = world.state;
  s.kills += 1;
  const gained = wisp.points * (1 + Math.min(4, Math.floor(s.combo / 8)));
  s.score += gained;
  addFloat(world, wisp.x, wisp.y, `+${gained}`, '#ffe9a8');
  burst(world, wisp.x, wisp.y, '#8b7bff', wisp.kind === 'brute' ? 22 : 12, 190);
  if (wisp.kind === 'splitter') {
    for (let i = 0; i < 2; i += 1) {
      world.wisps.push({ kind: 'mini', x: wisp.x + (i === 0 ? -14 : 14), y: wisp.y, radius: WISP.mini.radius, speed: WISP.mini.speed, hp: 1, maxHp: 1, points: WISP.mini.points, wobble: world.rng() * 6, flash: 0, dead: false });
    }
  }
  return events | EVENT_KILL;
}

function hurtPlayer(world, events) {
  const s = world.state;
  if (s.invuln > 0 || s.dashTimer > 0 || world.over) return events;
  s.lives -= 1;
  s.combo = 0;
  s.comboTimer = 0;
  s.invuln = PLAYER.invulnerable;
  world.shake = 14;
  burst(world, s.x, s.y, '#ff5d6c', 18, 240);
  if (s.lives <= 0) {
    world.over = true;
    return events | EVENT_HIT | EVENT_OVER;
  }
  return events | EVENT_HIT;
}

/** Advance the world one fixed step. `move` is {x, y} -1..1, `aim` is the
 *  mouse point, `dash` and `fire` are held inputs. Returns event flags. */
export function stepWorld(world, dt, move, aim, dash, fireHeld) {
  let events = EVENT_NONE;
  const s = world.state;
  world.time += dt;
  if (world.over || world.won) {
    updateFx(world, dt);
    return events;
  }

  // Combo decay.
  if (s.comboTimer > 0) {
    s.comboTimer -= dt;
    if (s.comboTimer <= 0) s.combo = 0;
  }
  if (s.invuln > 0) s.invuln -= dt;
  if (s.dashCooldown > 0) s.dashCooldown -= dt;

  // Dash.
  if (dash && s.dashCooldown <= 0 && s.dashTimer <= 0 && (move.x !== 0 || move.y !== 0)) {
    s.dashTimer = PLAYER.dashTime;
    s.dashCooldown = s.dashCooldownMax;
    events |= EVENT_DASH;
    burst(world, s.x, s.y, '#7dd7ff', 8, 120);
  }

  // Movement: keyboard, or steer toward the mouse while it is held.
  let mx = move.x;
  let my = move.y;
  if (mx === 0 && my === 0 && fireHeld && aim) {
    const dx = aim.x - s.x;
    const dy = aim.y - s.y;
    const d = Math.hypot(dx, dy);
    if (d > 24) { mx = dx / d; my = dy / d; }
  }
  const speed = s.dashTimer > 0 ? PLAYER.dashSpeed : s.speed;
  if (s.dashTimer > 0) s.dashTimer -= dt;
  s.vx = mx * speed;
  s.vy = my * speed;
  s.x = clamp(s.x + s.vx * dt, PLAYER.radius, FIELD.width - PLAYER.radius);
  s.y = clamp(s.y + s.vy * dt, PLAYER.radius, FIELD.height - PLAYER.radius);
  s.moving = mx !== 0 || my !== 0;
  if (aim) { s.aimX = aim.x; s.aimY = aim.y; }

  // Auto-fire at the nearest wisp or boss.
  s.fireTimer -= dt;
  if (s.fireTimer <= 0) {
    let target = null;
    let best = Infinity;
    const consider = (e) => {
      const d = distance(s.x, s.y, e.x, e.y);
      if (d < best) { best = d; target = e; }
    };
    world.wisps.forEach(consider);
    if (world.boss && !world.boss.dead) consider(world.boss);
    if (target && best < 620) {
      const base = Math.atan2(target.y - s.y, target.x - s.x);
      const n = s.bolts;
      for (let i = 0; i < n; i += 1) {
        const off = (i - (n - 1) / 2) * 0.14;
        world.bolts.push({
          x: s.x + Math.cos(base + off) * 26, y: s.y + Math.sin(base + off) * 26,
          vx: Math.cos(base + off) * PLAYER.boltSpeed, vy: Math.sin(base + off) * PLAYER.boltSpeed,
          damage: s.boltDamage, pierce: s.pierce, dead: false,
        });
      }
      s.fireTimer = s.fireInterval;
      s.shots += 1;
      events |= EVENT_SHOOT;
    } else {
      s.fireTimer = 0.05;
    }
  }

  // Spawning.
  if (world.waveActive && world.toSpawn > 0) {
    world.spawnTimer -= dt;
    if (world.spawnTimer <= 0) {
      const kind = world.spawnQueue.shift();
      world.wisps.push(makeWisp(world, kind));
      world.toSpawn -= 1;
      world.spawnTimer = wavePlan(world.wave).interval * range(world.rng, 0.7, 1.3);
    }
  }

  // Ember orbs drift in.
  world.orbTimer -= dt;
  if (world.orbTimer <= 0) {
    world.orbs.push({
      x: range(world.rng, 60, FIELD.width - 60), y: range(world.rng, 60, FIELD.height - 60),
      vy: ORB.drift * range(world.rng, 0.8, 1.3), vx: range(world.rng, -14, 14),
      radius: ORB.radius, phase: world.rng() * Math.PI * 2, dead: false,
    });
    world.orbTimer = ORB.interval * range(world.rng, 0.6, 1.4);
  }

  // Orbs: drift, magnet, collect.
  for (const orb of world.orbs) {
    orb.y += orb.vy * dt;
    orb.x += orb.vx * dt + Math.sin(world.time * 2 + orb.phase) * 12 * dt;
    const d = distance(s.x, s.y, orb.x, orb.y);
    if (d < s.magnetRadius && d > 1) {
      const pull = 420 * (1 - d / (s.magnetRadius + 60));
      orb.x += ((s.x - orb.x) / d) * pull * dt;
      orb.y += ((s.y - orb.y) / d) * pull * dt;
    }
    if (d < s.radius + orb.radius) {
      orb.dead = true;
      s.collected += 1;
      s.combo += 1;
      s.comboTimer = ORB.comboWindow;
      const gained = ORB.points * (1 + Math.min(4, Math.floor(s.combo / 5)));
      s.score += gained;
      addFloat(world, orb.x, orb.y, `+${gained}`, '#ffd98a');
      burst(world, orb.x, orb.y, '#ffb347', 7, 130);
      events |= EVENT_COLLECT;
    }
    if (orb.y > FIELD.height + 30) orb.dead = true;
  }
  world.orbs = world.orbs.filter((o) => !o.dead);

  // Wisps chase, wobble, and touch the player.
  for (const wisp of world.wisps) {
    wisp.wobble += dt * 3;
    const dx = s.x - wisp.x;
    const dy = s.y - wisp.y;
    const d = Math.hypot(dx, dy) || 1;
    const wob = Math.sin(wisp.wobble) * 0.35;
    const nx = dx / d;
    const ny = dy / d;
    wisp.x += (nx * Math.cos(wob) - ny * Math.sin(wob)) * wisp.speed * dt;
    wisp.y += (nx * Math.sin(wob) + ny * Math.cos(wob)) * wisp.speed * dt;
    if (wisp.flash > 0) wisp.flash -= dt;
    if (d < wisp.radius + s.radius - 4) {
      events = hurtPlayer(world, events);
      // Knock the wisp back so one touch is one hit.
      wisp.x -= nx * 40;
      wisp.y -= ny * 40;
      if (world.over) return events;
    }
  }

  // Boss behaviour.
  const boss = world.boss;
  if (boss && !boss.dead) {
    boss.wobble += dt;
    const dx = s.x - boss.x;
    const dy = s.y - boss.y;
    const d = Math.hypot(dx, dy) || 1;
    boss.x += (dx / d) * boss.speed * dt;
    boss.y += (dy / d) * boss.speed * dt * 0.6 + Math.sin(boss.wobble * 1.4) * 22 * dt;
    boss.x = clamp(boss.x, 70, FIELD.width - 70);
    boss.y = clamp(boss.y, 70, FIELD.height - 70);
    if (boss.flash > 0) boss.flash -= dt;
    world.bossVolley -= dt;
    if (world.bossVolley <= 0) {
      world.bossVolley = BOSS.volleyInterval;
      for (let i = 0; i < BOSS.volleyBolts; i += 1) {
        const a = (i / BOSS.volleyBolts) * Math.PI * 2 + boss.wobble;
        world.enemyBolts.push({ x: boss.x, y: boss.y, vx: Math.cos(a) * 190, vy: Math.sin(a) * 190, radius: 7, dead: false });
      }
    }
    world.bossMinion -= dt;
    if (world.bossMinion <= 0) {
      world.bossMinion = BOSS.minionInterval;
      world.wisps.push(makeWisp(world, 'dart'));
      world.wisps.push(makeWisp(world, 'dart'));
    }
    if (d < boss.radius + s.radius - 6) events = hurtPlayer(world, events);
    if (world.over) return events;
  }

  // Player bolts: move, hit wisps and the boss.
  for (const bolt of world.bolts) {
    bolt.x += bolt.vx * dt;
    bolt.y += bolt.vy * dt;
    if (bolt.x < -20 || bolt.x > FIELD.width + 20 || bolt.y < -20 || bolt.y > FIELD.height + 20) { bolt.dead = true; continue; }
    const hitList = [];
    for (const wisp of world.wisps) {
      if (!wisp.dead && distance(bolt.x, bolt.y, wisp.x, wisp.y) < wisp.radius + 6) hitList.push(wisp);
    }
    if (boss && !boss.dead && distance(bolt.x, bolt.y, boss.x, boss.y) < boss.radius + 6) hitList.push(boss);
    for (const target of hitList) {
      target.hp -= bolt.damage;
      target.flash = 0.12;
      burst(world, bolt.x, bolt.y, '#ffe9a8', 3, 90);
      if (target.hp <= 0 && !target.dead) {
        if (target === boss) {
          boss.dead = true;
          s.score += BOSS.points;
          addFloat(world, boss.x, boss.y, `+${BOSS.points}`, '#ff8fb0');
          burst(world, boss.x, boss.y, '#ff5d8f', 40, 320);
          burst(world, boss.x, boss.y, '#ffe9a8', 24, 220);
          events |= EVENT_KILL;
        } else {
          events = killWisp(world, target, events);
        }
      }
      bolt.pierce -= 1;
      if (bolt.pierce < 0) { bolt.dead = true; break; }
    }
  }
  world.bolts = world.bolts.filter((b) => !b.dead);
  world.wisps = world.wisps.filter((w) => !w.dead);

  // Enemy bolts drift and can hit the player.
  for (const eb of world.enemyBolts) {
    eb.x += eb.vx * dt;
    eb.y += eb.vy * dt;
    if (eb.x < -20 || eb.x > FIELD.width + 20 || eb.y < -20 || eb.y > FIELD.height + 20) { eb.dead = true; continue; }
    if (distance(eb.x, eb.y, s.x, s.y) < eb.radius + s.radius - 4) {
      eb.dead = true;
      events = hurtPlayer(world, events);
      if (world.over) return events;
    }
  }
  world.enemyBolts = world.enemyBolts.filter((b) => !b.dead);

  // Wave cleared?
  if (world.waveActive && world.toSpawn === 0 && world.wisps.length === 0 && (!world.boss || world.boss.dead)) {
    world.waveActive = false;
    if (world.wave >= WAVES) {
      world.won = true;
      s.score += 1000;
      return events | EVENT_WIN;
    }
    const bonus = 50 * world.wave;
    s.score += bonus;
    addFloat(world, s.x, s.y - 50, `Wave ${world.wave} clear +${bonus}`, '#7dffb0');
    world.betweenWaves = true;
    world.choices = pickUpgrades(world);
    return events | EVENT_WAVE_CLEAR;
  }

  s.enemiesLeft = world.toSpawn + world.wisps.length + (world.boss && !world.boss.dead ? 1 : 0);
  updateFx(world, dt);
  return events;
}

function pickUpgrades(world) {
  // Deal three different upgrade cards, shuffled with the world's seed.
  const pool = [...UPGRADES];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(world.rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const full = world.state.lives >= LIVES;
  const dealt = pool.filter((u) => !(full && u.id === 'heart')).slice(0, 3);
  return dealt.length === 3 ? dealt : pool.slice(0, 3);
}

function updateFx(world, dt) {
  if (world.shake > 0) world.shake = Math.max(0, world.shake - dt * 40);
  for (const p of world.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.96;
    p.vy *= 0.96;
    p.life -= dt;
  }
  world.particles = world.particles.filter((p) => p.life > 0);
  for (const f of world.floats) {
    f.y -= 34 * dt;
    f.life -= dt * 0.9;
  }
  world.floats = world.floats.filter((f) => f.life > 0);
}

export { STEP };
