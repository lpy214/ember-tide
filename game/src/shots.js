// The screenshot scenes behind ?shot=start|play|end. Each one plays the real
// rules forward from a fresh world for a fixed number of steps, steered by a
// simple autopilot, so the frame is what a short game really looks like and
// the same seed always gives the same frame.

import { FIELD, STEP, UPGRADES } from './config.js';
import { EVENT_OVER, EVENT_WIN, chooseUpgrade, startWave, stepWorld } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const START_SECONDS = 4;
const PLAY_SECONDS = 42;
const END_LIMIT_SECONDS = 240;
const SAMPLE = 1 / 30;

/** Steer the lantern: chase the nearest orb, flee the nearest wisp when it
 *  is close. `skill` 1 plays well, 0 plays carelessly and gets caught. */
function autopilot(world, skill) {
  const s = world.state;
  let fx = 0;
  let fy = 0;
  let nearestOrb = null;
  let nearestOrbD = Infinity;
  for (const orb of world.orbs) {
    const d = Math.hypot(orb.x - s.x, orb.y - s.y);
    if (d < nearestOrbD) { nearestOrbD = d; nearestOrb = orb; }
  }
  if (nearestOrb) {
    fx += (nearestOrb.x - s.x) / Math.max(1, nearestOrbD);
    fy += (nearestOrb.y - s.y) / Math.max(1, nearestOrbD);
  }
  let nearestWisp = null;
  let nearestWispD = Infinity;
  const consider = (e) => {
    const d = Math.hypot(e.x - s.x, e.y - s.y);
    if (d < nearestWispD) { nearestWispD = d; nearestWisp = e; }
  };
  world.wisps.forEach(consider);
  if (world.boss && !world.boss.dead) consider(world.boss);
  const fleeRange = skill > 0.5 ? 190 : 90;
  if (nearestWisp && nearestWispD < fleeRange) {
    const w = skill > 0.5 ? 2.2 : 0.8;
    fx += ((s.x - nearestWisp.x) / Math.max(1, nearestWispD)) * w;
    fy += ((s.y - nearestWisp.y) / Math.max(1, nearestWispD)) * w;
  }
  const len = Math.hypot(fx, fy);
  if (len < 0.05) return { x: 0, y: 0, dash: false };
  const dash = skill > 0.5 && nearestWispD < 70;
  return { x: fx / len, y: fy / len, dash };
}

/** Set `world` to the named scene (start, play or end; any other name is
 *  start) and return the screen to draw over it and the best score to show. */
export function stageShot(name, world) {
  if (name !== 'play' && name !== 'end') {
    // Title: let the tide drift a few seconds behind the title panel.
    for (let i = 0; i < START_SECONDS / STEP; i += 1) {
      stepWorld(world, STEP, { x: 0, y: 0 }, null, false, false);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  startWave(world, 1);
  const limit = name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  const skill = name === 'end' ? 0 : 1;
  let events = 0;
  for (let i = 0; i < limit / STEP; i += 1) {
    const move = autopilot(world, skill);
    events = stepWorld(world, STEP, move, { x: world.state.x, y: world.state.y - 120 }, move.dash, true);
    if (events & EVENT_OVER) break;
    if (events & EVENT_WIN) break;
    if (world.betweenWaves) {
      // Take the first blessing and carry on into the next wave.
      const first = world.choices[0];
      if (first) chooseUpgrade(world, first.id, UPGRADES);
      startWave(world, world.wave + 1);
    }
  }
  if (world.over) return { screen: SCREEN_OVER, best: world.state.score };
  if (world.won) return { screen: SCREEN_WIN, best: world.state.score };
  if (world.betweenWaves) return { screen: SCREEN_PLAY, best: world.state.score };
  return { screen: SCREEN_PLAY, best: world.state.score };
}

export { SAMPLE, FIELD };
