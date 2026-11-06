// Personnalisation du bateau : couleurs de coque et de voile, numéro de voile, peint sur le pont.
// Chaque option se débloque à un grade (index dans GRADES). Rien n'est jamais bloqué
// pour naviguer : c'est seulement l'allure de son bateau.
import { store } from '../store.js';
import { xpBreakdown, gradeOf } from './progress.js';

export const HULLS = [
  { id: 'marine', name: 'Bleu marine', color: '#173d61', grade: 0 },
  { id: 'rouge', name: 'Rouge', color: '#c0392b', grade: 1 },
  { id: 'vert', name: 'Vert', color: '#1e8449', grade: 1 },
  { id: 'blanc', name: 'Blanc', color: '#e9eef2', grade: 1 },
  { id: 'jaune', name: 'Jaune', color: '#f2b705', grade: 4 },
  { id: 'orange', name: 'Orange', color: '#e8650a', grade: 4 },
  { id: 'noir', name: 'Noir', color: '#1b1f24', grade: 5 },
  { id: 'or', name: 'Or', color: '#c9a227', grade: 7 },
];

export const SAILS = [
  { id: 'blanche', name: 'Blanche', color: '#ffffff', grade: 0 },
  { id: 'ciel', name: 'Bleu ciel', color: '#bfe6fa', grade: 3 },
  { id: 'soleil', name: 'Jaune soleil', color: '#ffe08a', grade: 3 },
  { id: 'corail', name: 'Corail', color: '#f7a8a0', grade: 3 },
  { id: 'rouge', name: 'Rouge', color: '#d8423a', grade: 5 },
  { id: 'carbone', name: 'Carbone', color: '#3a3f47', grade: 6 },
  { id: 'amiral', name: 'Amiral (bleu du club)', color: '#243150', grade: 8 },
];

export const NUMBER_GRADE = 2;

// Ce que chaque grade débloque, pour l'annoncer (cérémonie, liste des grades).
export function perksOf(index) {
  const out = [];
  const hulls = HULLS.filter((h) => h.grade === index);
  const sails = SAILS.filter((s) => s.grade === index);
  if (hulls.length) out.push(`coque ${hulls.map((h) => h.name.toLowerCase()).join(', ')}`);
  if (sails.length) out.push(`voile ${sails.map((s) => s.name.toLowerCase()).join(', ')}`);
  if (index === NUMBER_GRADE) out.push('ton numéro de voile');
  return out;
}

export const gradeIndex = () => gradeOf(xpBreakdown().total).index;

// Couleurs choisies, ramenées au défaut si le grade ne les permet plus (remise à zéro).
export function resolveLook(grade = gradeIndex()) {
  const pick = store.pref.look || {};
  const ok = (list, id) => list.find((x) => x.id === id && x.grade <= grade) || list[0];
  const hull = ok(HULLS, pick.hull);
  const sail = ok(SAILS, pick.sail);
  const number = grade >= NUMBER_GRADE ? String(pick.number || '').replace(/[^0-9A-Z]/gi, '').slice(0, 4).toUpperCase() : '';
  return { hull: hull.color, sail: sail.color, number };
}

export function setLook(part) {
  store.setPref('look', { ...(store.pref.look || {}), ...part });
}
