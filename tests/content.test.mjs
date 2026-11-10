import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LESSONS, CORE_LESSONS } from '../app/js/data/lessons.js';
import { TERMS } from '../app/js/data/glossary.js';

test('leçons : 7 de base, puis les leçons pour aller plus loin, numérotées dans l’ordre', () => {
  assert.equal(CORE_LESSONS.length, 7);
  assert.ok(LESSONS.length >= 11);
  LESSONS.forEach((l, i) => assert.equal(l.num, i + 1, l.id));
  assert.equal(new Set(LESSONS.map((l) => l.id)).size, LESSONS.length);
});

test('chaque quiz : au moins 6 questions, 4 propositions distinctes, une explication', () => {
  for (const l of LESSONS) {
    assert.ok(l.quiz.length >= 6, `${l.id} : ${l.quiz.length} questions`);
    for (const x of l.quiz) {
      assert.equal(x.c.length, 4, `${l.id} : ${x.q}`);
      assert.equal(new Set(x.c).size, 4, `${l.id} : ${x.q}`);
      assert.ok(x.e && x.e.length > 10, `${l.id} : ${x.q}`);
      assert.ok(x.q.length > 8);
    }
    assert.equal(new Set(l.quiz.map((x) => x.q)).size, l.quiz.length, `${l.id} : question en double`);
  }
});

test('vocabulaire : « petit largue » et « lof pour lof » ne sont plus employés à contresens', () => {
  const txt = JSON.stringify(LESSONS) + JSON.stringify(TERMS);
  assert.ok(!/petit largue/i.test(txt));
  assert.ok(!/virement « lof pour lof »/i.test(txt));
});
