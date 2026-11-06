// Missions dans la baie de La Baule. Coordonnées en mètres (x vers l'Est, y vers le Nord),
// origine = base du CNBPP au Pouliguen. Toutes les missions partent de la base.
import { rotate } from './angles.js';
import { onLand, distToLand } from './land.js';
import { sampleClimateWind, windName } from './weather.js';

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Point de départ : sur l'eau, à 250 m de la plage de la base du Pouliguen.
export const START = { x: 300, y: 60 };

// Lieux de la baie utilisés comme marques.
export const PLACES = {
  evens: { x: 2640, y: -2400, name: 'Les Évens', islet: true, r: 70 },
  pornichet: { x: 5250, y: -1350, name: 'Bouée de Pornichet' },
  penchateau: { x: 1100, y: -1250, name: 'Bouée de Penchâteau' },
  plage: { x: 2600, y: 450, name: 'Bouée de la Grande plage' },
};

const gate = (cx, cy, half = 60, angle = 0, type = 'gate', name) => {
  // angle : orientation de la ligne (0 = Est-Ouest)
  const a = (angle * Math.PI) / 180;
  const dx = Math.cos(a) * half;
  const dy = Math.sin(a) * half;
  return { type, a: { x: cx - dx, y: cy - dy }, b: { x: cx + dx, y: cy + dy }, name };
};
const mark = (p, side = 'auto', extra = {}) => ({ type: 'mark', x: p.x, y: p.y, side, name: p.name, islet: p.islet, r: p.r, ...extra });
// Ligne d'arrivée devant la base, perpendiculaire à la plage.
const finishBase = () => gate(470, 40, 70, 90, 'finish', 'Arrivée devant le club');

const centerOf = (c) => (c.type === 'mark' ? c : { x: (c.a.x + c.b.x) / 2, y: (c.a.y + c.b.y) / 2 });

// Côté de contournement « naturel » : bouée à bâbord si l'on tourne à gauche autour d'elle.
function resolveSides(start, course) {
  return course.map((c, i) => {
    if (c.type !== 'mark' || c.side !== 'auto') return c;
    const a = i === 0 ? start : centerOf(course[i - 1]);
    const b = i < course.length - 1 ? centerOf(course[i + 1]) : a;
    const turn = (c.x - a.x) * (b.y - c.y) - (c.y - a.y) * (b.x - c.x);
    return { ...c, side: turn >= 0 ? 'port' : 'starboard' };
  });
}

function mission(def) {
  return { bay: true, start: START, ...def, course: resolveSides(def.start || START, def.course) };
}

// Ordre établi par calibrage (node tools/calibrate.mjs --ordre) : difficulté composite croissante.
export const LEVELS = [
  mission({
    id: 'm2', num: 1, title: 'Retour au club', place: 'Plage du Pouliguen',
    goal: 'Après l’entraînement, redescends au portant jusqu’à la ligne devant le club.',
    tip: 'Au portant, le plein vent arrière n’est pas toujours le plus rapide : selon le bateau, mieux vaut descendre en zigzag au grand largue et empanner. Essaie, puis compare avec la route optimale !',
    lesson: 'allures', assist: true,
    start: { x: 1700, y: -950 },
    wind: { from: 135, level: 'medium', name: 'Vent de sud-est, beau temps' },
    course: [finishBase()],
  }),
  mission({
    id: 'm3', num: 2, title: 'Le long de la Grande plage', place: 'La Baule',
    goal: 'Passe la porte au large de la Grande plage de La Baule, puis reviens au club.',
    tip: 'Repère toujours la flèche du vent avant de tracer. Quand la route directe n’est pas dans la zone interdite, la ligne droite est la meilleure : ici, deux bords de travers. Mais attention : les roches des Impairs, à 1 km à l’est du club, sont juste sur le chemin !',
    lesson: 'amures', assist: true,
    wind: { from: 10, level: 'medium', name: 'Vent de nord, vent de terre' },
    course: [gate(2600, 380, 70, 90, 'gate', 'Porte de la Grande plage'), finishBase()],
  }),
  mission({
    id: 'm8', num: 3, title: 'Slalom des bouées du club', place: 'Centre de la baie',
    goal: 'Passe les trois portes dans l’ordre, puis franchis l’arrivée.',
    tip: 'Une porte se franchit n’importe où entre les deux bouées : choisis le point qui raccourcit la route suivante.',
    lesson: 'allures', assist: true,
    wind: { from: 270, level: 'medium', name: 'Vent d’ouest' },
    course: [
      gate(1500, -350, 60, 90, 'gate', 'Porte 1'),
      gate(2500, -1300, 60, 0, 'gate', 'Porte 2'),
      gate(3500, -250, 60, 90, 'gate', 'Porte 3'),
      gate(4300, -1000, 70, 0, 'finish', 'Arrivée'),
    ],
  }),
  mission({
    id: 'm6', num: 4, title: 'Le triangle de la Coupe d’Automne', place: 'Zone de régate',
    goal: 'Le triangle de régate du club : bouée au vent, bouée de dégagement, bouée sous le vent, puis arrivée.',
    tip: 'Un triangle fait passer par toutes les allures : près, largue, travers. Observe la couleur de chaque bord : elle indique l’amure. La brise thermique de sud-ouest se lève l’après-midi.',
    lesson: 'allures', assist: true,
    wind: { from: 240, level: 'medium', name: 'Brise thermique de sud-ouest' },
    course: [
      mark({ x: 1950, y: -1450, name: 'Bouée au vent' }),
      mark({ x: 3300, y: -1500, name: 'Bouée de dégagement' }),
      mark({ x: 3000, y: -500, name: 'Bouée sous le vent' }),
      gate(2400, -900, 70, 150, 'finish', 'Ligne d’arrivée'),
    ],
  }),
  mission({
    id: 'm7', num: 5, title: 'Coup de noroît', place: 'Vers Pornichet',
    goal: 'Le noroît souffle fort : descends jusqu’à l’arrivée devant le port de Pornichet.',
    tip: 'Par vent fort, chaque manœuvre se paie. En dériveur ou en Optimist, l’empannage est risqué : un « virement lof pour lof » peut être plus sûr. En catamaran c’est l’inverse. Touche un point de manœuvre pour changer de sens de virage.',
    lesson: 'manoeuvres', assist: false,
    wind: { from: 315, level: 'strong', name: 'Noroît (vent de nord-ouest)' },
    course: [gate(5150, -1250, 80, 35, 'finish', 'Arrivée de Pornichet')],
  }),
  mission({
    id: 'm1', num: 6, title: 'Remontée vers Penchâteau', place: 'Au large de Penchâteau',
    goal: 'Sors de la base et remonte au vent jusqu’à la ligne d’arrivée, au large de la pointe de Penchâteau.',
    tip: 'Un voilier ne peut pas aller droit contre le vent : il reste à environ 45° du vent (un peu plus pour un catamaran) et tire des bords en zigzag. Chaque virement coûte quelques secondes : n’en fais pas trop ! Et attention aux rochers de la pointe…',
    lesson: 'allures', assist: false,
    wind: { from: 160, level: 'medium', name: 'Vent de sud, beau temps' },
    course: [gate(1250, -800, 80, 45, 'finish', 'Ligne du large')],
  }),
  mission({
    id: 'm9', num: 7, title: 'Le tour de la baie', place: 'Les Évens et Pornichet',
    goal: 'Contourne Les Évens, va jusqu’à la bouée de Pornichet et rentre au club.',
    tip: 'Un long parcours : prépare chaque contournement à l’avance et choisis le bon bord au retour, le long de la Grande plage.',
    lesson: 'amures', assist: false,
    wind: { from: 230, level: 'medium', name: 'Brise thermique de sud-ouest' },
    course: [mark(PLACES.evens, 'port'), mark(PLACES.pornichet), finishBase()],
  }),
  mission({
    id: 'm10', num: 8, title: 'Grande régate du CNBPP', place: 'Zone de régate',
    goal: 'Banane avec porte sous le vent, par vent fort d’ouest : la régate du club.',
    tip: 'Tout ce que tu as appris : angle de remontée, laylines, empannage ou lof pour lof, choix du côté de la porte.',
    lesson: 'manoeuvres', assist: false,
    wind: { from: 275, level: 'strong', name: 'Vent d’ouest frais' },
    course: [
      mark({ x: 1250, y: -1450, name: 'Bouée au vent' }),
      gate(3200, -1100, 60, 0, 'gate', 'Porte sous le vent'),
      mark({ x: 1250, y: -1450, name: 'Bouée au vent' }),
      gate(2900, -1100, 70, 0, 'finish', 'Arrivée'),
    ],
  }),
  mission({
    id: 'm5', num: 9, title: 'Pétole du matin', place: 'Devant La Baule',
    goal: 'Petit vent de terre ce matin : remonte jusqu’à la bouée de la Grande plage, puis reviens au club.',
    tip: 'Par petit temps, le bateau relance mal : chaque virement coûte cher. Moins de manœuvres, plus de vitesse. Le vent de terre du matin (nord-est) est souvent faible et irrégulier.',
    lesson: 'reglages', assist: false,
    wind: { from: 45, level: 'light', name: 'Brise de terre du matin' },
    course: [mark(PLACES.plage), finishBase()],
  }),
  mission({
    id: 'm4', num: 10, title: 'Cap sur Les Évens', place: 'Îlot des Évens',
    goal: 'Le grand final : va contourner l’îlot des Évens (attention aux rochers !) et rentre au club au près.',
    tip: 'Les Évens sont entourés de cailloux : garde de l’eau entre toi et l’îlot. Au retour, le vent d’ouest t’oblige à tirer des bords : choisis le bon bord pour ne pas buter sur la plage.',
    lesson: 'allures', assist: false,
    wind: { from: 270, level: 'medium', name: 'Vent d’ouest' },
    course: [mark(PLACES.evens, 'port'), finishBase()],
  }),
];

// --- Défis aléatoires dans la baie ----------------------------------------

const WIND_BY_DIFF = [['medium'], ['light', 'medium'], ['light', 'medium', 'strong'], ['medium', 'strong']];
// Zones d'eau libre où placer un parcours.
const ZONES = [{ x: 2300, y: -900 }, { x: 3200, y: -1400 }, { x: 1700, y: -1500 }, { x: 3600, y: -600 }, { x: 2600, y: -300 }];

const okWater = (p) => !onLand(p) && distToLand(p, 300) >= 200;

// opts.wind : vent imposé (prévision du jour) ; opts.month : mois pour la climatologie.
export function randomLevel(seed, difficulty = 1, opts = {}) {
  const rnd = mulberry32(seed);
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const rr = (a, b) => a + (b - a) * rnd();
  // vent tiré de la climatologie réelle de la baie pour ce mois (ou prévision imposée)
  const w = opts.wind || sampleClimateWind(rnd, opts.month || new Date().getMonth() + 1, WIND_BY_DIFF[Math.min(3, difficulty)]);
  const from = w.from;
  const level = w.level;
  const wName = opts.wind ? `${windName(from)} · prévision du jour` : windName(from);
  const zone = pick(ZONES);
  const L = (x, y) => {
    // repère local « vent du haut » centré sur la zone
    const p = rotate({ x, y }, from);
    return { x: Math.round(zone.x + p.x), y: Math.round(zone.y + p.y) };
  };
  const m = (x, y) => ({ type: 'mark', ...L(x, y), side: 'auto' });
  const g = (x, y, half = 60, type = 'gate') => {
    const c = L(x, y);
    // ligne perpendiculaire au vent
    const e = rotate({ x: half, y: 0 }, from);
    return { type, a: { x: c.x - e.x, y: c.y - e.y }, b: { x: c.x + e.x, y: c.y + e.y } };
  };
  let course;
  let name;
  const kind = difficulty <= 1 ? pick(['beat', 'run', 'banane']) : difficulty === 2 ? pick(['banane', 'triangle', 'trapeze']) : pick(['triangle', 'trapeze', 'parcours']);
  const s = rnd() < 0.5 ? -1 : 1;
  if (kind === 'beat') {
    name = 'Remontée au vent';
    course = [g(0, rr(300, 500), 70, 'finish')];
  } else if (kind === 'run') {
    name = 'Descente';
    course = [g(0, -rr(300, 500), 70, 'finish')];
  } else if (kind === 'banane') {
    name = 'Banane';
    course = [m(rr(-100, 100), rr(350, 550)), g(0, -200, 60, 'finish')];
  } else if (kind === 'triangle') {
    name = 'Triangle';
    const top = rr(450, 600);
    course = [m(0, top), m(s * rr(350, 450), top / 2 - 100), m(0, -150), g(0, top / 2 - 100, 60, 'finish')];
  } else if (kind === 'trapeze') {
    name = 'Trapèze';
    const top = rr(400, 550);
    const w = rr(300, 420);
    course = [m(0, top), m(s * w, top), m(s * w, -100), g(0, -250, 60, 'finish')];
  } else {
    name = 'Parcours libre';
    course = [m(rr(-300, 300), rr(400, 600)), m(s * rr(300, 450), rr(-100, 200)), g(-s * rr(200, 350), rr(-300, 0), 50), m(s * rr(-100, 100), rr(-500, -350)), g(0, rr(100, 250), 60, 'finish')];
  }
  // Départ dans la zone du parcours (sous le vent des bouées), pour que le parcours garde son sens.
  const start = kind === 'run' ? L(0, 0) : kind === 'beat' ? L(0, 0) : L(s * rr(-60, 60), -rr(320, 420));
  const allPts = [start, ...course.flatMap((c) => (c.type === 'mark' ? [c] : [c.a, c.b]))];
  const valid = allPts.every(okWater);
  return mission({
    start,
    id: `rnd-${difficulty}-${seed}`, num: null, title: name, place: 'Baie de La Baule',
    goal: 'Défi aléatoire en baie de La Baule : trouve la route la plus rapide !',
    tip: 'Lis le vent, repère les allures, évite les rochers et limite les manœuvres inutiles.',
    lesson: 'allures', assist: difficulty <= 1, random: true, seed, difficulty, valid,
    wind: { from, level, name: wName },
    course,
  });
}

export const dailySeed = (d = new Date()) => d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
