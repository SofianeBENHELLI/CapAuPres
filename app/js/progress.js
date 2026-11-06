// Progression : XP, grades, badges, défi du jour. Stockage localStorage (ou mémoire en test).

export const RANKS = [
  { xp: 0, name: 'Moussaillon' }, { xp: 150, name: 'Mousse' }, { xp: 400, name: 'Matelot' },
  { xp: 800, name: 'Équipier' }, { xp: 1400, name: 'Barreur' }, { xp: 2200, name: 'Chef de bord' },
  { xp: 3300, name: 'Skipper' }, { xp: 4800, name: 'Capitaine' }, { xp: 7000, name: 'Amiral' },
];

export const BADGES = [
  { id: 'premier-bord', icon: '🌊', name: 'Premier bord', desc: 'Terminer la première mission' },
  { id: 'trois-etoiles', icon: '⭐', name: 'Trois étoiles', desc: 'Obtenir 3 étoiles sur une mission' },
  { id: 'sans-faute', icon: '🎯', name: 'Sans faute', desc: 'Un quiz à 100 %' },
  { id: 'savant', icon: '📚', name: 'Savant', desc: 'Terminer toutes les leçons' },
  { id: 'flotte', icon: '🚤', name: 'Toute la flotte', desc: 'Terminer une mission avec chacun des 4 bateaux' },
  { id: 'evens', icon: '🐦', name: 'Ami des goélands', desc: 'Contourner Les Évens' },
  { id: 'penchateau', icon: '🪨', name: 'Cap Penchâteau', desc: 'Doubler la pointe de Penchâteau' },
  { id: 'vent-terre', icon: '🏖️', name: 'Vent de terre', desc: 'Réussir la mission Vent de terre' },
  { id: 'regatier', icon: '🏁', name: 'Régatier', desc: 'Terminer le parcours banane' },
  { id: 'phare', icon: '🗼', name: 'Gardien du phare', desc: 'Réussir le raid du Grand Charpentier' },
  { id: 'reflexes', icon: '⚡', name: 'Réflexes de marin', desc: '15 bonnes réponses en mode réflexes' },
  { id: 'defi', icon: '📅', name: 'Défi relevé', desc: 'Réussir un défi du jour' },
  { id: 'serie', icon: '🔥', name: 'Série de 3', desc: 'Jouer 3 jours de suite' },
  { id: 'meteo', icon: '🌤️', name: 'Météorologue', desc: 'Consulter la météo réelle de la baie' },
  { id: 'reel', icon: '🌍', name: 'En vrai', desc: 'Naviguer dans les conditions réelles du jour' },
  { id: 'toutes', icon: '🏆', name: 'Grand tour', desc: 'Terminer les 10 missions' },
];

const KEY = 'cnbpp-voile-v2';

export function memoryStore() {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) };
}

export function createProgress(store = globalThis.localStorage || memoryStore()) {
  const blank = () => ({ xp: 0, missions: {}, lessons: {}, badges: {}, reflexBest: 0, daily: {}, days: [], boat: 'optimist', name: '' });
  let data;
  try { data = { ...blank(), ...JSON.parse(store.getItem(KEY) || '{}') }; } catch { data = blank(); }
  const save = () => store.setItem(KEY, JSON.stringify(data));
  const listeners = new Set();
  const emit = (e) => listeners.forEach((f) => f(e));

  function addXp(n, why) {
    const before = rankOf(data.xp);
    data.xp += n;
    const after = rankOf(data.xp);
    emit({ type: 'xp', n, why });
    if (after.index > before.index) emit({ type: 'rank', rank: after });
  }
  function award(id) {
    if (data.badges[id]) return false;
    data.badges[id] = Date.now();
    addXp(50, 'badge');
    emit({ type: 'badge', badge: BADGES.find((b) => b.id === id) });
    return true;
  }
  function markDay(date = new Date()) {
    const k = date.toISOString().slice(0, 10);
    if (!data.days.includes(k)) data.days.push(k);
    data.days = data.days.slice(-30);
    if (streak(date) >= 3) award('serie');
  }
  function streak(date = new Date()) {
    let n = 0;
    const d = new Date(date);
    for (;;) {
      if (!data.days.includes(d.toISOString().slice(0, 10))) break;
      n++; d.setDate(d.getDate() - 1);
    }
    return n;
  }

  return {
    get data() { return data; },
    on: (f) => (listeners.add(f), () => listeners.delete(f)),
    rank: () => rankOf(data.xp),
    streak,
    setBoat(b) { data.boat = b; save(); },
    setName(n) { data.name = n; save(); },
    missionResult(id, boat, { stars, time }, opts = {}) {
      const m = (data.missions[id] ||= {});
      const prev = m[boat];
      const gainStars = Math.max(0, stars - (prev?.stars || 0));
      if (!prev || time < prev.time || stars > prev.stars) m[boat] = { stars: Math.max(stars, prev?.stars || 0), time: Math.min(time, prev?.time ?? Infinity), ghost: opts.ghost ?? prev?.ghost };
      addXp(40 + gainStars * 40, 'mission');
      markDay();
      if (id === 'premier-bord') award('premier-bord');
      if (stars >= 3) award('trois-etoiles');
      const badgeFor = { evens: 'evens', penchateau: 'penchateau', 'vent-terre': 'vent-terre', banane: 'regatier', charpentier: 'phare' };
      if (badgeFor[id]) award(badgeFor[id]);
      const boatsUsed = new Set(Object.values(data.missions).flatMap((x) => Object.keys(x)));
      if (boatsUsed.size >= 4) award('flotte');
      if (opts.total && Object.keys(data.missions).length >= opts.total) award('toutes');
      if (opts.daily) { data.daily[opts.daily] = true; addXp(60, 'défi'); award('defi'); }
      if (opts.real) award('reel');
      save();
    },
    lessonResult(id, score, total, lessonCount) {
      const prev = data.lessons[id] || 0;
      const pct = Math.round((100 * score) / total);
      data.lessons[id] = Math.max(prev, pct);
      addXp(Math.max(0, pct - prev) + 20, 'leçon');
      if (pct === 100) award('sans-faute');
      if (lessonCount && Object.keys(data.lessons).length >= lessonCount) award('savant');
      markDay();
      save();
    },
    reflexResult(score) {
      data.reflexBest = Math.max(data.reflexBest, score);
      addXp(score * 5, 'réflexes');
      if (score >= 15) award('reflexes');
      markDay();
      save();
    },
    award(id) { const r = award(id); save(); return r; },
    reset() { data = blank(); save(); },
  };
}

export function rankOf(xp) {
  let i = 0;
  while (i < RANKS.length - 1 && xp >= RANKS[i + 1].xp) i++;
  const next = RANKS[i + 1];
  return { index: i, name: RANKS[i].name, xp, next: next?.name, toNext: next ? next.xp - xp : 0, pct: next ? (xp - RANKS[i].xp) / (next.xp - RANKS[i].xp) : 1 };
}
