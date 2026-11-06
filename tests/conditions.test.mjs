import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, windSector, mergeForecast } from '../app/js/conditions.js';

const base = { tws: 12, gust: 15, twd: 240, swellH: 0.5, swellT: 9 };

test('le vent de terre ne dégrade pas le verdict : simple avertissement', () => {
  const mer = evaluate({ ...base, twd: 240 });
  const terre = evaluate({ ...base, twd: 30 });
  assert.equal(terre.level, mer.level);
  assert.equal(terre.level, 'bon');
  const w = terre.warnings.find((x) => x.id === 'vent-terre');
  assert.ok(w && w.kind === 'info');
  assert.match(w.text, /rentrée facile/);
});
test('le verdict ne dépend ni du bateau ni d\'aucun autre paramètre que vent et houle', () => {
  const a = evaluate({ ...base, boat: 'optimist' });
  const b = evaluate({ ...base, boat: 'j80' });
  assert.deepEqual(a, b);
});
test('paliers de vent', () => {
  assert.equal(evaluate({ ...base, tws: 4, gust: 5 }).level, 'calme');
  assert.equal(evaluate({ ...base, tws: 14, gust: 18 }).level, 'bon');
  assert.equal(evaluate({ ...base, tws: 18, gust: 23 }).level, 'vigilance');
  assert.equal(evaluate({ ...base, tws: 24, gust: 30 }).level, 'engage');
  assert.equal(evaluate({ ...base, tws: 30, gust: 38 }).level, 'tres-engage');
});
test('paliers de houle', () => {
  assert.equal(evaluate({ ...base, swellH: 1.2 }).level, 'vigilance');
  assert.equal(evaluate({ ...base, swellH: 2 }).level, 'engage');
  assert.equal(evaluate({ ...base, swellH: 3 }).level, 'tres-engage');
});
test('vent de terre fort : le niveau vient du vent, pas de la direction', () => {
  assert.equal(evaluate({ ...base, twd: 30, tws: 18, gust: 23 }).level, evaluate({ ...base, twd: 220, tws: 18, gust: 23 }).level);
});
test('vent de mer avec houle : avertissement shore-break', () => {
  assert.ok(evaluate({ ...base, twd: 220, swellH: 0.9 }).warnings.some((w) => w.id === 'shore-break'));
});
test('rafales marquées signalées', () => {
  assert.ok(evaluate({ ...base, tws: 10, gust: 21 }).warnings.some((w) => w.id === 'rafales'));
});
test('secteurs', () => {
  assert.equal(windSector(0), 'terre');
  assert.equal(windSector(60), 'terre');
  assert.equal(windSector(220), 'mer');
});
test('fusion des prévisions Open-Meteo', () => {
  const w = { hourly: { time: ['2026-11-05T10:00'], wind_speed_10m: [12], wind_gusts_10m: [16], wind_direction_10m: [250], temperature_2m: [14] } };
  const m = { hourly: { time: ['2026-11-05T10:00'], wave_height: [0.7], swell_wave_height: [0.6], swell_wave_period: [10], swell_wave_direction: [260] } };
  const [h] = mergeForecast(w, m);
  assert.equal(h.eval.level, 'bon');
  assert.equal(h.swellH, 0.6);
  assert.equal(mergeForecast(w, null)[0].swellH, null);
});
