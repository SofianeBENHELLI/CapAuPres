// Tableau de bord : grade, prochaine étape (leçon / mission), défi du jour, badges.
import { boatSVG, windArrowSVG } from '../ui/boat.js';
import { LEVELS, randomLevel, dailySeed } from '../core/levels.js';
import { LESSONS } from '../data/lessons.js';
import { store } from '../store.js';
import { getBoat } from '../core/boats.js';
import { xpBreakdown, gradeOf, earnedBadges, BADGES, missionUnlocked, nextSteps } from '../core/progress.js';
import { compassLong } from '../core/angles.js';
import { WINDS } from '../core/polar.js';
import { dueItems } from '../core/srs.js';
import { loadConditions, summarize, flagFor } from '../core/conditions.js';
import { arrow, hhmm, flagSVG } from './conditions.js';
import { dayKey } from '../core/weather.js';

const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Vent du défi du jour (même tirage que l'écran de jeu, sans calculer la route).
function dailyPreview() {
  const seed = dailySeed();
  let wind = null;
  try {
    const f = JSON.parse(localStorage.getItem(`capaupres.forecast.${dayKey()}`));
    if (f) wind = { from: f.from, level: f.level };
  } catch {
    /* pas de prévision en cache */
  }
  for (let k = 0; k < 30; k++) {
    const l = randomLevel(seed + k * 7919, 2, wind ? { wind } : {});
    if (l.valid !== false) return l;
  }
  return null;
}

export function render(root) {
  const boat = getBoat();
  const xp = xpBreakdown();
  const g = gradeOf(xp.total);
  const badges = earnedBadges();
  const nextLesson = LESSONS.find((l) => !store.lesson(l.id)?.done);
  const nextIdx = LEVELS.findIndex((l, i) => missionUnlocked(i) && !store.level(l.id));
  const nextMission = nextIdx >= 0 ? LEVELS[nextIdx] : null;
  const stars = store.totalStars(LEVELS);
  const daily = dailyPreview();
  const dailyScore = store.daily(dailySeed());
  const hour = new Date().getHours();
  const hello = hour < 6 || hour >= 18 ? 'Bonsoir' : 'Bonjour';
  const name = store.name ? ` ${esc(store.name)}` : '';

  root.innerHTML = `
  <a class="card cond-banner" href="#/conditions" aria-label="Conditions en temps réel dans la baie">
    <span class="cb-live">Conditions en direct</span>
    <span class="cb-items" id="condItems"><span class="muted">Météo, vent, marée, vagues, webcam</span></span>
    <span class="cb-go" aria-hidden="true">→</span>
  </a>
  <section class="dash-hero">
    <div class="dash-hello">
      <h1>${hello}${name} 👋</h1>
      <p>Prêt·e à naviguer dans la baie en <b>${boat.name}</b> ?</p>
      <a class="grade-card" href="#/profil">
        <span class="gicon">${g.icon}</span>
        <span class="ginfo">
          <small>Ton grade</small>
          <b>${g.name}</b>
          <span class="xpbar"><i style="width:${Math.round(g.pct * 100)}%"></i></span>
          <small>${xp.total} XP${!g.next ? ' · grade maximal !' : g.blocked ? ` · 🎓 passe l’épreuve pour devenir <b>${g.next.name}</b>` : ` · encore ${g.toGo} XP pour devenir <b>${g.next.name}</b>`}</small>
        </span>
      </a>
      ${g.next && !g.blocked ? `<div class="grade-steps" aria-label="Pour gagner des XP">${nextSteps().map((st) => `<a href="${st.href}">${st.icon} ${st.label} <b>${st.upTo ? 'jusqu’à ' : ''}+${st.xp} XP</b></a>`).join('')}</div>` : ''}
    </div>
    <svg class="dash-boat" viewBox="-130 -120 260 240" aria-hidden="true">
      <g transform="translate(-95,-85) scale(.55)" style="color:rgba(255,255,255,.8)">${windArrowSVG(0, 40)}</g>
      <g id="heroBoat" transform="scale(1.35)"></g>
    </svg>
  </section>

  ${dueItems(store.srs).length ? `<a class="card review-banner" href="#/apprendre/revision" style="margin-top:16px"><span>🔁</span><div><b>Révisions du jour : ${dueItems(store.srs).length} question${dueItems(store.srs).length > 1 ? 's' : ''}</b><span class="muted">5 minutes pour ancrer ce que tu as raté.</span></div><span class="btn primary small">Réviser</span></a>` : ''}
  <h2 class="block-title">Ta prochaine étape</h2>
  <div class="next-grid">
    ${nextLesson ? `
    <a class="card next-card learn" href="#/apprendre/${nextLesson.id}">
      <span class="ntag">📖 Apprendre · Leçon ${nextLesson.num}/${LESSONS.length}</span>
      <h3>${nextLesson.icon} ${nextLesson.title}</h3>
      <p class="muted">${nextLesson.summary}</p>
      <span class="btn primary">Commencer la leçon →</span>
    </a>` : `
    <a class="card next-card learn" href="#/apprendre">
      <span class="ntag">📖 Apprendre</span>
      <h3>🎓 Toutes les leçons sont validées !</h3>
      <p class="muted">Révise quand tu veux, ou entraîne-toi au réglage dans l’atelier.</p>
      <span class="btn">Revoir les leçons</span>
    </a>`}
    ${nextMission ? `
    <a class="card next-card play" href="#/mission/${nextMission.id}">
      <span class="ntag">⛵ Naviguer · Mission ${nextMission.num}/${LEVELS.length}</span>
      <h3>${nextMission.title}</h3>
      <p class="muted">📍 ${nextMission.place} · 🌬️ ${nextMission.wind.name}</p>
      <span class="btn navy">Larguer les amarres ▶</span>
    </a>` : `
    <a class="card next-card play" href="#/naviguer">
      <span class="ntag">⛵ Naviguer</span>
      <h3>🏆 Toutes les missions sont réussies en ${boat.name} !</h3>
      <p class="muted">Vise les 3 étoiles partout, ou change de bateau pour un nouveau défi.</p>
      <span class="btn navy">Voir la carte</span>
    </a>`}
  </div>

  <div class="dash-row">
    <a class="card daily-card" href="#/defi/2/today">
      <div>
        <span class="ntag">📅 Défi du jour</span>
        <h3>${daily ? daily.title : 'Parcours du jour'}</h3>
        <p class="muted">${daily ? `${daily.wind.name} · ${WINDS[daily.wind.level].label}` : ''}<br/>Le même parcours pour toute l’équipe, avec le vent prévu cet après-midi.</p>
        ${dailyScore ? `<b class="done">✓ Réussi : ${dailyScore} %</b>` : '<span class="btn primary small">Relever le défi</span>'}
      </div>
      ${daily ? `<svg viewBox="-50 -50 100 100" class="daily-wind" aria-label="Vent ${compassLong(daily.wind.from)}"><circle r="46" fill="var(--sky-soft)"/><g style="color:var(--navy)">${windArrowSVG(daily.wind.from, 30)}</g></svg>` : ''}
    </a>
    <a class="card stat-card" href="#/naviguer">
      <small class="muted">Missions en ${boat.name}</small>
      <b>${LEVELS.filter((l) => store.level(l.id)).length} / ${LEVELS.length}</b>
      <span class="stars">${'★'.repeat(Math.min(stars, 3))}</span> <small class="muted">${stars} étoiles sur ${LEVELS.length * 3}</small>
    </a>
    <a class="card stat-card" href="#/profil">
      <small class="muted">Badges</small>
      <b>${badges.size} / ${BADGES.length}</b>
      <span class="badge-mini">${BADGES.filter((b) => badges.has(b.id)).slice(-6).map((b) => `<span title="${b.name}">${b.icon}</span>`).join('') || '<small class="muted">Aucun pour l’instant</small>'}</span>
    </a>
    <a class="card stat-card" href="#/seance">
      <small class="muted">Au club</small>
      <b>👩‍🏫 Séance</b>
      <small class="muted">${store.mySession ? `En cours : ${store.mySession.name.replace(/[<>&]/g, '')}` : 'Rejoins la séance de ton moniteur'}</small>
    </a>
    <a class="card stat-card" href="#/reflexes">
      <small class="muted">Réflexes</small>
      <b>⚡ Mini-jeux</b>
      <small class="muted">45 secondes pour tester ta lecture du vent</small>
    </a>
  </div>

  <footer class="club-footer">
    <img src="assets/cnbpp-logo.png" alt="CNBPP — Cercle Nautique La Baule Le Pouliguen Pornichet" />
    <div>
      <b>Cercle Nautique La Baule – Le Pouliguen – Pornichet</b><br/>
      77 rue François Bougouin, 44510 Le Pouliguen · <a href="tel:+33240423211">02 40 42 32 11</a> · <a href="https://www.cnbpp.fr/" target="_blank" rel="noopener">cnbpp.fr</a><br/>
      <small>Cap au Près est un jeu pour apprendre, pas un outil de navigation : sur l’eau, on suit la carte marine du SHOM, la météo officielle et son moniteur.</small>
    </div>
  </footer>`;

  // Bandeau des conditions : rempli dès que les données arrivent (ou depuis le cache).
  loadConditions().then((data) => {
    const el = root.querySelector('#condItems');
    if (!data || !el) return;
    const c = summarize(data);
    const next = c.tide?.next[0];
    const flag = flagFor(c, boat.id);
    if (flag) root.querySelector('.cond-banner').setAttribute('aria-label', `Conditions en temps réel : ${flag.label.toLowerCase()} pour ${boat.name}`);
    el.innerHTML = [
      flag && `<span class="cb-flag">${flagSVG(flag.color, 22)} <b>${flag.label.replace('Drapeau ', '')}</b></span>`,
      c.sky && `<span>${c.sky.icon} ${c.temp}°</span>`,
      c.wind && `<span>${arrow(c.wind.from, 16)} ${c.wind.kn} nds</span>`,
      c.waves && `<span>🌊 ${c.waves.height.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} m</span>`,
      next && `<span>🌙 ${next.type} ${hhmm(next.time)}</span>`,
    ].filter(Boolean).join('');
  });

  // Le bateau tourne lentement : les voiles changent de côté et de forme.
  const gEl = root.querySelector('#heroBoat');
  let h = 300;
  let raf;
  const tick = () => {
    h = (h + 0.25) % 360;
    gEl.innerHTML = boatSVG({ heading: h, windFrom: 0 });
    raf = requestAnimationFrame(tick);
  };
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) gEl.innerHTML = boatSVG({ heading: 120, windFrom: 0 });
  else tick();
  return () => cancelAnimationFrame(raf);
}
