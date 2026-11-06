// Progression enregistrée localement (aucun compte nécessaire).
// Missions : séparées pour chaque bateau. Leçons, réflexes, défis du jour : communs.
// Plusieurs marins peuvent partager un appareil (iPad du club) : le profil actif vit sous KEY,
// les autres sont rangés sous PROFILE_PREFIX + id. Une sauvegarde en fichier permet de
// reprendre sa progression sur un autre appareil.
import { boatId } from './core/boats.js';

const KEY = 'capaupres.v1';
const PROFILE_PREFIX = 'capaupres.profile.';
const BACKUP_APP = 'cap-au-pres';
const newId = () => Math.random().toString(36).slice(2, 10);

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

let data = load();
if (!data.pid) data.pid = newId();

// Anciennes sauvegardes (avant le choix du bateau) : elles concernaient le dériveur.
if (data.levels && Object.keys(data.levels).some((k) => !k.includes('/'))) {
  const migrated = {};
  Object.entries(data.levels).forEach(([k, v]) => (migrated[k.includes('/') ? k : `deriveur/${k}`] = v));
  data.levels = migrated;
}

const lk = (id, boat = boatId()) => `${boat}/${id}`;

let onSave = null;
function save() {
  data.updated = Date.now();
  if (onSave) queueMicrotask(onSave);
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* stockage indisponible : on continue sans sauvegarde */
  }
}

function readSlot(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

// Range le profil actif dans son tiroir, puis active `next` (qui quitte le sien).
function activate(next) {
  try {
    if (data.boat || data.name || data.levels || data.lessons) localStorage.setItem(PROFILE_PREFIX + data.pid, JSON.stringify(data));
    localStorage.removeItem(PROFILE_PREFIX + next.pid);
  } catch {
    /* stockage indisponible */
  }
  data = next;
  save();
}

const summary = (d, current) => ({
  id: d.pid,
  name: d.name || '',
  boat: d.boat || null,
  missions: Object.keys(d.levels || {}).length,
  lessons: Object.keys(d.lessons || {}).length,
  updated: d.updated || 0,
  current,
});

export const store = {
  // ---- missions (par bateau)
  level(id, boat) {
    return (data.levels && data.levels[lk(id, boat)]) || null;
  },
  saveLevel(id, score, time, extra = {}) {
    data.levels = data.levels || {};
    const prev = data.levels[lk(id)];
    const better = !prev || score > prev.score;
    if (better) data.levels[lk(id)] = { score, time, at: Date.now(), ...extra };
    save();
    return better;
  },
  allLevels() {
    return data.levels || {};
  },
  // ---- réflexes
  reflex(mode) {
    return (data.reflexes && data.reflexes[mode]) || 0;
  },
  saveReflex(mode, score) {
    data.reflexes = data.reflexes || {};
    const best = data.reflexes[mode] || 0;
    if (score > best) data.reflexes[mode] = score;
    save();
    return score > best;
  },
  allReflexes() {
    return data.reflexes || {};
  },
  // ---- leçons
  lesson(id) {
    return (data.lessons && data.lessons[id]) || null;
  },
  saveLesson(id, quizScore) {
    data.lessons = data.lessons || {};
    const prev = data.lessons[id];
    if (!prev || quizScore > prev.best) data.lessons[id] = { done: true, best: quizScore, at: Date.now() };
    save();
  },
  allLessons() {
    return data.lessons || {};
  },
  // ---- répétition espacée des questions (voir core/srs.js)
  get srs() {
    return data.srs || {};
  },
  setSrs(state) {
    data.srs = state;
    save();
  },
  // ---- séances : côté moniteur (séances créées + résultats scannés) et côté élève
  get sessions() {
    return data.sessions || {};
  },
  saveSession(id, obj) {
    data.sessions = { ...(data.sessions || {}), [id]: obj };
    save();
  },
  deleteSession(id) {
    if (data.sessions) delete data.sessions[id];
    save();
  },
  get mySession() {
    return data.mySession || null;
  },
  setMySession(obj) {
    data.mySession = obj;
    save();
  },
  // ---- défis du jour réussis (dates AAAAMMJJ)
  saveDaily(seed, score) {
    data.daily = data.daily || {};
    if (!data.daily[seed] || score > data.daily[seed]) data.daily[seed] = score;
    save();
  },
  daily(seed) {
    return (data.daily && data.daily[seed]) || 0;
  },
  allDaily() {
    return data.daily || {};
  },
  // ---- badges déjà annoncés (pour n'afficher la nouveauté qu'une fois)
  get seenBadges() {
    return data.seenBadges || [];
  },
  markBadgesSeen(ids) {
    data.seenBadges = [...new Set([...(data.seenBadges || []), ...ids])];
    save();
  },
  // ---- XP et grade déjà montrés au joueur (pour animer ce qu'il vient de gagner)
  get seenXp() {
    return data.seenXp || null;
  },
  setSeenXp(parts, grade) {
    data.seenXp = { ...parts, grade };
    save();
  },
  // ---- profil
  get boat() {
    return data.boat || null;
  },
  setBoat(id) {
    data.boat = id;
    save();
  },
  get name() {
    return data.name || '';
  },
  get birth() {
    return data.birth || '';
  },
  setBirth(d) {
    data.birth = /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : '';
    save();
  },
  // ---- sauvegarde en ligne (voir core/cloud.js)
  get cloud() {
    return data.cloud || null;
  },
  setCloud(c) {
    data.cloud = c;
    try {
      localStorage.setItem(KEY, JSON.stringify(data)); // sans toucher à `updated` ni relancer un envoi
    } catch {
      /* stockage indisponible */
    }
  },
  snapshot() {
    return JSON.parse(JSON.stringify(data));
  },
  // Remplace la progression par une version fusionnée, en gardant ce qui est propre à l'appareil.
  adopt(profile) {
    const keep = { pid: data.pid, name: data.name, birth: data.birth, cloud: data.cloud, lastBackup: data.lastBackup, seenXp: data.seenXp };
    data = { ...profile, ...keep, updated: Math.max(+profile.updated || 0, +data.updated || 0) };
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      /* stockage indisponible */
    }
  },
  onSave(fn) {
    onSave = fn;
  },
  setName(n) {
    data.name = String(n || '').trim().slice(0, 24);
    save();
  },
  get pref() {
    return data.pref || {};
  },
  setPref(k, v) {
    data.pref = { ...(data.pref || {}), [k]: v };
    save();
  },
  totalStars(levels, boat) {
    return levels.reduce((s, l) => s + starsFor(this.level(l.id, boat)?.score || 0), 0);
  },
  reset() {
    const { boat, name, pid, birth, cloud } = data;
    data = { boat, name, pid, birth, cloud };
    save();
  },
  // ---- profils de l'appareil
  profiles() {
    const out = [summary(data, true)];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k.startsWith(PROFILE_PREFIX)) continue;
        const d = readSlot(k);
        if (d && d.pid) out.push(summary(d, false));
      }
    } catch {
      /* stockage indisponible */
    }
    return out;
  },
  switchProfile(id) {
    const next = readSlot(PROFILE_PREFIX + id);
    if (next && next.pid === id) activate(next);
  },
  newProfile() {
    activate({ pid: newId() });
  },
  deleteProfile(id) {
    if (id === data.pid) return;
    try {
      localStorage.removeItem(PROFILE_PREFIX + id);
    } catch {
      /* stockage indisponible */
    }
  },
  // ---- sauvegarde en fichier
  get lastBackup() {
    return data.lastBackup || 0;
  },
  exportBackup() {
    data.lastBackup = Date.now();
    save();
    return { app: BACKUP_APP, version: 1, exportedAt: new Date().toISOString(), profile: data };
  },
  // Lit un fichier de sauvegarde : renvoie le profil qu'il contient, ou une erreur lisible.
  parseBackup(text) {
    let obj;
    try {
      obj = JSON.parse(text);
    } catch {
      throw new Error('Ce fichier n’est pas une sauvegarde Cap au Près.');
    }
    if (!obj || obj.app !== BACKUP_APP || !obj.profile || typeof obj.profile !== 'object') throw new Error('Ce fichier n’est pas une sauvegarde Cap au Près.');
    if (obj.version > 1) throw new Error('Cette sauvegarde vient d’une version plus récente : mets l’appli à jour.');
    return { ...obj.profile, pid: obj.profile.pid || newId() };
  },
  // Reprend un profil sauvegardé et l'active : il remplace sa version sur l'appareil s'il y est déjà.
  importProfile(profile) {
    if (profile.pid === data.pid) {
      data = profile;
      save();
    } else activate(profile);
  },
};

// Demande au navigateur de ne pas effacer nos données quand il manque de place.
export async function protectStorage() {
  try {
    if (!navigator.storage?.persist) return null;
    return (await navigator.storage.persisted()) || (await navigator.storage.persist());
  } catch {
    return null;
  }
}

export function starsFor(score) {
  if (score >= 97) return 3;
  if (score >= 90) return 2;
  if (score >= 80) return 1;
  return 0;
}

export function starsHTML(n, max = 3) {
  let s = '';
  for (let i = 0; i < max; i++) s += i < n ? '★' : '<span class="off">★</span>';
  return `<span class="stars">${s}</span>`;
}
