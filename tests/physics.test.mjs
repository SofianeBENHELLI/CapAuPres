import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOATS, BOAT_LIST, polarSpeed, bestVmgAngles, optimalSheet } from '../app/js/boats.js';
import { createBoatState, step, allureName, twaOf } from '../app/js/physics.js';

const steady = (twd, tws) => () => ({ twd, tws });
function run(boat, heading, sheet, tws = 12, secs = 60, extra = {}) {
  const s = createBoatState(boat, { x: 0, y: -1500 }, heading);
  for (let t = 0; t < secs; t += 0.25) step(s, { rudder: 0, sheet, ...extra }, steady(0, tws), { waveH: 0 }, 0.25);
  return s;
}

test('vent debout : le bateau n\'avance pas', () => {
  for (const b of BOAT_LIST) assert.ok(run(b, 0, 1).speed < 0.8, b.id);
});
test('au travers bien réglé on va plus vite qu\'au près', () => {
  for (const b of BOAT_LIST) {
    const près = run(b, b.noGo + 5, optimalSheet(b, b.noGo + 5)).speed;
    const travers = run(b, 95, optimalSheet(b, 95)).speed;
    assert.ok(travers > près, `${b.id} ${travers} > ${près}`);
  }
});
test('mal régler la voile coûte de la vitesse (choqué ou bordé)', () => {
  const b = BOATS['420'];
  const opt = run(b, 100, optimalSheet(b, 100)).speed;
  assert.ok(run(b, 100, 1).speed < opt * 0.9);
  assert.ok(run(b, 100, 0).speed < opt * 0.6);
});
test('le catamaran est le plus rapide au travers, l\'Optimist le plus lent', () => {
  const v = Object.fromEntries(BOAT_LIST.map((b) => [b.id, polarSpeed(b, 100, 12)]));
  assert.ok(v.hobie16 > v['420'] && v['420'] > v.optimist && v.j80 > v.optimist);
});
test('le catamaran doit empanner : meilleur VMG portant loin du vent arrière', () => {
  assert.ok(bestVmgAngles(BOATS.hobie16, 12).down < 160);
});
test('trop de vent bordé à fond fait chavirer un dériveur, pas le J/80', () => {
  const o = createBoatState(BOATS.optimist, { x: 0, y: -1500 }, 90);
  let cap = false;
  for (let t = 0; t < 30; t += 0.25) cap ||= step(o, { rudder: 0, sheet: 1 }, steady(0, 24), { waveH: 0 }, 0.25).some((e) => e.type === 'capsize');
  assert.ok(cap);
  const j = createBoatState(BOATS.j80, { x: 0, y: -1500 }, 90);
  let jcap = false;
  for (let t = 0; t < 30; t += 0.25) jcap ||= step(j, { rudder: 0, sheet: 1 }, steady(0, 24), { waveH: 0 }, 0.25).some((e) => e.type === 'capsize');
  assert.ok(!jcap);
});
test('le rappel permet de porter plus de toile', () => {
  const b = BOATS['420'];
  const sans = run(b, 90, 0.75, 15, 40), avec = run(b, 90, 0.75, 15, 40, { hike: true });
  assert.ok(avec.power < sans.power);
});
test('noms d\'allure et amures', () => {
  assert.equal(allureName(95), 'Travers');
  assert.equal(allureName(10), 'Vent debout');
  assert.ok(twaOf(315, 0) > 0); // cap NO, vent du N : tribord amures
});
