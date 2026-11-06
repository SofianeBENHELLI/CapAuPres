// « Jeux » : tout ce qui est ludique, chronométré ou noté, à part des leçons de l'école.
// Réflexes (mini-jeux), atelier réglages, défi du jour et défis aléatoires dans la baie.
import { MODES } from './reflexes.js';
import { dailySeed } from '../core/levels.js';
import { getBoat } from '../core/boats.js';
import { store } from '../store.js';

export function render(root) {
  const daily = store.daily(dailySeed());
  const rnd = () => Math.floor(Math.random() * 1e6);
  const best = (id) => store.reflex(id);
  root.innerHTML = `
    <div class="section-title"><h1>Jeux</h1><span class="pill">🎮 S’entraîner en s’amusant</span></div>
    <p class="muted" style="margin-top:-6px">Les leçons sont dans l’École ; ici on s’entraîne, on bat ses records et on gagne des XP.</p>

    <div class="games-hero">
      <a class="card game-feature daily" href="#/defi/2/today">
        <span class="temoji">📅</span>
        <div><small>Défi du jour</small><b>Le même parcours pour tout le club</b>
          <span>${daily ? `✓ Réussi aujourd’hui : ${daily} %` : 'Avec le vent prévu cet après-midi dans la baie.'}</span></div>
        <span class="btn primary small">${daily ? 'Rejouer' : 'Relever le défi'}</span>
      </a>
      <div class="card game-feature random">
        <span class="temoji">🎲</span>
        <div><small>Défi aléatoire</small><b>Un parcours tiré au hasard</b><span>Choisis ta difficulté.</span></div>
        <div class="row">
          <a class="btn small" href="#/defi/1/${rnd()}">🟢 Facile</a>
          <a class="btn small" href="#/defi/2/${rnd()}">🟠 Moyen</a>
          <a class="btn small" href="#/defi/3/${rnd()}">🔴 Difficile</a>
        </div>
      </div>
    </div>

    <h2 class="block-title">⚡ Réflexes</h2>
    <p class="muted" style="margin-top:-6px">Mini-jeux express : enchaîne les bonnes réponses pour faire monter le combo.</p>
    <div class="games-grid">
      ${MODES.map((m) => `<a class="card game-card" href="#/reflexes/${m.id}">
        <span class="temoji">${m.emoji}</span><b>${m.title}</b><span class="muted">${m.text}</span>
        ${best(m.id) ? `<span class="pill">🏆 Record : ${best(m.id)} pts</span>` : '<span class="pill ghost">Pas encore joué</span>'}
      </a>`).join('')}
    </div>

    <h2 class="block-title">🎯 Ateliers</h2>
    <div class="games-grid">
      <a class="card game-card" href="#/apprendre/reglages/atelier">
        <span class="temoji">🎛️</span><b>Atelier réglages</b>
        <span class="muted">Une situation au hasard : règle ton ${getBoat().name} et compare avec les moniteurs.</span>
      </a>
      <a class="card game-card" href="#/naviguer">
        <span class="temoji">⛵</span><b>Missions dans la baie</b>
        <span class="muted">Tracer sa route, barrer en direct ou régater : c’est dans Naviguer.</span>
      </a>
    </div>`;
}
