// « Naviguer » : la baie de La Baule comme carte d'aventure. Chaque mission est une étape
// à débloquer ; en dessous, l'entraînement (réflexes, défi du jour, défis aléatoires).
import { LEVELS, dailySeed } from '../core/levels.js';
import { getBoat } from '../core/boats.js';
import { WINDS } from '../core/polar.js';
import { compassLong } from '../core/angles.js';
import { store, starsFor, starsHTML } from '../store.js';
import { missionUnlocked } from '../core/progress.js';
import { landLayer, SEA_DEFS, fx, OSM_CREDIT, bindMarkPopovers } from '../ui/map.js';
import { boatIcon, windArrowSVG } from '../ui/boat.js';

// Position des étapes sur la carte (en mètres, origine : la base du club).
const PINS = {
  m1: { x: 1150, y: -650 }, m2: { x: 650, y: -300 }, m3: { x: 2250, y: 650 }, m4: { x: 2640, y: -2050 },
  m5: { x: 3350, y: 700 }, m6: { x: 2700, y: -1050 }, m7: { x: 4750, y: -1000 }, m8: { x: 3650, y: -350 },
  m9: { x: 4250, y: -2150 }, m10: { x: 1600, y: -1550 },
};
const BOX = { minX: -900, maxX: 6100, minY: -3000, maxY: 1950 };

export function render(root) {
  const boat = getBoat();
  const stars = store.totalStars(LEVELS);
  const done = LEVELS.filter((l) => store.level(l.id)).length;
  const firstTodo = LEVELS.findIndex((l, i) => missionUnlocked(i) && !store.level(l.id));
  const w = BOX.maxX - BOX.minX;
  const h = BOX.maxY - BOX.minY;
  const k = 1000 / w;

  root.innerHTML = `
    <div class="section-title"><h1>Naviguer</h1>
      <span class="row"><a class="pill" href="#/bateau" style="text-decoration:none;color:inherit">${boatIcon(undefined, 22, true)} ${boat.name}</a><span class="pill">⭐ ${stars} / ${LEVELS.length * 3}</span></span></div>
    <p class="muted" style="margin-top:-6px">${done} mission${done > 1 ? 's' : ''} réussie${done > 1 ? 's' : ''} sur ${LEVELS.length} en ${boat.name}. Toutes partent de la base du CNBPP au Pouliguen. Touche une étape sur la carte.</p>
    <div class="play-layout">
      <div class="card bay-card">
        <div class="bay-map-wrap">
          <svg class="bay-map" viewBox="${BOX.minX} ${-BOX.maxY} ${w} ${h}" preserveAspectRatio="xMidYMid slice">
            ${SEA_DEFS}
            <rect x="${BOX.minX - 3000}" y="${-BOX.maxY - 3000}" width="${w + 6000}" height="${h + 6000}" fill="url(#seaGrad)"/>
            ${landLayer(k)}
            <line id="selPath" x1="0" y1="0" x2="0" y2="0" class="adventure-path" stroke-width="${fx(3 / k)}" style="stroke-dasharray:${fx(2 / k)} ${fx(9 / k)}"/>
            ${LEVELS.map((l, i) => {
              const p = PINS[l.id];
              const rec = store.level(l.id);
              const open = missionUnlocked(i);
              const cls = rec ? 'done' : !open ? 'locked' : i === firstTodo ? 'current' : 'open';
              const st = rec ? starsFor(rec.score) : 0;
              return `<g class="pin ${cls}" data-i="${i}" transform="translate(${p.x},${-p.y}) scale(${fx(1 / k)})" tabindex="0" role="button" aria-label="Mission ${l.num} : ${l.title}">
                ${cls === 'current' ? '<circle class="pin-pulse" r="26"/>' : ''}
                <circle class="pin-dot" r="17"/>
                <text class="pin-num" y="1">${open ? l.num : '🔒'}</text>
                ${rec ? `<text class="pin-stars" y="34">${'★'.repeat(st)}${'☆'.repeat(3 - st)}</text>` : ''}
              </g>`;
            }).join('')}
          </svg>
          <div class="map-credit">${OSM_CREDIT}</div>
        </div>
      </div>
      <aside class="card mission-panel" id="panel"></aside>
    </div>

    <a class="card next-step" href="#/jeux"><span class="temoji">🎮</span><div><b>Défi du jour, défis aléatoires, réflexes</b><span class="muted">Tous les jeux sont maintenant dans l’onglet Jeux.</span></div><span class="btn small">Jeux →</span></a>`;

  bindMarkPopovers(root.querySelector('.bay-map-wrap'));
  const panel = root.querySelector('#panel');
  const select = (i) => {
    const l = LEVELS[i];
    const rec = store.level(l.id);
    const open = missionUnlocked(i);
    root.querySelectorAll('.pin').forEach((p) => p.classList.toggle('sel', +p.dataset.i === i));
    // trajet depuis la base du club jusqu'à l'étape choisie
    const sp = root.querySelector('#selPath');
    const start = l.start || { x: 0, y: 0 };
    sp.setAttribute('x1', start.x);
    sp.setAttribute('y1', -start.y);
    sp.setAttribute('x2', PINS[l.id].x);
    sp.setAttribute('y2', -PINS[l.id].y);
    panel.innerHTML = `
      <div class="mp-head">
        <span class="mp-num">${l.num}</span>
        <div><small class="muted">Mission ${l.num} · 📍 ${l.place}</small><h2>${l.title}</h2></div>
      </div>
      <div class="mp-wind">
        <svg viewBox="-40 -40 80 80"><circle r="36" fill="var(--sky-soft)"/><g style="color:var(--navy)">${windArrowSVG(l.wind.from, 24)}</g></svg>
        <div><b>${l.wind.name}</b><span class="muted">Vent ${compassLong(l.wind.from)} · ${WINDS[l.wind.level].kts} nœuds · ${WINDS[l.wind.level].label}</span></div>
      </div>
      <p>${l.goal}</p>
      ${rec ? `<p>${starsHTML(starsFor(rec.score))} <b>Meilleur score : ${rec.score} %</b></p>` : ''}
      ${open
        ? `<div class="mode-pick">
            <a class="mode" href="#/mission/${l.id}"><span>✏️</span><b>Tracer ma route</b><small>Pose tes points, lance la course : le jeu de stratégie.</small></a>
            <a class="mode" href="#/barre/${l.id}"><span>☸️</span><b>À la barre</b><small>Barre en direct : vent qui tourne, risées, inertie.</small></a>
            <a class="mode" href="#/regate/${l.id}"><span>🏁</span><b>Régate</b><small>Contre 5 bateaux, avec les règles de priorité et la place à la marque.</small></a>
          </div>`
        : `<div class="locked-note">🔒 Réussis d’abord la mission ${l.num - 1} pour débloquer celle-ci.</div>`}
    `;
  };
  root.querySelectorAll('.pin').forEach((p) => {
    p.addEventListener('click', () => select(+p.dataset.i));
    p.addEventListener('keydown', (e) => (e.key === 'Enter' || e.key === ' ') && select(+p.dataset.i));
  });
  select(firstTodo >= 0 ? firstTodo : LEVELS.length - 1);
}
