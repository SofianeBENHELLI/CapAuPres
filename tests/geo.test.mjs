import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as g from '../app/js/geo.js';

test('le club est dans l\'eau, près de la plage, dans la bande des 300 m', () => {
  const c = g.PLACES.club;
  assert.equal(g.groundingAt(c), null);
  assert.ok(g.inBand300(c));
});
test('l\'intérieur des terres est de la terre', () => {
  assert.ok(g.isLand(g.toXY(47.285, -2.39))); // La Baule ville
  assert.ok(g.isLand(g.toXY(47.29, -2.43)));
});
test('le milieu de la baie est navigable et hors bande', () => {
  const p = g.toXY(47.255, -2.39);
  assert.equal(g.groundingAt(p), null);
  assert.ok(!g.inBand300(p));
});
test('chaque îlot fait échouer et a une zone de hauts-fonds', () => {
  for (const i of g.ISLETS) {
    assert.ok(g.groundingAt(i), i.name);
    assert.ok(g.shoalWarning({ x: i.x + i.r + 40, y: i.y }), i.name);
  }
});
test('aller tout droit du club au Grand Charpentier touche le fond, A* trouve un passage', () => {
  const grid = g.buildGrid(80, 70);
  const gc = g.ISLETS.find((i) => i.id === 'grand-charpentier');
  const to = { x: gc.x - 300, y: gc.y - 300 };
  const r = g.findRoute(grid, g.PLACES.club, to);
  assert.ok(r && r.length >= 2);
  for (let i = 1; i < r.length; i++) assert.ok(g.segmentClear(r[i - 1], r[i]), `segment ${i}`);
});
test('vent de nord = vent de terre au club, vent de sud-ouest = vent de mer', () => {
  assert.ok(g.isOffshoreWindAt(g.PLACES.club, 0));
  assert.ok(g.isOffshoreWindAt(g.PLACES.club, 45));
  assert.ok(!g.isOffshoreWindAt(g.PLACES.club, 220));
});
test('projection aller-retour', () => {
  const p = g.toXY(47.25, -2.4); const q = g.toLatLon(p.x, p.y);
  assert.ok(Math.abs(q.lat - 47.25) < 1e-9 && Math.abs(q.lon + 2.4) < 1e-9);
});
