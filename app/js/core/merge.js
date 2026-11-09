// Fusion de deux versions d'un même profil (deux appareils, ou appareil + serveur).
// Règle simple et sans conflit : on garde le meilleur de chaque côté. Une fusion ne fait
// jamais perdre de progression. Partagé par l'appli et par la fonction serveur.

// Champs propres à l'appareil, jamais envoyés au serveur.
// La date de naissance reste sur l'appareil. Le pseudo est envoyé (affiché dans le suivi des profils).
export const LOCAL_ONLY = ['birth', 'cloud', 'lastBackup', 'seenXp', 'sessions', 'mySession'];

export function cloudPayload(profile) {
  const out = { ...profile };
  for (const k of LOCAL_ONLY) delete out[k];
  return out;
}

const obj = (x) => (x && typeof x === 'object' && !Array.isArray(x) ? x : {});

// Garde, clé par clé, l'entrée que `better(a, b)` juge meilleure.
function byKey(a, b, better) {
  const out = { ...obj(a) };
  for (const [k, v] of Object.entries(obj(b))) out[k] = k in out ? better(out[k], v) : v;
  return out;
}

const maxNum = (a, b) => Math.max(+a || 0, +b || 0);
const bestScore = (a, b) => ((+b?.score || 0) > (+a?.score || 0) ? b : a);
const bestLesson = (a, b) => {
  const best = (+b?.best || 0) > (+a?.best || 0) ? b : a;
  return { ...best, done: !!(a?.done || b?.done) };
};
// Répétition espacée : pour chaque question, celle qui a été le plus révisée fait foi.
const newer = (a, b) => ((+b?.seen || 0) > (+a?.seen || 0) ? b : a);

export function mergeProfiles(a, b) {
  a = obj(a);
  b = obj(b);
  const recent = (+b.updated || 0) > (+a.updated || 0) ? b : a;
  const old = recent === a ? b : a;
  return {
    ...old,
    ...recent,
    levels: byKey(a.levels, b.levels, bestScore),
    lessons: byKey(a.lessons, b.lessons, bestLesson),
    reflexes: byKey(a.reflexes, b.reflexes, maxNum),
    daily: byKey(a.daily, b.daily, maxNum),
    srs: byKey(a.srs, b.srs, newer),
    seenBadges: [...new Set([...(Array.isArray(a.seenBadges) ? a.seenBadges : []), ...(Array.isArray(b.seenBadges) ? b.seenBadges : [])])],
    updated: Math.max(+a.updated || 0, +b.updated || 0),
  };
}

// Clé du profil en ligne : empreinte du pseudo et de la date de naissance (le serveur ne
// reçoit jamais ni l'un ni l'autre). « Léo », « leo » et « LÉO » donnent la même clé.
export function normalizeName(name) {
  return String(name || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export async function cloudKey(name, birth) {
  const n = normalizeName(name);
  if (!n || !/^\d{4}-\d{2}-\d{2}$/.test(birth)) throw new Error('Pseudo et date de naissance requis.');
  const bytes = new TextEncoder().encode(`capaupres|${n}|${birth}`);
  const h = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(h)].map((x) => x.toString(16).padStart(2, '0')).join('');
}
