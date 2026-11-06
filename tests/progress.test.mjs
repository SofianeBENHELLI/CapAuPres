import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createProgress, memoryStore, rankOf, RANKS } from '../app/js/progress.js';
import { LESSONS, makeQuiz } from '../app/js/lessons.js';
import { rng } from '../app/js/wind.js';

test('grades croissants et calcul du grade', () => {
  for (let i = 1; i < RANKS.length; i++) assert.ok(RANKS[i].xp > RANKS[i - 1].xp);
  assert.equal(rankOf(0).name, 'Moussaillon');
  assert.equal(rankOf(99999).name, 'Amiral');
});
test('mission : XP, badges, persistance', () => {
  const store = memoryStore();
  const p = createProgress(store);
  const events = [];
  p.on((e) => events.push(e.type));
  p.missionResult('premier-bord', 'optimist', { stars: 3, time: 300 });
  assert.ok(p.data.xp > 0);
  assert.ok(p.data.badges['premier-bord'] && p.data.badges['trois-etoiles']);
  assert.ok(events.includes('badge'));
  const q = createProgress(store);
  assert.equal(q.data.missions['premier-bord'].optimist.stars, 3);
});
test('rejouer une mission sans progresser rapporte peu', () => {
  const p = createProgress(memoryStore());
  p.missionResult('remontee', 'j80', { stars: 3, time: 300 });
  const xp = p.data.xp;
  p.missionResult('remontee', 'j80', { stars: 2, time: 400 });
  assert.ok(p.data.xp - xp <= 40);
  assert.equal(p.data.missions.remontee.j80.time, 300);
});
test('quiz générés pour chaque leçon, réponses valides', () => {
  const r = rng(3);
  for (const l of LESSONS) {
    const qs = makeQuiz(l.quiz, r, 6);
    assert.ok(qs.length >= 4, l.id);
    for (const q of qs) assert.ok(q.ok >= 0 && q.ok < q.a.length, `${l.id}: ${q.q}`);
  }
});
