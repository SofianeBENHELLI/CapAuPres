import { test } from 'node:test';
import assert from 'node:assert/strict';
import { flagFor } from '../app/js/core/conditions.js';

const s = (kn, gust, from, h = 0.8, extra = {}) => ({ wind: { kn, gust, from }, waves: { height: h }, ...extra });
const BOATS = ['optimist', 'deriveur', 'catamaran', 'j80'];

test('le drapeau est le même pour tous les bateaux', () => {
  for (const c of [s(8, 12, 240), s(15, 20, 30), s(19, 25, 250), s(24, 31, 270), s(30, 40, 250)]) {
    const colors = BOATS.map((b) => flagFor(c, b).color);
    assert.equal(new Set(colors).size, 1, JSON.stringify(c));
  }
});
test('le vent de terre ne relève pas le drapeau, il donne un avertissement', () => {
  const terre = flagFor(s(12, 16, 30));
  const mer = flagFor(s(12, 16, 240));
  assert.equal(terre.color, 'green');
  assert.equal(terre.color, mer.color);
  assert.ok(terre.warnings.some((w) => /vent de terre/.test(w) && /rentrée/.test(w)));
});
test('paliers de vent et de vagues', () => {
  assert.equal(flagFor(s(14, 20, 250)).color, 'green');
  assert.equal(flagFor(s(18, 24, 250)).color, 'yellow');
  assert.equal(flagFor(s(24, 30, 250)).color, 'red');
  assert.equal(flagFor(s(30, 38, 250)).color, 'black');
  assert.equal(flagFor(s(10, 14, 250, 2.5)).color, 'yellow');
  assert.equal(flagFor(s(10, 14, 250, 3.5)).color, 'red');
});
test('nuit et orage restent prioritaires', () => {
  assert.equal(flagFor(s(10, 14, 250, 0.5, { night: true })).color, 'night');
  assert.equal(flagFor(s(10, 14, 250, 0.5, { sky: { label: 'Orage' } })).color, 'black');
});

test('fiabilité : elle baisse avec l’échéance, sur 7 jours', async () => {
  const { reliability, HORIZON_H } = await import('../app/js/core/conditions.js');
  const now = new Date(2026, 10, 12, 10);
  const at = (h) => new Date(now.getTime() + h * 3600e3);
  assert.equal(HORIZON_H, 168);
  assert.equal(reliability(at(0), now).level, 4);
  assert.equal(reliability(at(47), now).level, 4);
  assert.equal(reliability(at(60), now).level, 3);
  assert.equal(reliability(at(100), now).level, 2);
  assert.equal(reliability(at(150), now).level, 1);
  assert.match(reliability(at(150), now).label, /Faible/);
});
