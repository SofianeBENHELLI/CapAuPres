import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeProfiles, cloudPayload, cloudKey, normalizeName } from '../app/js/core/merge.js';
import { onRequest } from '../functions/api/profil/[key].js';

test('la fusion garde le meilleur de chaque appareil', () => {
  const a = { updated: 1, boat: 'optimist', levels: { 'optimist/m1': { score: 80 }, 'optimist/m2': { score: 50 } }, lessons: { vent: { done: true, best: 70 } }, reflexes: { amure: 30 }, daily: { 20261106: 10 }, seenBadges: ['a'] };
  const b = { updated: 2, boat: 'j80', levels: { 'optimist/m1': { score: 60 }, 'j80/m1': { score: 90 } }, lessons: { vent: { done: true, best: 90 }, noeuds: { done: true, best: 80 } }, reflexes: { amure: 20, allure: 40 }, daily: { 20261106: 12 }, seenBadges: ['b'] };
  const m = mergeProfiles(a, b);
  assert.equal(m.levels['optimist/m1'].score, 80);
  assert.equal(m.levels['optimist/m2'].score, 50);
  assert.equal(m.levels['j80/m1'].score, 90);
  assert.equal(m.lessons.vent.best, 90);
  assert.ok(m.lessons.noeuds.done);
  assert.deepEqual(m.reflexes, { amure: 30, allure: 40 });
  assert.equal(m.daily[20261106], 12);
  assert.deepEqual(m.seenBadges.sort(), ['a', 'b']);
  assert.equal(m.boat, 'j80'); // réglages : la version la plus récente
  assert.deepEqual(mergeProfiles(a, b).levels, mergeProfiles(b, a).levels);
  assert.deepEqual(mergeProfiles(a, b).lessons, mergeProfiles(b, a).lessons);
});

test('prénom et date de naissance ne partent jamais au serveur', () => {
  const p = cloudPayload({ name: 'Léo', birth: '2014-05-03', cloud: { key: 'x' }, levels: {} });
  assert.equal(p.name, undefined);
  assert.equal(p.birth, undefined);
  assert.equal(p.cloud, undefined);
});

test('la clé ne dépend ni des accents ni des majuscules', async () => {
  assert.equal(normalizeName('  Léo-Paul '), 'leo paul');
  const k = await cloudKey('Léo', '2014-05-03');
  assert.match(k, /^[a-f0-9]{64}$/);
  assert.equal(await cloudKey('LEO', '2014-05-03'), k);
  assert.notEqual(await cloudKey('Leo', '2014-05-04'), k);
  await assert.rejects(cloudKey('', '2014-05-03'));
});

function fakeEnv() {
  const m = new Map();
  return { PEPPER: 'test', PROFILS: { get: async (k, t) => (m.has(k) ? (t === 'json' ? JSON.parse(m.get(k)) : m.get(k)) : null), put: async (k, v) => m.set(k, v) }, _m: m };
}
const call = (env, key, method, body) => onRequest({ env, params: { key }, request: new Request('https://x/api/profil/' + key, { method, body: body && JSON.stringify(body) }) });

test('API : deux appareils fusionnent sans s’écraser, la clé brute n’est pas stockée', async () => {
  const env = fakeEnv();
  const key = await cloudKey('Léa', '2013-02-01');
  assert.equal((await call(env, key, 'GET')).status, 404);
  await call(env, key, 'PUT', { profile: { updated: 1, name: 'Léa', levels: { 'optimist/m1': { score: 80 } } } });
  const r = await call(env, key, 'PUT', { profile: { updated: 2, levels: { 'optimist/m2': { score: 40 } } } });
  const out = await r.json();
  assert.equal(out.profile.levels['optimist/m1'].score, 80);
  assert.equal(out.profile.levels['optimist/m2'].score, 40);
  assert.equal(out.profile.name, undefined);
  assert.ok(![...env._m.keys()].some((k) => k.includes(key)));
  const g = await (await call(env, key, 'GET')).json();
  assert.equal(Object.keys(g.profile.levels).length, 2);
});

test('API : remise à zéro, validation', async () => {
  const env = fakeEnv();
  const key = await cloudKey('Tom', '2012-01-01');
  await call(env, key, 'PUT', { profile: { levels: { 'optimist/m1': { score: 80 } } } });
  await call(env, key, 'PUT', { profile: { levels: {} }, replace: true });
  assert.deepEqual((await (await call(env, key, 'GET')).json()).profile.levels, {});
  assert.equal((await call(env, 'pas-une-cle', 'GET')).status, 400);
  assert.equal((await call(env, key, 'DELETE')).status, 405);
  assert.equal((await call(env, key, 'PUT', { nope: 1 })).status, 400);
});
