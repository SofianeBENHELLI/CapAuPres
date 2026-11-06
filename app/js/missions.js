// Les missions : récit, conditions, parcours. Positions en mètres dans le repère local (CNBPP = 0,0).
import { rng } from './wind.js';

const CLUB = { x: 0, y: -230, r: 110, label: 'Retour au club' };

export const MISSIONS = [
  {
    id: 'premier-bord', n: 1, title: 'Premier bord', place: 'Le Pouliguen',
    story: 'Ton moniteur t\'attend à la bouée jaune, juste après la bande des 300 m. Vent d\'ouest léger : sors au travers, fais le tour de la bouée et reviens à la plage.',
    goal: 'Aller à la bouée et revenir', lesson: 'allures',
    wind: { twd: 270, tws: 9, gust: 11, shift: 4 }, sea: { swellH: 0.3 },
    start: { x: 0, y: -230, heading: 180 },
    marks: [{ x: 0, y: -800, r: 70, label: 'Bouée jaune' }, CLUB],
  },
  {
    id: 'baguenaude', n: 2, title: 'Le tour de la Baguenaude', place: 'La Baguenaude',
    story: 'Le petit îlot de la Baguenaude garde l\'entrée ouest de la baie. Fais-en le tour complet en passant toutes les bouées, sans toucher les cailloux.',
    goal: 'Tour complet de l\'îlot', lesson: 'manoeuvres',
    wind: { twd: 250, tws: 10, gust: 13, shift: 6 }, sea: { swellH: 0.5 },
    start: { x: 0, y: -230, heading: 180 },
    marks: [{ x: 468, y: -1870, r: 90, label: 'Nord' }, { x: 820, y: -2211, r: 90, label: 'Est' }, { x: 468, y: -2560, r: 90, label: 'Sud' }, { x: 110, y: -2211, r: 90, label: 'Ouest' }, CLUB],
  },
  {
    id: 'penchateau', n: 3, title: 'Doubler Penchâteau', place: 'Pointe de Penchâteau',
    story: 'Les roches de Penchâteau débordent loin sous l\'eau. Va voir la côte sauvage de l\'autre côté de la pointe en restant au large des hauts-fonds, puis rentre.',
    goal: 'Doubler la pointe par le large', lesson: 'securite',
    wind: { twd: 300, tws: 11, gust: 15, shift: 6 }, sea: { swellH: 0.6 },
    start: { x: 0, y: -230, heading: 220 },
    marks: [{ x: -1250, y: -2350, r: 100, label: 'Sud Penchâteau' }, { x: -2000, y: -2350, r: 110, label: 'Côte sauvage' }, { x: -800, y: -1200, r: 110, label: 'Anse du Pouliguen' }, CLUB],
  },
  {
    id: 'grande-plage', n: 4, title: 'La Grande plage', place: 'La Baule',
    story: 'Brise de mer de sud-sud-ouest, les parasols sont de sortie. Longe la plus belle plage d\'Europe jusqu\'à La Baule centre, au large de la bande des 300 m, et reviens.',
    goal: 'Aller-retour La Baule centre', lesson: 'reglages',
    wind: { twd: 200, tws: 12, gust: 15, shift: 5 }, sea: { swellH: 0.8, swellDir: 220 },
    start: { x: 0, y: -230, heading: 120 },
    marks: [{ x: 1300, y: -420, r: 100, label: 'Plage Benoît' }, { x: 2700, y: -80, r: 110, label: 'La Baule centre' }, CLUB],
  },
  {
    id: 'evens', n: 5, title: 'Cap sur les Évens', place: 'Les Évens',
    story: 'Les Évens, colonie de goélands et de cormorans au milieu de la baie. Contourne-les par le sud, sans t\'approcher du plateau rocheux.',
    goal: 'Contourner Les Évens par le sud', lesson: 'manoeuvres',
    wind: { twd: 240, tws: 13, gust: 17, shift: 7 }, sea: { swellH: 0.8 },
    start: { x: 0, y: -230, heading: 160 },
    marks: [{ x: 1050, y: -2565, r: 110, label: 'Ouest Évens' }, { x: 1526, y: -3050, r: 110, label: 'Sud Évens' }, { x: 2000, y: -2565, r: 110, label: 'Est Évens' }, CLUB],
  },
  {
    id: 'remontee', n: 6, title: 'Remonter au vent', place: 'Ouest de la baie',
    story: 'Vent de sud bien établi : la bouée est plein vent debout. Impossible d\'y aller tout droit, il faut tirer des bords et virer au bon moment.',
    goal: 'Atteindre la bouée au vent', lesson: 'manoeuvres',
    wind: { twd: 185, tws: 11, gust: 14, shift: 8, period: 150 }, sea: { swellH: 0.5 },
    start: { x: 200, y: -450, heading: 220 },
    marks: [{ x: 150, y: -1700, r: 80, label: 'Bouée au vent' }, { x: 200, y: -450, r: 100, label: 'Arrivée' }],
  },
  {
    id: 'vent-terre', n: 7, title: 'Vent de terre', place: 'Milieu de baie',
    story: 'Nord-nord-est, l\'eau est plate au bord et ça accélère au large. Va jusqu\'à la bouée du milieu de baie puis rentre : la baie est fermée et le club au fond, la rentrée se fait au près en eau abritée.',
    goal: 'Sortir au large puis rentrer au club', lesson: 'meteo',
    wind: { twd: 20, tws: 13, gust: 19, shift: 10, period: 120 }, sea: { swellH: 0.2 },
    start: { x: 0, y: -230, heading: 190 },
    marks: [{ x: 1000, y: -2000, r: 110, label: 'Milieu de baie' }, CLUB],
  },
  {
    id: 'pornichet', n: 8, title: 'Escale à Pornichet', place: "Port d'Armor",
    story: 'Traversée de la baie d\'ouest en est jusqu\'à l\'entrée du port d\'Armor, puis retour au Pouliguen avant le goûter.',
    goal: 'Traverser la baie et revenir', lesson: 'allures',
    wind: { twd: 270, tws: 12, gust: 16, shift: 6 }, sea: { swellH: 0.7 },
    start: { x: 0, y: -230, heading: 120 },
    marks: [{ x: 5000, y: -1550, r: 120, label: "Entrée du port d'Armor" }, CLUB],
  },
  {
    id: 'banane', n: 9, title: 'Régate : parcours banane', place: 'Zone de régate',
    story: 'Jour de régate du club. Deux tours bouée au vent, bouée sous le vent. Bon départ, bons virements, bons empannages.',
    goal: 'Deux tours de parcours', lesson: 'priorites',
    wind: { twd: 230, tws: 12, gust: 16, shift: 8, period: 140 }, sea: { swellH: 0.6 },
    start: { x: 850, y: -1250, heading: 230 },
    marks: [{ x: 60, y: -1950, r: 70, label: 'Bouée 1 (au vent)' }, { x: 850, y: -1300, r: 70, label: 'Bouée 2 (sous le vent)' }, { x: 60, y: -1950, r: 70, label: 'Bouée 1' }, { x: 850, y: -1300, r: 80, label: 'Arrivée' }],
  },
  {
    id: 'charpentier', n: 10, title: 'Raid du Grand Charpentier', place: 'Grand Charpentier',
    story: 'Le grand raid : sortir de la baie, rejoindre le phare du Grand Charpentier qui garde l\'estuaire de la Loire, en faire le tour et rentrer au club.',
    goal: 'Tour du phare et retour', lesson: 'meteo',
    wind: { twd: 280, tws: 14, gust: 18, shift: 6 }, sea: { swellH: 1.1, swellT: 9 },
    start: { x: 0, y: -230, heading: 150 },
    marks: [{ x: 3500, y: -3600, r: 150, label: 'Sortie de baie' }, { x: 7750, y: -6750, r: 140, label: 'Sud du phare' }, { x: 8450, y: -6150, r: 140, label: 'Est du phare' }, { x: 3500, y: -3600, r: 150, label: 'Retour en baie' }, CLUB],
    long: true,
  },
];

export const byId = Object.fromEntries(MISSIONS.map((m) => [m.id, m]));

export function stars(timeS, refS, groundings = 0) {
  if (!refS) return 1;
  const r = timeS / refS;
  let s = r <= 1.2 ? 3 : r <= 1.6 ? 2 : 1;
  if (groundings > 0) s = Math.min(s, 2);
  if (groundings > 2) s = 1;
  return s;
}

// Défi du jour : mission et variante de vent tirées de la date, identiques pour tous les élèves.
export function dailyChallenge(date = new Date(), missions = MISSIONS) {
  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const r = rng(h);
  const pool = missions.filter((m) => !m.long);
  const m = pool[Math.floor(r() * pool.length)];
  const dWind = Math.round((r() - 0.5) * 40);
  const kWind = 0.85 + r() * 0.35;
  return {
    key, mission: m,
    wind: { ...m.wind, twd: (m.wind.twd + dWind + 360) % 360, tws: Math.round(m.wind.tws * kWind), gust: Math.round(m.wind.gust * kWind), seed: h },
  };
}
