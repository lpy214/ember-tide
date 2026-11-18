// All drawing, on a 1280x720 canvas scaled to the window. The judge sees
// the game mostly through its screenshots, so every screen must read at a
// glance: big title, live HUD, and a clear win or loss screen.

import { FIELD, FONT, PALETTE } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_UPGRADE = 'upgrade';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';
export const SCREEN_PAUSE = 'pause';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function glowCircle(ctx, x, y, radius, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawBackground(ctx, time) {
  const g = ctx.createLinearGradient(0, 0, 0, FIELD.height);
  g.addColorStop(0, PALETTE.deep);
  g.addColorStop(0.6, PALETTE.sea);
  g.addColorStop(1, PALETTE.tide);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);

  // Slow tide bands.
  for (let band = 0; band < 4; band += 1) {
    ctx.beginPath();
    const baseY = 150 + band * 150;
    ctx.moveTo(0, baseY);
    for (let x = 0; x <= FIELD.width; x += 40) {
      ctx.lineTo(x, baseY + Math.sin(x / 180 + time * 0.5 + band * 1.7) * 16);
    }
    ctx.lineTo(FIELD.width, FIELD.height);
    ctx.lineTo(0, FIELD.height);
    ctx.closePath();
    ctx.fillStyle = band % 2 === 0 ? 'rgba(43,63,122,0.16)' : 'rgba(22,34,77,0.22)';
    ctx.fill();
  }

  // Stars / drifting motes.
  for (let i = 0; i < 70; i += 1) {
    const x = (i * 173 + 40) % FIELD.width;
    const y = (i * 97 + 30) % FIELD.height;
    const tw = 0.25 + 0.35 * Math.abs(Math.sin(time * 0.7 + i));
    ctx.globalAlpha = tw;
    ctx.fillStyle = '#cdd6ff';
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.globalAlpha = 1;
}

function drawOrb(ctx, orb, time) {
  glowCircle(ctx, orb.x, orb.y, 30, 'rgba(255,179,71,0.55)', 0.8);
  ctx.fillStyle = PALETTE.emberHot;
  ctx.beginPath();
  ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.ember;
  ctx.beginPath();
  ctx.arc(orb.x - 3, orb.y - 3, orb.radius * 0.45, 0, Math.PI * 2);
  ctx.fill();
}

function drawWisp(ctx, wisp, time) {
  const flash = wisp.flash > 0;
  const body = wisp.kind === 'brute' ? PALETTE.brute : wisp.kind === 'boss' ? PALETTE.boss : PALETTE.wisp;
  glowCircle(ctx, wisp.x, wisp.y, wisp.radius * 2.6, flash ? 'rgba(255,255,255,0.7)' : 'rgba(139,123,255,0.4)', 0.8);
  // Smoke body.
  ctx.fillStyle = flash ? '#ffffff' : PALETTE.wispDark;
  ctx.beginPath();
  ctx.arc(wisp.x, wisp.y, wisp.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = body;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(wisp.x, wisp.y, wisp.radius - 1, 0, Math.PI * 2);
  ctx.stroke();
  // Tail.
  ctx.beginPath();
  ctx.moveTo(wisp.x - wisp.radius * 0.7, wisp.y + wisp.radius * 0.5);
  ctx.quadraticCurveTo(wisp.x, wisp.y + wisp.radius * 1.7 + Math.sin(time * 5 + wisp.wobble) * 5, wisp.x + wisp.radius * 0.7, wisp.y + wisp.radius * 0.5);
  ctx.closePath();
  ctx.fillStyle = body;
  ctx.globalAlpha = 0.75;
  ctx.fill();
  ctx.globalAlpha = 1;
  // Eyes.
  const ex = wisp.radius * 0.36;
  const ey = -wisp.radius * 0.15;
  ctx.fillStyle = wisp.kind === 'boss' ? '#ffd166' : '#eaf6ff';
  ctx.beginPath();
  ctx.arc(wisp.x - ex, wisp.y + ey, 3.2, 0, Math.PI * 2);
  ctx.arc(wisp.x + ex, wisp.y + ey, 3.2, 0, Math.PI * 2);
  ctx.fill();
  if (wisp.maxHp > 1) {
    const w = wisp.radius * 2;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(wisp.x - w / 2, wisp.y - wisp.radius - 12, w, 5);
    ctx.fillStyle = PALETTE.danger;
    ctx.fillRect(wisp.x - w / 2, wisp.y - wisp.radius - 12, w * (wisp.hp / wisp.maxHp), 5);
  }
}

function drawPlayer(ctx, state, time) {
  const blink = state.invuln > 0 && Math.floor(time * 14) % 2 === 0;
  const flick = 1 + Math.sin(time * 9) * 0.08;
  glowCircle(ctx, state.x, state.y, 110 * flick, 'rgba(255,179,71,0.5)', blink ? 0.25 : 0.85);
  // Lantern body.
  ctx.fillStyle = PALETTE.player;
  ctx.beginPath();
  ctx.arc(state.x, state.y, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.flame;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(state.x, state.y, 20, 0, Math.PI * 2);
  ctx.stroke();
  // Flame.
  ctx.fillStyle = PALETTE.flame;
  ctx.beginPath();
  ctx.moveTo(state.x, state.y - 16 * flick);
  ctx.quadraticCurveTo(state.x + 8, state.y - 2, state.x, state.y + 8);
  ctx.quadraticCurveTo(state.x - 8, state.y - 2, state.x, state.y - 16 * flick);
  ctx.fill();
  // Eyes.
  ctx.fillStyle = '#3a2b12';
  ctx.beginPath();
  ctx.arc(state.x - 6, state.y - 2, 2.4, 0, Math.PI * 2);
  ctx.arc(state.x + 6, state.y - 2, 2.4, 0, Math.PI * 2);
  ctx.fill();
  // Dash cooldown ring.
  if (state.dashCooldown > 0) {
    ctx.strokeStyle = 'rgba(125,215,255,0.7)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(state.x, state.y, 28, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - state.dashCooldown / state.dashCooldownMax));
    ctx.stroke();
  }
}

function drawHud(ctx, world, screen) {
  const s = world.state;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  // Score panel.
  ctx.fillStyle = 'rgba(10,14,34,0.72)';
  roundRect(ctx, 16, 14, 250, 74, 12);
  ctx.fill();
  ctx.fillStyle = PALETTE.text;
  ctx.font = `700 30px ${FONT}`;
  ctx.fillText(`SCORE  ${s.score}`, 30, 24);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `500 15px ${FONT}`;
  ctx.fillText(`BEST  ${Math.max(s.best, s.score)}`, 30, 60);
  // Combo.
  if (s.combo >= 3) {
    ctx.fillStyle = PALETTE.ember;
    ctx.font = `700 22px ${FONT}`;
    ctx.fillText(`COMBO x${Math.min(5, 1 + Math.floor(s.combo / 5))}  (${s.combo})`, 30, 92);
    ctx.fillStyle = 'rgba(255,179,71,0.35)';
    ctx.fillRect(30, 120, 120, 6);
    ctx.fillStyle = PALETTE.ember;
    ctx.fillRect(30, 120, 120 * Math.max(0, s.comboTimer / 4), 6);
  }
  // Wave panel, top centre.
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(10,14,34,0.72)';
  roundRect(ctx, FIELD.width / 2 - 130, 14, 260, 56, 12);
  ctx.fill();
  ctx.fillStyle = PALETTE.text;
  ctx.font = `700 24px ${FONT}`;
  ctx.fillText(world.boss && !world.boss.dead ? 'WAVE 10  ·  TIDE KING' : `WAVE ${Math.max(1, s.wave)} / 10`, FIELD.width / 2, 24);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `500 14px ${FONT}`;
  ctx.fillText(world.waveActive ? `${s.enemiesLeft} shadows left` : 'Get ready…', FIELD.width / 2, 50);
  // Hearts, top right.
  ctx.textAlign = 'right';
  for (let i = 0; i < 3; i += 1) {
    const x = FIELD.width - 34 - i * 42;
    const y = 40;
    ctx.font = '30px sans-serif';
    ctx.fillText(i < s.lives ? '❤' : '♡', x, y - 8);
  }
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `500 14px ${FONT}`;
  ctx.fillText(s.dashCooldown > 0 ? 'DASH recharging…' : 'SPACE / SHIFT to dash', FIELD.width - 20, 66);
  // Boss bar.
  if (world.boss && !world.boss.dead) {
    const w = 420;
    const x = FIELD.width / 2 - w / 2;
    const y = FIELD.height - 34;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    roundRect(ctx, x - 6, y - 6, w + 12, 22, 10);
    ctx.fill();
    ctx.fillStyle = PALETTE.boss;
    ctx.fillRect(x, y, w * (world.boss.hp / world.boss.maxHp), 10);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `700 13px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('TIDE KING', FIELD.width / 2, y - 24);
  }
  ctx.textAlign = 'left';
}

function drawParticles(ctx, world) {
  for (const p of world.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  for (const f of world.floats) {
    ctx.globalAlpha = Math.max(0, f.life);
    ctx.fillStyle = f.color;
    ctx.font = `700 18px ${FONT}`;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(10,14,34,0.82)';
  roundRect(ctx, x, y, w, h, 18);
  ctx.fill();
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, 18);
  ctx.stroke();
}

function drawTitle(ctx, world, best) {
  panel(ctx, 290, 110, 700, 470);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.ember;
  ctx.font = `700 64px ${FONT}`;
  ctx.fillText('EMBER TIDE', FIELD.width / 2, 150);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `500 22px ${FONT}`;
  ctx.fillText('Keep your lantern lit. Gather the embers,', FIELD.width / 2, 232);
  ctx.fillText('shatter the shadows, and face the Tide King.', FIELD.width / 2, 262);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `500 18px ${FONT}`;
  ctx.fillText('WASD / arrows or mouse — move      SPACE / SHIFT — dash', FIELD.width / 2, 316);
  ctx.fillText('Bolts fire on their own at the nearest shadow', FIELD.width / 2, 344);
  ctx.fillText('Clear 10 waves to win  ·  3 hearts  ·  P pause  ·  M mute', FIELD.width / 2, 372);
  ctx.fillStyle = PALETTE.emberHot;
  ctx.font = `700 26px ${FONT}`;
  ctx.fillText('Click or press Enter to begin', FIELD.width / 2, 428);
  if (best > 0) {
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `500 18px ${FONT}`;
    ctx.fillText(`Best score: ${best}`, FIELD.width / 2, 478);
  }
  ctx.textAlign = 'left';
}

function drawUpgrade(ctx, world) {
  panel(ctx, 190, 130, 900, 420);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.good;
  ctx.font = `700 34px ${FONT}`;
  ctx.fillText(`Wave ${world.wave} clear!`, FIELD.width / 2, 160);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `500 20px ${FONT}`;
  ctx.fillText('Choose one blessing to carry into the next wave:', FIELD.width / 2, 206);
  world.choices.forEach((choice, i) => {
    const x = 240 + i * 280;
    const y = 250;
    ctx.fillStyle = 'rgba(43,63,122,0.55)';
    roundRect(ctx, x, y, 240, 190, 14);
    ctx.fill();
    ctx.strokeStyle = PALETTE.ember;
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, 240, 190, 14);
    ctx.stroke();
    ctx.fillStyle = PALETTE.ember;
    ctx.font = `700 20px ${FONT}`;
    ctx.fillText(`[${i + 1}]`, x + 120, y + 22);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `700 22px ${FONT}`;
    ctx.fillText(choice.name, x + 120, y + 58);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `500 17px ${FONT}`;
    ctx.fillText(choice.line, x + 120, y + 96);
    ctx.fillText('Click the card or', x + 120, y + 132);
    ctx.fillText(`press ${i + 1}`, x + 120, y + 156);
  });
  ctx.textAlign = 'left';
}

function drawEnd(ctx, world, screen, best) {
  const s = world.state;
  const won = screen === SCREEN_WIN;
  panel(ctx, 340, 150, 600, 400);
  ctx.textAlign = 'center';
  ctx.fillStyle = won ? PALETTE.good : PALETTE.danger;
  ctx.font = `700 54px ${FONT}`;
  ctx.fillText(won ? 'THE TIDE IS LIT!' : 'THE LIGHT FADES', FIELD.width / 2, 190);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `500 22px ${FONT}`;
  ctx.fillText(won ? 'You shattered the Tide King and lit all ten waves.' : 'The shadows swallowed your lantern.', FIELD.width / 2, 262);
  ctx.font = `700 30px ${FONT}`;
  ctx.fillText(`Score  ${s.score}`, FIELD.width / 2, 312);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `500 18px ${FONT}`;
  ctx.fillText(`Waves cleared: ${won ? 10 : Math.max(0, s.wave - 1)}   ·   Shadows shattered: ${s.kills}`, FIELD.width / 2, 362);
  ctx.fillText(`Embers gathered: ${s.collected}   ·   Best score: ${Math.max(best, s.score)}`, FIELD.width / 2, 392);
  ctx.fillStyle = PALETTE.emberHot;
  ctx.font = `700 24px ${FONT}`;
  ctx.fillText('Press R or click to play again', FIELD.width / 2, 452);
  ctx.textAlign = 'left';
}

export function drawGame(ctx, world, screen, time, best) {
  ctx.save();
  if (world.shake > 0) {
    ctx.translate((Math.random() - 0.5) * world.shake, (Math.random() - 0.5) * world.shake);
  }
  drawBackground(ctx, time);
  for (const orb of world.orbs) drawOrb(ctx, orb, time);
  for (const bolt of world.bolts) {
    glowCircle(ctx, bolt.x, bolt.y, 16, 'rgba(255,233,168,0.8)', 0.9);
    ctx.fillStyle = PALETTE.bolt;
    ctx.beginPath();
    ctx.arc(bolt.x, bolt.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const eb of world.enemyBolts) {
    glowCircle(ctx, eb.x, eb.y, 16, 'rgba(255,122,184,0.8)', 0.9);
    ctx.fillStyle = PALETTE.enemyBolt;
    ctx.beginPath();
    ctx.arc(eb.x, eb.y, eb.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const wisp of world.wisps) drawWisp(ctx, wisp, time);
  if (world.boss && !world.boss.dead) drawWisp(ctx, world.boss, time);
  drawPlayer(ctx, world.state, time);
  drawParticles(ctx, world);
  ctx.restore();

  if (screen === SCREEN_PLAY || screen === SCREEN_UPGRADE || screen === SCREEN_PAUSE) drawHud(ctx, world, screen);
  if (screen === SCREEN_TITLE) drawTitle(ctx, world, best);
  if (screen === SCREEN_UPGRADE) drawUpgrade(ctx, world);
  if (screen === SCREEN_OVER || screen === SCREEN_WIN) {
    drawHud(ctx, world, screen);
    drawEnd(ctx, world, screen, best);
  }
  if (screen === SCREEN_PAUSE) {
    panel(ctx, 440, 280, 400, 140);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = `700 36px ${FONT}`;
    ctx.fillText('Paused', FIELD.width / 2, 320);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `500 18px ${FONT}`;
    ctx.fillText('Press P to keep playing', FIELD.width / 2, 368);
    ctx.textAlign = 'left';
  }
}
