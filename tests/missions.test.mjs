import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MISSIONS, dailyChallenge, stars } from '../app/js/missions.js';
import { BOAT_LIST } from '../app/js/boats.js';
import { simulateAuto } from '../app/js/race.js';
import { groundingAt } from '../app/js/geo.js';
import { REFS } from '../app/js/refs.js';

test('10 missions, toutes les bouées en eau navigable', () => {
  assert.equal(MISSIONS.length, 10);
  for (const m of MISSIONS) {
    assert.equal(groundingAt(m.start), null, m.id);
    for (const k of m.marks) assert.equal(groundingAt(k), null, `${m.id} ${k.label}`);
  }
});
for (const m of MISSIONS) {
  test(`mission ${m.id} faisable par chaque bateau sans échouement`, async () => {
    for (const b of BOAT_LIST) {
      const r = await simulateAuto(m, b.id);
      assert.ok(r.done, `${b.id} ne termine pas`);
      assert.equal(r.groundings, 0, `${b.id} touche le fond`);
      assert.ok(REFS[m.id][b.id] > 0);
    }
  });
}
test('vent de terre : la rentrée au club est aussi facile que la sortie', async () => {
  const m = MISSIONS.find((x) => x.id === 'vent-terre');
  for (const b of BOAT_LIST) {
    const r = await simulateAuto(m, b.id);
    const half = r.track.findIndex((p) => Math.hypot(p.x - m.marks[0].x, p.y - m.marks[0].y) < m.marks[0].r + 30);
    const out = r.track[half].t, back = r.time - out;
    assert.ok(back < out * 2.6, `${b.id} retour ${back} vs aller ${out}`);
  }
});
test('défi du jour stable pour une date et différent selon les jours', () => {
  const a = dailyChallenge(new Date(2026, 10, 5)), b = dailyChallenge(new Date(2026, 10, 5)), c = dailyChallenge(new Date(2026, 10, 6));
  assert.deepEqual(a.wind, b.wind);
  assert.notDeepEqual(a.key, c.key);
  assert.ok(!a.mission.long);
});
test('étoiles', () => {
  assert.equal(stars(100, 100), 3);
  assert.equal(stars(150, 100), 2);
  assert.equal(stars(300, 100), 1);
  assert.equal(stars(100, 100, 1), 2);
});
