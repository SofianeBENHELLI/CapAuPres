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

// Une entrée venue d'ailleurs (serveur, fichier de sauvegarde) ne garde que des valeurs simples :
// nombres, booléens et petits textes sans balise. Rien qui puisse s'exécuter une fois affiché.
const SAFE_TEXT = /^[\p{L}\p{N} _.,:;'’\-/()+#]{0,60}$/u;
function clean(x) {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return {};
  const out = {};
  for (const [k, v] of Object.entries(x)) {
    if (!SAFE_TEXT.test(k)) continue;
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    else if (typeof v === 'boolean') out[k] = v;
    else if (typeof v === 'string' && SAFE_TEXT.test(v)) out[k] = v;
  }
  return out;
}

// Garde, clé par clé, l'entrée que `better(a, b)` juge meilleure (toujours nettoyée au passage).
function byKey(a, b, better) {
  const A = obj(a);
  const B = obj(b);
  const out = {};
  for (const k of new Set([...Object.keys(A), ...Object.keys(B)])) if (SAFE_TEXT.test(k)) out[k] = better(A[k], B[k]);
  return out;
}

// Réglages : valeurs simples, ou un niveau d'objet de valeurs simples (couleurs du bateau…).
function cleanPref(p) {
  const out = clean(p);
  for (const [k, v] of Object.entries(obj(p))) if (v && typeof v === 'object' && !Array.isArray(v) && SAFE_TEXT.test(k)) out[k] = clean(v);
  return out;
}

const maxNum = (a, b) => Math.max(+a || 0, +b || 0);
const bestScore = (a, b) => clean((+b?.score || 0) > (+a?.score || 0) ? b : a || b);
const bestLesson = (a, b) => ({ ...clean((+b?.best || 0) > (+a?.best || 0) ? b : a || b), done: !!(a?.done || b?.done) });
// Répétition espacée : pour chaque question, celle qui a été le plus révisée fait foi.
const newer = (a, b) => clean((+b?.seen || 0) > (+a?.seen || 0) ? b : a || b);
const either = (a, b) => !!(a || b);

export function mergeProfiles(a, b) {
  a = obj(a);
  b = obj(b);
  // Remise à zéro : la version qui n'a pas bougé depuis la remise à zéro de l'autre est abandonnée.
  const ra = +a.resetAt || 0;
  const rb = +b.resetAt || 0;
  if (ra !== rb) {
    const keep = ra > rb ? a : b;
    const drop = ra > rb ? b : a;
    if ((+drop.updated || 0) < Math.max(ra, rb)) return mergeProfiles(keep, { resetAt: Math.max(ra, rb) });
  }
  const recent = (+b.updated || 0) > (+a.updated || 0) ? b : a;
  const old = recent === a ? b : a;
  return {
    ...old,
    ...recent,
    name: String(recent.name ?? old.name ?? '').replace(/[<>]/g, '').slice(0, 24),
    levels: byKey(a.levels, b.levels, bestScore),
    lessons: byKey(a.lessons, b.lessons, bestLesson),
    reflexes: byKey(a.reflexes, b.reflexes, maxNum),
    daily: byKey(a.daily, b.daily, maxNum),
    srs: byKey(a.srs, b.srs, newer),
    // les nœuds appris s'additionnent ; les autres réglages suivent la version la plus récente
    boat: [recent.boat, old.boat].find((x) => typeof x === 'string' && /^[a-z0-9]{1,16}$/.test(x)),
    pref: { ...cleanPref(old.pref), ...cleanPref(recent.pref), knots: byKey(old.pref?.knots, recent.pref?.knots, either) },
    seenBadges: [...new Set([...(Array.isArray(a.seenBadges) ? a.seenBadges : []), ...(Array.isArray(b.seenBadges) ? b.seenBadges : [])])].filter((x) => typeof x === 'string' && SAFE_TEXT.test(x)),
    resetAt: Math.max(ra, rb) || undefined,
    updated: Math.max(+a.updated || 0, +b.updated || 0),
  };
}

// Clé du profil en ligne : empreinte du pseudo et de la date de naissance (le serveur ne
// reçoit jamais ni l'un ni l'autre). « Léo », « leo » et « LÉO » donnent la même clé.
export function normalizeName(name) {
  const n = String(name || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  // pseudo sans lettre latine (emoji, autre alphabet) : on garde le texte tel quel
  return n || String(name || '').trim().toLowerCase();
}

export async function cloudKey(name, birth) {
  const n = normalizeName(name);
  if (!n || !/^\d{4}-\d{2}-\d{2}$/.test(birth)) throw new Error('Pseudo et date de naissance requis.');
  const bytes = new TextEncoder().encode(`capaupres|${n}|${birth}`);
  const h = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(h)].map((x) => x.toString(16).padStart(2, '0')).join('');
}
