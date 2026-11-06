// Répétition espacée (méthode des boîtes de Leitner) pour les questions de quiz.
// Une question ratée revient le jour même (boîte 1) ; réussie, elle monte d'une boîte
// et revient de plus en plus tard : 0, 1, 3, 7 puis 14 jours.
import { LESSONS } from '../data/lessons.js';

export const INTERVALS = [0, 1, 3, 7, 14]; // jours, par boîte (1 à 5)
const DAY = 86400000;
export const today = (now = Date.now()) => Math.floor(now / DAY);

// Identifiant stable d'une question de leçon.
export const qid = (lessonId, index) => `${lessonId}#${index}`;

// state : { [id]: { box, due, seen, wrong } } (modifié et renvoyé)
export function review(state, id, correct, now = Date.now()) {
  const d = today(now);
  const s = state[id] || { box: 1, due: d, seen: 0, wrong: 0 };
  s.seen++;
  if (correct) s.box = Math.min(5, s.box + 1);
  else {
    s.box = 1;
    s.wrong++;
  }
  s.due = d + INTERVALS[s.box - 1];
  state[id] = s;
  return state;
}

// Questions à revoir aujourd'hui (déjà vues, échéance passée), les plus fragiles d'abord.
export function dueItems(state, now = Date.now()) {
  const d = today(now);
  return Object.entries(state)
    .filter(([, s]) => s.due <= d)
    .sort((a, b) => a[1].box - b[1].box || b[1].wrong - a[1].wrong)
    .map(([id]) => id);
}

// Retrouve la question d'une leçon à partir de son identifiant.
export function questionOf(id) {
  const [lid, i] = id.split('#');
  const lesson = LESSONS.find((l) => l.id === lid);
  const q = lesson && lesson.quiz[+i];
  return q ? { lesson, q, id } : null;
}

// Taux d'erreur par leçon (pour le bilan du moniteur et les conseils).
export function weakLessons(state) {
  const by = {};
  Object.entries(state).forEach(([id, s]) => {
    const lid = id.split('#')[0];
    by[lid] = by[lid] || { seen: 0, wrong: 0 };
    by[lid].seen += s.seen;
    by[lid].wrong += s.wrong;
  });
  return Object.entries(by)
    .map(([lid, v]) => ({ lid, rate: v.seen ? v.wrong / v.seen : 0, seen: v.seen }))
    .sort((a, b) => b.rate - a.rate);
}
