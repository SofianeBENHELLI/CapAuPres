import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDate, formatDigits, isoToText } from '../app/js/ui/dateinput.js';

test('saisie rapide de la date : les barres s’ajoutent seules', () => {
  assert.equal(formatDigits('27'), '27');
  assert.equal(formatDigits('2712'), '27/12');
  assert.equal(formatDigits('27121980'), '27/12/1980');
  assert.equal(formatDigits('27/12/19801'), '27/12/1980');
  assert.equal(formatDigits('27a12'), '27/12');
});
test('dates valides et invalides', () => {
  const now = new Date(2026, 10, 7);
  assert.equal(parseDate('27/12/1980', now), '1980-12-27');
  assert.equal(parseDate('27121980', now), '1980-12-27');
  assert.equal(parseDate('31/02/2012', now), '');
  assert.equal(parseDate('01/01/1900', now), '');
  assert.equal(parseDate('01/01/2030', now), '');
  assert.equal(parseDate('27/12/80', now), '');
  assert.equal(isoToText('2012-05-03'), '03/05/2012');
});
