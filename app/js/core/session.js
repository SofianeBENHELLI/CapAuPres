// Séance moniteur sans serveur : la séance et les résultats des élèves voyagent
// dans de courts codes (affichés en QR code). Aucune donnée ne quitte les téléphones.
//   séance  : CAP1.<base64url(JSON)>   { v, n: nom, l: [leçons], m: mission|null, b: bateau|null, id }
//   résultat: CAPR1.<base64url(JSON)>  { v, s: id séance, p: prénom, q: {leçon: %}, w: [questions ratées], m: score mission|null, t }

const enc = (obj) => {
  const json = JSON.stringify(obj);
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const dec = (s) => {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
};

// Identifiant court et lisible (6 caractères sans confusion 0/O, 1/l).
const ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function shortId(rnd = Math.random) {
  let s = '';
  for (let i = 0; i < 6; i++) s += ALPHA[Math.floor(rnd() * ALPHA.length)];
  return s;
}

export function encodeSession({ name, lessons = [], mission = null, boat = null, id = shortId() }) {
  return `CAP1.${enc({ v: 1, n: String(name || 'Séance').slice(0, 40), l: lessons, m: mission, b: boat, id })}`;
}

export function encodeResult({ session, player, quiz = {}, wrong = [], mission = null }) {
  return `CAPR1.${enc({ v: 1, s: session, p: String(player || 'Élève').slice(0, 24), q: quiz, w: wrong.slice(0, 40), m: mission, t: Math.floor(Date.now() / 1000) })}`;
}

// Accepte un code brut, ou une adresse contenant le code (QR code de séance).
export function decode(text) {
  const raw = String(text || '').trim();
  const m = raw.match(/(CAPR?1)\.([A-Za-z0-9_-]+)/);
  if (!m) return null;
  try {
    const data = dec(m[2]);
    if (m[1] === 'CAP1' && data.v === 1) return { type: 'session', code: `${m[1]}.${m[2]}`, ...data };
    if (m[1] === 'CAPR1' && data.v === 1) return { type: 'result', code: `${m[1]}.${m[2]}`, ...data };
  } catch {
    return null;
  }
  return null;
}

// Bilan de groupe : moyenne par leçon, questions les plus ratées.
export function groupSummary(results) {
  const byLesson = {};
  const wrong = {};
  results.forEach((r) => {
    Object.entries(r.q || {}).forEach(([lid, pct]) => {
      byLesson[lid] = byLesson[lid] || [];
      byLesson[lid].push(pct);
    });
    (r.w || []).forEach((id) => (wrong[id] = (wrong[id] || 0) + 1));
  });
  const lessons = Object.entries(byLesson).map(([lid, arr]) => ({ lid, avg: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length), n: arr.length }));
  const missed = Object.entries(wrong).sort((a, b) => b[1] - a[1]).map(([id, n]) => ({ id, n }));
  const scores = results.map((r) => r.m).filter((x) => typeof x === 'number');
  return { lessons, missed, missionAvg: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null, count: results.length };
}
