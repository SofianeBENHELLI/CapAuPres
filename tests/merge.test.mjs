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

test('la date de naissance ne part jamais au serveur, le pseudo oui', () => {
  const p = cloudPayload({ name: 'Léo', birth: '2014-05-03', cloud: { key: 'x' }, levels: {} });
  assert.equal(p.name, 'Léo');
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
const call = (env, key, method, body) => onRequest({ env, params: { key }, request: new Request('https://x/api/profil/' + key, { method, headers: { 'CF-Connecting-IP': '203.0.113.7', 'User-Agent': 'iPhone' }, body: body && JSON.stringify(body) }) });

test('API : deux appareils fusionnent sans s’écraser, la clé brute n’est pas stockée', async () => {
  const env = fakeEnv();
  const key = await cloudKey('Léa', '2013-02-01');
  assert.equal((await call(env, key, 'GET')).status, 404);
  await call(env, key, 'PUT', { profile: { updated: 1, name: 'Léa', levels: { 'optimist/m1': { score: 80 } } } });
  const r = await call(env, key, 'PUT', { profile: { updated: 2, levels: { 'optimist/m2': { score: 40 } } } });
  const out = await r.json();
  assert.equal(out.profile.levels['optimist/m1'].score, 80);
  assert.equal(out.profile.levels['optimist/m2'].score, 40);
  assert.equal(out.profile.name, 'Léa');
  assert.equal(out.meta, undefined); // le suivi n'est jamais renvoyé au joueur
  assert.ok(![...env._m.keys()].some((k) => k.includes(key)));
  const raw = JSON.parse([...env._m.values()][0]);
  assert.equal(raw.meta.pseudo, 'Léa');
  assert.equal(raw.meta.ip, '203.0.113.7');
  assert.equal(raw.meta.saves, 2);
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

test('remise à zéro : elle gagne sur une ancienne progression, pas sur ce qui est joué après', () => {
  const vieux = { updated: 100, levels: { 'optimist/m1': { score: 80 } }, lessons: { allures: { done: true, best: 100 } } };
  const raz = { updated: 200, resetAt: 200, boat: 'optimist' };
  const m = mergeProfiles(vieux, raz);
  assert.deepEqual(m.levels, {});
  assert.deepEqual(m.lessons, {});
  assert.equal(m.resetAt, 200);
  assert.deepEqual(mergeProfiles(raz, vieux).levels, {});
  const apres = { updated: 300, levels: { 'optimist/m2': { score: 60 } } };
  assert.equal(mergeProfiles(raz, apres).levels['optimist/m2'].score, 60);
});

test('les nœuds appris sur deux appareils s’additionnent', () => {
  const m = mergeProfiles({ updated: 1, pref: { knots: { huit: true } } }, { updated: 2, pref: { knots: { chaise: true }, look: { hull: '#173d61' } } });
  assert.deepEqual(m.pref.knots, { huit: true, chaise: true });
  assert.equal(m.pref.look.hull, '#173d61');
});

test('rien d’exécutable ne passe par la fusion', () => {
  const evil = '<img src=x onerror=alert(1)>';
  const m = mergeProfiles({}, { name: `Léo${evil}`, boat: evil, levels: { 'optimist/m1': { score: 50, mode: evil }, [evil]: { score: 1 } }, lessons: { baie: { done: true, best: evil } }, reflexes: { amure: evil }, pref: { look: { hull: evil } }, seenBadges: [evil, 'matelot'] });
  const txt = JSON.stringify(m);
  assert.ok(!txt.includes('<'), txt);
  assert.equal(m.levels['optimist/m1'].score, 50);
  assert.equal(m.reflexes.amure, 0);
  assert.deepEqual(m.seenBadges, ['matelot']);
  assert.equal(m.boat, undefined);
});

test('pseudo sans lettre latine : une clé quand même', async () => {
  assert.match(await cloudKey('🏴‍☠️', '2014-05-03'), /^[a-f0-9]{64}$/);
  assert.notEqual(await cloudKey('李', '2014-05-03'), await cloudKey('Юра', '2014-05-03'));
});
