// Expérience (XP), grades et badges. Tout est recalculé à partir de la progression
// enregistrée : impossible de « perdre » ou de gonfler des points par erreur.
import { store, starsFor } from '../store.js';
import { LEVELS, dailySeed } from './levels.js';
import { LESSONS, CORE_LESSONS } from '../data/lessons.js';
import { BOAT_LIST } from './boats.js';

export const XP = {
  lesson: 100,
  perfectQuiz: 50,
  mission: 60,
  star: 40,
  daily: 80,
};

// Chaque grade débloque de quoi personnaliser son bateau (voir core/look.js). Les trois derniers
// demandent en plus une épreuve de passage : avoir les XP ne suffit pas, il faut aussi savoir naviguer.
export const GRADES = [
  { xp: 0, name: 'Moussaillon', icon: '🐚' },
  { xp: 200, name: 'Mousse', icon: '🪢' },
  { xp: 500, name: 'Matelot', icon: '⚓' },
  { xp: 1000, name: 'Équipier', icon: '🧭' },
  { xp: 1700, name: 'Barreur', icon: '☸️' },
  { xp: 2600, name: 'Chef de bord', icon: '🎖️' },
  { xp: 3800, name: 'Skipper', icon: '⛵', exam: 'skipper' },
  { xp: 5500, name: 'Capitaine', icon: '🏅', exam: 'capitaine' },
  { xp: 8000, name: 'Amiral du CNBPP', icon: '👑', exam: 'amiral' },
];

const missionIds = new Set(LEVELS.map((l) => l.id));

// Missions réussies : { boat, id, score, stars }
export function missionResults() {
  return Object.entries(store.allLevels())
    .map(([k, v]) => {
      const [boat, id] = k.split('/');
      return { boat, id, score: v.score, stars: starsFor(v.score) };
    })
    .filter((r) => missionIds.has(r.id) && BOAT_LIST.some((b) => b.id === r.boat));
}

export function xpBreakdown() {
  const lessons = Object.entries(store.allLessons()).filter(([id, l]) => l.done && LESSONS.some((x) => x.id === id));
  const missions = missionResults();
  const reflexes = Object.values(store.allReflexes());
  const daily = Object.keys(store.allDaily()).length;
  const parts = {
    lessons: lessons.length * XP.lesson + lessons.filter(([, l]) => l.best >= 100).length * XP.perfectQuiz,
    missions: missions.reduce((s, m) => s + XP.mission + m.stars * XP.star, 0),
    reflexes: reflexes.reduce((s, b) => s + Math.min(100, Math.floor(b / 3)), 0),
    daily: daily * XP.daily,
  };
  parts.total = parts.lessons + parts.missions + parts.reflexes + parts.daily;
  return parts;
}

// Meilleures étoiles obtenues sur une mission, tous bateaux confondus.
const bestStars = (results, id) => Math.max(0, ...results.filter((r) => r.id === id).map((r) => r.stars));
const missionTitle = (id) => LEVELS.find((l) => l.id === id)?.title || id;

// Épreuves de passage : une liste de conditions, chacune avec un lien pour aller la remplir.
export function examChecks(exam) {
  const m = missionResults();
  const lessonsDone = CORE_LESSONS.filter((l) => store.lesson(l.id)?.done).length;
  const threeStars = new Set(m.filter((r) => r.stars === 3).map((r) => r.id)).size;
  const reflexBest = Math.max(0, ...Object.values(store.allReflexes()));
  const daily = Object.keys(store.allDaily()).length;
  const mission = (id, stars) => ({
    label: `« ${missionTitle(id)} » avec ${stars} ⭐`,
    ok: bestStars(m, id) >= stars,
    href: `#/mission/${id}`,
  });
  const list = {
    skipper: [
      { label: `Les ${CORE_LESSONS.length} leçons de base validées (${lessonsDone}/${CORE_LESSONS.length})`, ok: lessonsDone === CORE_LESSONS.length, href: '#/apprendre' },
      mission('m7', 2),
      mission('m9', 2),
    ],
    capitaine: [
      mission('m10', 2),
      { label: `150 points dans un mini-jeu de réflexes (record : ${reflexBest})`, ok: reflexBest >= 150, href: '#/reflexes' },
      { label: `3 ⭐ sur 5 missions différentes (${Math.min(threeStars, 5)}/5)`, ok: threeStars >= 5, href: '#/naviguer' },
    ],
    amiral: [
      mission('m10', 3),
      { label: `3 ⭐ sur toutes les missions (${threeStars}/${LEVELS.length})`, ok: threeStars >= LEVELS.length, href: '#/naviguer' },
      { label: `5 défis du jour réussis (${Math.min(daily, 5)}/5)`, ok: daily >= 5, href: '#/defi/2/today' },
    ],
  };
  return list[exam] || [];
}

const examPassed = (g) => !g.exam || examChecks(g.exam).every((c) => c.ok);

// Grade atteint : assez d'XP, et l'épreuve réussie pour les grades qui en ont une.
// `blocked` : les XP du grade suivant sont là, il ne manque que l'épreuve.
export function gradeOf(xp) {
  let i = 0;
  while (i < GRADES.length - 1 && xp >= GRADES[i + 1].xp && examPassed(GRADES[i + 1])) i++;
  const g = GRADES[i];
  const next = GRADES[i + 1] || null;
  const blocked = !!next && xp >= next.xp;
  const pct = !next ? 1 : blocked ? 1 : (xp - g.xp) / (next.xp - g.xp);
  return { ...g, index: i, next, pct, blocked, toGo: next ? Math.max(0, next.xp - xp) : 0 };
}

// Idées concrètes pour gagner des XP tout de suite, les plus rentables d'abord.
export function nextSteps(max = 3) {
  const steps = [];
  const lesson = LESSONS.find((l) => !store.lesson(l.id)?.done);
  if (lesson) steps.push({ icon: '📖', label: `Leçon « ${lesson.title} »`, xp: XP.lesson + XP.perfectQuiz, upTo: true, href: `#/apprendre/${lesson.id}` });
  const idx = LEVELS.findIndex((l, i) => missionUnlocked(i) && !store.level(l.id));
  if (idx >= 0) steps.push({ icon: '⛵', label: `Mission « ${LEVELS[idx].title} »`, xp: XP.mission + 3 * XP.star, upTo: true, href: `#/mission/${LEVELS[idx].id}` });
  const better = LEVELS.map((l) => ({ l, st: starsFor(store.level(l.id)?.score || 0) }))
    .filter((x) => store.level(x.l.id) && x.st < 3)
    .sort((a, b) => b.st - a.st)[0];
  if (better) steps.push({ icon: '⭐', label: `3 ⭐ sur « ${better.l.title} »`, xp: (3 - better.st) * XP.star, href: `#/mission/${better.l.id}` });
  if (!store.daily(dailySeed())) steps.push({ icon: '📅', label: 'Défi du jour', xp: XP.daily, href: '#/defi/2/today' });
  const reflexes = store.allReflexes();
  if (Object.values(reflexes).reduce((s, b) => s + Math.min(100, Math.floor(b / 3)), 0) < 600) {
    steps.push({ icon: '⚡', label: 'Mini-jeu ou quiz', xp: 100, upTo: true, href: '#/jeux' });
  }
  return steps.sort((a, b) => b.xp - a.xp).slice(0, max);
}

export const BADGES = [
  { id: 'premier-cours', icon: '📖', name: 'Premier cours', how: 'Valide ta première leçon.' },
  { id: 'premier-bord', icon: '⛵', name: 'Premier bord', how: 'Termine ta première mission.' },
  { id: 'sans-faute', icon: '⭐', name: 'Sans faute', how: 'Obtiens 3 étoiles sur une mission.' },
  { id: 'etoile-filante', icon: '🌟', name: 'Étoile filante', how: '3 étoiles sur 5 missions.' },
  { id: 'tete-bien-faite', icon: '🎓', name: 'Tête bien faite', how: `Valide les ${CORE_LESSONS.length} leçons de base.` },
  { id: 'major', icon: '🧑‍🎓', name: 'Major de promo', how: 'Valide toutes les leçons, y compris « pour aller plus loin ».' },
  { id: 'evens', icon: '🪨', name: 'Cap sur Les Évens', how: 'Contourne l’îlot des Évens (mission « Cap sur Les Évens »).' },
  { id: 'noroit', icon: '💨', name: 'Pas peur du noroît', how: 'Termine la mission « Coup de noroît ».' },
  { id: 'tour-baie', icon: '🗺️', name: 'Tour de la baie', how: 'Termine « Le tour de la baie ».' },
  { id: 'regatier', icon: '🏆', name: 'Régatier du CNBPP', how: 'Termine la « Grande régate du CNBPP ».' },
  { id: 'polyvalent', icon: '🔀', name: 'Polyvalent', how: 'Termine une mission avec 3 bateaux différents.' },
  { id: 'flotte', icon: '🚩', name: 'Toute la flotte', how: 'Termine une mission avec les 4 bateaux.' },
  { id: 'matelot', icon: '🪢', name: 'Bon matelot', how: 'Sache faire les trois nœuds (huit, chaise, taquet).' },
  { id: 'reflexes', icon: '⚡', name: 'Réflexes de skipper', how: 'Marque 150 points dans un mini-jeu.' },
  { id: 'vigie', icon: '🔭', name: 'Œil de vigie', how: 'Marque 120 points au quiz « Balisage express ».' },
  { id: 'arbitre', icon: '⚖️', name: 'Arbitre de régate', how: 'Marque 120 points au quiz « Qui est prioritaire ? ».' },
  { id: 'dico', icon: '📖', name: 'Dico du marin', how: 'Marque 120 points au quiz « Les mots du marin ».' },
  { id: 'fidele', icon: '📅', name: 'Fidèle au poste', how: 'Réussis 3 défis du jour.' },
  { id: 'amiral', icon: '👑', name: 'Amiral', how: 'Atteins le grade d’Amiral du CNBPP.' },
];

export function earnedBadges() {
  const m = missionResults();
  const lessons = store.allLessons();
  const doneLessons = LESSONS.filter((l) => lessons[l.id]?.done).length;
  const byMission = {};
  m.forEach((r) => (byMission[r.id] = new Set([...(byMission[r.id] || []), r.boat])));
  const maxBoats = Math.max(0, ...Object.values(byMission).map((s) => s.size));
  const has = (id) => m.some((r) => r.id === id);
  const set = new Set();
  if (doneLessons >= 1) set.add('premier-cours');
  if (m.length >= 1) set.add('premier-bord');
  if (m.some((r) => r.stars === 3)) set.add('sans-faute');
  if (m.filter((r) => r.stars === 3).length >= 5) set.add('etoile-filante');
  if (CORE_LESSONS.every((l) => lessons[l.id]?.done)) set.add('tete-bien-faite');
  if (doneLessons === LESSONS.length) set.add('major');
  const rx = store.allReflexes();
  if ((rx.balise || 0) >= 120) set.add('vigie');
  if ((rx.priorite || 0) >= 120) set.add('arbitre');
  if ((rx.mots || 0) >= 120) set.add('dico');
  if (has('m4')) set.add('evens');
  if (has('m7')) set.add('noroit');
  if (has('m9')) set.add('tour-baie');
  if (has('m10')) set.add('regatier');
  if (maxBoats >= 3) set.add('polyvalent');
  if (maxBoats >= 4) set.add('flotte');
  if (['huit', 'chaise', 'taquet'].every((k) => store.pref.knots?.[k])) set.add('matelot');
  if (Object.values(store.allReflexes()).some((b) => b >= 150)) set.add('reflexes');
  if (Object.keys(store.allDaily()).length >= 3) set.add('fidele');
  if (gradeOf(xpBreakdown().total).index === GRADES.length - 1) set.add('amiral');
  return set;
}

// Badges obtenus mais pas encore annoncés au joueur.
export function newBadges() {
  const seen = new Set(store.seenBadges);
  return BADGES.filter((b) => earnedBadges().has(b.id) && !seen.has(b.id));
}

// Missions débloquées : la suivante s'ouvre quand la précédente est réussie (avec ce bateau).
export function missionUnlocked(i) {
  return i === 0 || !!store.level(LEVELS[i - 1].id);
}
