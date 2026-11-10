import { LEVELS, dailySeed } from '../core/levels.js';
import { playableRandomLevel } from '../core/challenge.js';
import { todayWind } from '../core/weather.js';
import { solve } from '../core/solver.js';
import { centerOf } from '../core/course.js';
import { simulate, stateAt } from '../core/sim.js';
import { resolveTurn, turnLabel } from '../core/maneuver.js';
import { bearing, dist, twa, allureOf, tackOf, compassLong, NO_GO, TACKS, ALLURES } from '../core/angles.js';
import { WINDS, bestVmgAngles, speedKn, PINCH } from '../core/polar.js';
import { boatSVG, windArrowSVG } from '../ui/boat.js';
import { fieldBox, viewBoxOf, courseLayer, seaLayer, SEA_DEFS, fx, cpName, sideLabel, landLayer, OSM_CREDIT } from '../ui/map.js';
import { groundHit } from '../core/land.js';
import { xpBreakdown } from '../core/progress.js';
import { confetti, celebrate } from '../ui/fx.js';
import { sectorPath } from './theory.js';
import { store, starsFor, starsHTML } from '../store.js';
import { getBoat } from '../core/boats.js';

const DIFFS = [
  { d: 1, label: 'Facile', emoji: '🟢', text: 'Un ou deux bords, vent moyen.' },
  { d: 2, label: 'Moyen', emoji: '🟠', text: 'Bananes, triangles, trapèzes.' },
  { d: 3, label: 'Difficile', emoji: '🔴', text: 'Parcours libres, tous les vents.' },
];

const fmt = (s) => {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, '0')}`;
};

export function render(root, params, section) {
  if (section === 'defi') {
    const d = Math.max(1, Math.min(3, +params[0] || 1));
    const today = params[1] === 'today' || +params[1] === dailySeed();
    const seed = today ? dailySeed() : +params[1] || Math.floor(Math.random() * 1e6);
    if (!today) return playLevelScreen(root, { random: true, d, seed });
    // défi du jour : le vent réel prévu à 15 h devant La Baule (le même pour toute l'équipe)
    root.innerHTML = '<div class="card" style="max-width:420px;margin:40px auto;text-align:center"><h2>🌬️ Météo du jour…</h2><p class="muted">On regarde le vent prévu cet après-midi devant La Baule.</p></div>';
    let cleanup = null;
    let alive = true;
    todayWind().then((w) => {
      if (!alive) return;
      cleanup = playLevelScreen(root, { random: true, d, seed, wind: w ? { from: w.from, level: w.level } : null, forecast: w });
    });
    return () => {
      alive = false;
      if (cleanup) cleanup();
    };
  }
  const level = LEVELS.find((l) => l.id === params[0]);
  if (!level) {
    location.replace('#/naviguer');
    return null;
  }
  return playLevelScreen(root, { level });
}

// ------------------------------------------------------------------ Écran de jeu
function playLevelScreen(root, opts) {
  let level;
  let sol;
  let title;
  let storeId = null;
  let dailyId = null;
  let nextHref = null;
  if (opts.random) {
    const r = playableRandomLevel(opts.seed, opts.d, opts.wind ? { wind: opts.wind } : {});
    level = r.level;
    sol = r.sol;
    const daily = opts.seed === dailySeed();
    title = daily ? `Défi du jour · ${level.title}` : `Défi ${DIFFS[opts.d - 1].label} · ${level.title}`;
    dailyId = daily ? opts.seed : null;
    nextHref = `#/defi/${opts.d}/${Math.floor(Math.random() * 1e6)}`;
  } else {
    level = opts.level;
    sol = solve(level);
    title = `Mission ${level.num} · ${level.title}`;
    storeId = level.id;
    const i = LEVELS.indexOf(level);
    if (i < LEVELS.length - 1) nextHref = `#/mission/${LEVELS[i + 1].id}`;
  }
  const cps = sol.cps;
  const W = level.wind.from;
  const wid = level.wind.level;
  const wind = WINDS[wid];
  const optSim = sol.sim;

  root.className = 'full';
  root.innerHTML = `
  <div class="game">
    <div class="map-wrap" id="mapWrap">
      <svg class="map" id="map" preserveAspectRatio="xMidYMid meet">
        ${SEA_DEFS}
        <g id="lSea"></g><g id="lAssist"></g><g id="lCourse"></g><g id="lSolution"></g>
        <g id="lLegs"></g><g id="lWps"></g><g id="lWake"></g><g id="lBoats"></g>
      </svg>
      <div class="map-hud">
        <div class="wind-badge"><svg viewBox="-50 -50 100 100" style="color:#fff">${windArrowSVG(W, 34)}</svg><div><b>${level.wind.name || `Vent ${compassLong(W)}`}</b><small>Vent ${compassLong(W)} · ${wind.kts} nœuds · ${wind.label}</small></div></div>
        <div class="clock" id="clock"></div>
      </div>
      <div class="map-tools">
        <button class="btn small" id="tAssist" title="Afficher les aides (allures autour du dernier point)">🧭 <span class="lbl">Aides</span></button>
        <button class="btn small" id="tUndo" title="Annuler (Ctrl+Z)">↶ <span class="lbl">Annuler</span></button>
        <button class="btn small" id="tClear" title="Tout effacer">🗑 <span class="lbl">Effacer</span></button>
      </div>
      <div class="hint-bubble" id="hint"></div>
      <div class="toast-zone" id="toasts"></div>
      <div class="map-credit">${OSM_CREDIT}</div>
    </div>
    <aside class="panel">
      <div class="card brief">
        <div class="row" style="justify-content:space-between"><a class="btn small ghost" href="#/naviguer">← Carte de la baie</a>${storeId && store.level(storeId) ? `<span class="pill">Record ${store.level(storeId).score} %</span>` : dailyId && store.daily(dailyId) ? `<span class="pill">Record ${store.daily(dailyId)} %</span>` : ''}</div>
        <small class="muted">📍 ${level.place || 'Baie de La Baule'}${dist(level.start, { x: 0, y: 0 }) < 600 ? ' · départ de la base du CNBPP' : ''}</small>
        <h1 class="h2" style="margin-top:2px">${title}</h1>
        <p class="goal">${level.goal}</p>
        ${opts.forecast ? `<p class="callout" style="margin:6px 0">🌬️ <b>Vent réel prévu à 15 h</b> devant La Baule : ${opts.forecast.kn} nœuds (rafales ${opts.forecast.gust}). Prévision Open-Meteo.${opts.forecast.kn >= 15 || opts.forecast.gust >= 22 ? ' ⚠️ Sur l’eau, c’est du vent fort : sortie réservée aux navigateurs confirmés, demande toujours l’avis du moniteur.' : ''}</p>` : opts.random && opts.seed === dailySeed() ? '<p class="muted" style="margin:6px 0">Hors ligne : vent tiré de la climatologie de la baie pour ce mois (le parcours peut différer de celui des autres).</p>' : ''}
        <div class="check-head"><b>🎯 Objectifs du parcours</b><small class="muted">La coche verte s’allume quand ta route tracée passe bien par l’objectif.</small></div>
        <ul class="checklist" id="check"></ul>
        <details style="margin-top:10px"><summary><b>💡 Conseil</b></summary><p style="margin:6px 0 0">${level.tip}</p><p class="muted" style="margin:6px 0 0">${wind.hint}</p></details>
      </div>
      <div class="card actions-sticky">
        <p class="step-line" id="stepLine"></p>
        <div class="actions">
          <button class="btn primary" id="tPlay">▶ Lancer la course</button>
        </div>
        <div class="after-actions" id="after" hidden>
          <button class="btn small" id="tResult">📊 Mon résultat</button>
          <button class="btn small" id="tRestart">🔁 Recommencer</button>
          <a class="btn small sea" id="tNext" href="${nextHref || '#/naviguer'}">${!nextHref ? 'Carte de la baie' : storeId ? 'Mission suivante →' : 'Nouveau défi →'}</a>
        </div>
      </div>
      <div class="card">
        <div class="row" style="justify-content:space-between"><b>Ta route</b><span class="muted" id="legCount"></span></div>
        <div class="legs" id="legs" style="margin-top:8px"></div>
      </div>
      <div class="card">
        <b>Comment jouer</b>
        <ul class="help-list">
          <li><b>Touche la mer</b> pour poser le prochain point de route (garde le doigt appuyé pour l’ajuster).</li>
          <li><b>Fais glisser</b> un point pour le déplacer, <b>touche un trait</b> pour insérer un point.</li>
          <li><b>Touche un point</b> pour le supprimer ou choisir virement / empannage.</li>
          <li>Couleur des bords : <span class="pill port">bâbord amure</span> <span class="pill starboard">tribord amure</span></li>
          <li>🪨 Attention à la côte et aux rochers : une route qui les coupe fait <b>échouer</b> le bateau.</li>
          <li>Clavier : <span class="kbd">Espace</span> lancer, <span class="kbd">Ctrl+Z</span> annuler, <span class="kbd">Suppr</span> effacer le point.</li>
        </ul>
      </div>
    </aside>
  </div>`;

  const $ = (s) => root.querySelector(s);
  const svg = $('#map');
  const wrap = $('#mapWrap');
  // la base du club reste visible quand la mission en part
  const fromBase = dist(level.start, { x: 0, y: 0 }) < 600;
  const baseBox = fieldBox(level, fromBase ? [...optSim.path, { x: 0, y: 0 }] : optSim.path, 180, 900);
  let box = baseBox;

  let plan = { points: [{ ...level.start }], turns: {} };
  const undoStack = [];
  let selected = -1;
  let assist = level.assist;
  let mode = 'edit'; // edit | race
  let showSolution = false;
  let k = 1;
  let hover = null;
  let raf = 0;
  let popover = null;
  let lastResult = null;

  const snapshot = () => {
    undoStack.push(JSON.stringify(plan));
    if (undoStack.length > 100) undoStack.shift();
  };
  const restore = () => {
    if (!undoStack.length) return;
    plan = JSON.parse(undoStack.pop());
    selected = -1;
    redraw();
  };

  // Marges en pixels pour que le bandeau (vent, boutons) et la bulle d'aide ne cachent pas le parcours.
  const computeK = () => {
    const r = svg.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const top = 70;
    const bottom = 56;
    const k0 = Math.min(r.width / baseBox.w, (r.height - top - bottom) / baseBox.h);
    box = { ...baseBox, minY: baseBox.minY - bottom / k0, maxY: baseBox.maxY + top / k0 };
    box.h = box.maxY - box.minY;
    svg.setAttribute('viewBox', viewBoxOf(box));
    k = Math.min(r.width / box.w, r.height / box.h) || 1;
  };

  // ---------- dessin
  const drawStatic = () => {
    $('#lSea').innerHTML = seaLayer(box, k, W) + (level.bay ? landLayer(k) : '');
  };

  const legInfo = (p, q) => {
    const h = bearing(p, q);
    const a = twa(h, W);
    return { h, a, allure: allureOf(a), tack: tackOf(h, W), kn: speedKn(a, wid), len: dist(p, q) };
  };

  const turnAt = (i) => {
    const pts = plan.points;
    if (i <= 0 || i >= pts.length - 1) return null;
    const h1 = bearing(pts[i - 1], pts[i]);
    const h2 = bearing(pts[i], pts[i + 1]);
    const mode = plan.turns[i] === 'alt' ? 'alt' : 'auto';
    const info = resolveTurn(h1, h2, W, wid, mode);
    const other = resolveTurn(h1, h2, W, wid, mode === 'alt' ? 'auto' : 'alt');
    return { ...info, label: turnLabel(info), other: { ...other, label: turnLabel(other) }, mode };
  };

  const rocky = (p, q) => !!level.bay && groundHit(p, q, !!getBoat().keel) !== null;

  const labelPill = (p, q, text, color) => {
    const m = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
    return `<text class="leg-label" x="${fx(m.x)}" y="${fx(-m.y)}" font-size="${fx(12 / k)}" stroke-width="${fx(4 / k)}" style="fill:${color}">${text}</text>`;
  };

  const drawLegs = (live) => {
    const pts = plan.points;
    let s = '';
    for (let i = 0; i < pts.length - 1; i++) {
      const L = legInfo(pts[i], pts[i + 1]);
      const irons = Math.abs(L.a) < PINCH;
      const pinched = !irons && Math.abs(L.a) < NO_GO;
      const rock = rocky(pts[i], pts[i + 1]);
      const bad = irons || rock;
      const col = bad ? '#e5484d' : pinched ? 'var(--orange)' : L.tack === 'tribord' ? 'var(--starboard)' : 'var(--port)';
      s += `<line class="leg" x1="${fx(pts[i].x)}" y1="${fx(-pts[i].y)}" x2="${fx(pts[i + 1].x)}" y2="${fx(-pts[i + 1].y)}" stroke="${col}" stroke-width="${fx(4 / k)}" ${bad ? `style="stroke-dasharray:${fx(4 / k)} ${fx(6 / k)}"` : ''}/>`;
      if (mode === 'edit') s += `<line class="leg-hit" data-leg="${i}" x1="${fx(pts[i].x)}" y1="${fx(-pts[i].y)}" x2="${fx(pts[i + 1].x)}" y2="${fx(-pts[i + 1].y)}" stroke-width="${fx(18 / k)}"/>`;
      if (L.len * k > 60 || bad || pinched) s += labelPill(pts[i], pts[i + 1], irons ? '⛔ Vent debout' : rock ? '🪨 Échouage !' : pinched ? '⚠ Pincé : abats (tire la barre)' : L.allure.short, bad ? '#ffd1d1' : pinched ? '#ffd9b8' : '#fff');
    }
    // aperçu (survol souris)
    if (live && hover && mode === 'edit' && pts.length) {
      const p = pts[pts.length - 1];
      const L = legInfo(p, hover);
      const irons = Math.abs(L.a) < PINCH;
      const rock = rocky(p, hover);
      const col = irons || rock ? '#e5484d' : L.tack === 'tribord' ? 'var(--starboard)' : 'var(--port)';
      s += `<line class="leg preview" x1="${fx(p.x)}" y1="${fx(-p.y)}" x2="${fx(hover.x)}" y2="${fx(-hover.y)}" stroke="${col}" stroke-width="${fx(3 / k)}" style="stroke-dasharray:${fx(8 / k)} ${fx(8 / k)}"/>`;
      s += labelPill(p, hover, irons ? '⛔ Zone interdite' : rock ? '🪨 Rochers !' : `${L.allure.short} · ${TACKS[L.tack].short}`, irons || rock ? '#ffd1d1' : '#fff');
    }
    $('#lLegs').innerHTML = s;
  };

  const drawWps = () => {
    const pts = plan.points;
    let s = '';
    // départ
    const h0 = pts.length > 1 ? bearing(pts[0], pts[1]) : bearing(pts[0], centerOf(cps[0]));
    if (mode === 'edit') {
      s += `<g transform="translate(${fx(pts[0].x)},${fx(-pts[0].y)}) scale(${fx(0.36 / k)})">${boatSVG({ heading: h0, windFrom: W })}</g>`;
      s += `<text class="leg-label" x="${fx(pts[0].x)}" y="${fx(-pts[0].y + 30 / k)}" font-size="${fx(11 / k)}" stroke-width="${fx(3 / k)}">DÉPART</text>`;
    }
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i];
      const t = turnAt(i);
      s += `<circle class="wp${i === selected ? ' sel' : ''}" data-wp="${i}" cx="${fx(p.x)}" cy="${fx(-p.y)}" r="${fx(8 / k)}" stroke-width="${fx(2.5 / k)}"/>`;
      // zone de saisie plus large pour le doigt
      s += `<circle data-wp="${i}" cx="${fx(p.x)}" cy="${fx(-p.y)}" r="${fx(20 / k)}" fill="transparent" style="cursor:grab"/>`;
      if (t && t.label) {
        const c = t.tacks && !t.gybes ? '#3e63dd' : t.gybes && !t.tacks ? '#f5a623' : '#e5484d';
        const letter = t.tacks && t.gybes ? '⟳' : t.tacks ? 'V' : 'E';
        const ox = p.x + 15 / k;
        const oy = -p.y - 15 / k;
        s += `<circle data-wp="${i}" cx="${fx(ox)}" cy="${fx(oy)}" r="${fx(10 / k)}" fill="${c}" stroke="#fff" stroke-width="${fx(2 / k)}" style="cursor:pointer"/>`;
        s += `<text class="wp-man" x="${fx(ox)}" y="${fx(oy)}" font-size="${fx(11 / k)}" fill="#fff">${letter}</text>`;
      }
    }
    $('#lWps').innerHTML = s;
  };

  // Aides : anneau des allures et zone interdite autour du point « stylo ».
  const drawAssist = () => {
    if (!assist || mode !== 'edit') {
      $('#lAssist').innerHTML = '';
      return;
    }
    const pts = plan.points;
    const p = selected > 0 ? pts[selected] : pts[pts.length - 1];
    const r1 = 26 / k;
    const r2 = 60 / k;
    let s = `<g transform="translate(${fx(p.x)},${fx(-p.y)})">`;
    s += `<path class="nogo" d="${sectorPath(W - NO_GO, W + NO_GO, r2, 900 / k)}" stroke-width="${fx(1.5 / k)}" style="stroke-dasharray:${fx(6 / k)} ${fx(6 / k)}"/>`;
    s += '<g class="allure-ring">';
    for (const al of ALLURES) {
      for (const side of [1, -1]) {
        const a1 = W + side * al.min;
        const a2 = W + side * Math.min(al.max, 180);
        const [from, to] = side > 0 ? [a1, a2] : [a2, a1];
        s += `<path d="${sectorPath(from, to, r1, r2)}" fill="${al.color}"/>`;
      }
    }
    s += '</g></g>';
    $('#lAssist').innerHTML = s;
  };

  const drawCourse = (done, next) => {
    $('#lCourse').innerHTML = courseLayer(cps, k, { done, next });
  };

  const drawSolution = () => {
    if (!showSolution) {
      $('#lSolution').innerHTML = '';
      return;
    }
    const pts = optSim.path;
    let s = `<polyline class="solution" points="${pts.map((p) => `${fx(p.x)},${fx(-p.y)}`).join(' ')}" stroke-width="${fx(4 / k)}" style="stroke-dasharray:${fx(2 / k)} ${fx(9 / k)}"/>`;
    optSim.turns.forEach((t) => {
      if (!t.label) return;
      const letter = t.tacks && t.gybes ? '⟳' : t.tacks ? 'V' : 'E';
      s += `<circle cx="${fx(t.at.x)}" cy="${fx(-t.at.y)}" r="${fx(9 / k)}" fill="var(--gold)" stroke="#fff" stroke-width="${fx(2 / k)}"/>`;
      s += `<text class="wp-man" x="${fx(t.at.x)}" y="${fx(-t.at.y)}" font-size="${fx(10 / k)}" fill="#0d2536">${letter}</text>`;
    });
    $('#lSolution').innerHTML = s;
  };

  // Liste des bords + validation en direct.
  const drawPanel = () => {
    const pts = plan.points;
    const sim = simulate(level, cps, plan);
    const done = sim.completed;
    $('#check').innerHTML = cps
      .map((cp, i) => {
        const ok = i < done;
        const color = ok ? 'var(--ok)' : cp.type === 'mark' ? 'var(--orange)' : cp.type === 'gate' ? 'var(--gold)' : '#0d2536';
        return `<li class="${ok ? 'ok' : ''}"><span class="ico" style="background:${color}">${ok ? '✓' : cp.type === 'finish' ? '🏁' : i + 1}</span><span>${cpName(cp, i)} <span class="muted">— ${sideLabel(cp)}</span><small class="cp-state">${ok ? '✓ ta route y passe' : 'à atteindre'}</small></span></li>`;
      })
      .join('');
    let s = '';
    let tacks = 0;
    let gybes = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const L = legInfo(pts[i], pts[i + 1]);
      const irons = Math.abs(L.a) < PINCH;
      const rock = rocky(pts[i], pts[i + 1]);
      const t = turnAt(i + 1);
      if (t) {
        tacks += t.tacks;
        gybes += t.gybes;
      }
      s += `<div class="leg-row">
        <span class="sw" style="background:${irons || rock ? '#e5484d' : L.tack === 'tribord' ? 'var(--starboard)' : 'var(--port)'}"></span>
        <span><b>${i + 1}.</b> ${irons ? '<b style="color:var(--bad)">⛔ Vent debout</b>' : rock ? '<b style="color:var(--bad)">🪨 Coupe la côte !</b>' : `${L.allure.label} · ${TACKS[L.tack].short}`}</span>
        <span class="muted">${Math.round(L.len)} m</span>
        ${t && t.label ? `<span class="man">↪ ${t.label}${t.mode === 'alt' ? ' (sens choisi)' : ''}</span>` : ''}
      </div>`;
    }
    $('#legs').innerHTML = s || '<p class="muted" style="margin:0">Touche la mer pour poser ton premier point de route.</p>';
    $('#legCount').textContent = pts.length > 1 ? `${pts.length - 1} bord${pts.length > 2 ? 's' : ''} · ${tacks} V · ${gybes} E` : '';
    $('#tPlay').disabled = pts.length < 2;
    return { sim, done };
  };

  const hint = (text) => {
    const h = $('#hint');
    h.textContent = text || '';
    h.style.display = text ? 'block' : 'none';
  };

  const redraw = (live = false) => {
    const { sim, done } = drawPanel();
    drawCourse(done, done < cps.length ? done : -1);
    drawAssist();
    drawLegs(live);
    drawWps();
    drawSolution();
    if (mode === 'edit') {
      if (plan.points.length < 2) hint('Touche la mer pour tracer ta route 👆');
      else if (sim.reason === 'irons') hint('⛔ Un bord est dans la zone interdite : fais des bords de près !');
      else if (sim.reason === 'aground') hint('🪨 Ta route coupe la côte ou des rochers : contourne-les !');
      else if (!sim.ok) hint(`Prochain objectif : ${cpName(cps[done], done)} ${cps[done].type === 'mark' ? `(${sideLabel(cps[done])})` : ''}`);
      else hint('✅ Route complète ! Lance la course ▶');
      const step = $('#stepLine');
      step.className = `step-line${sim.ok ? ' ready' : ''}`;
      step.innerHTML = sim.ok
        ? '<b>② Ta route est complète</b> : lance la course pour voir ton temps !'
        : plan.points.length < 2
        ? '<b>① Trace ta route</b> sur la carte, du départ jusqu’à l’arrivée 🏁'
        : `<b>① Continue ta route</b> : prochain objectif, ${cpName(cps[done], done)}.`;
      $('#tPlay').classList.toggle('pulse', sim.ok);
    } else {
      $('#stepLine').innerHTML = '⛵ Course en cours…';
    }
  };

  const toast = (text, cls = '') => {
    const t = document.createElement('div');
    t.className = `toast ${cls}`;
    t.textContent = text;
    $('#toasts').appendChild(t);
    setTimeout(() => t.remove(), 2300);
  };

  // ---------- interactions
  const toWorld = (e) => {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    return { x: p.x, y: -p.y };
  };
  const toClient = (p) => {
    const pt = svg.createSVGPoint();
    pt.x = p.x;
    pt.y = -p.y;
    const c = pt.matrixTransform(svg.getScreenCTM());
    const r = wrap.getBoundingClientRect();
    return { x: c.x - r.left, y: c.y - r.top };
  };

  let drag = null; // { index, moved, startClient, created, before }

  const closePopover = () => {
    if (popover) popover.remove();
    popover = null;
  };

  const openPopover = (i) => {
    closePopover();
    selected = i;
    redraw();
    const t = turnAt(i);
    const c = toClient(plan.points[i]);
    const el = document.createElement('div');
    el.className = 'popover';
    let html = `<div class="title">Point ${i}</div>`;
    if (t) {
      if (t.label) html += `<div>↪ <b>${t.label}</b> <span class="muted">(${Math.round(t.deg)}°, ≈ ${Math.round(t.cost)} s)</span></div>`;
      else html += `<div class="muted">Simple changement de cap (≈ ${Math.round(t.cost)} s)</div>`;
      if (t.label || t.other.label) {
        const otherName = t.other.tacks && t.other.gybes ? 'un tour complet' : t.other.tacks ? (t.gybes ? 'un virement à la place de l’empannage' : 'un virement') : t.other.gybes ? 'un empannage' : 'un simple virage';
        if (t.label !== t.other.label) html += `<button class="btn small sea" data-act="alt">Faire plutôt ${otherName} (≈ ${Math.round(t.other.cost)} s)</button>`;
      }
    }
    html += `<div class="row"><button class="btn small port" data-act="del">🗑 Supprimer</button><button class="btn small" data-act="close">OK</button></div>`;
    el.innerHTML = html;
    wrap.appendChild(el);
    const r = wrap.getBoundingClientRect();
    const w = el.offsetWidth;
    const hgt = el.offsetHeight;
    el.style.left = `${Math.max(8, Math.min(r.width - w - 8, c.x - w / 2))}px`;
    el.style.top = `${c.y + 24 + hgt > r.height ? Math.max(8, c.y - hgt - 24) : c.y + 24}px`;
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.act === 'del') deletePoint(i);
      else if (b.dataset.act === 'alt') {
        snapshot();
        if (plan.turns[i] === 'alt') delete plan.turns[i];
        else plan.turns[i] = 'alt';
        openPopover(i);
        return;
      }
      selected = -1;
      closePopover();
      redraw();
    });
    popover = el;
  };

  const shiftTurns = (from, delta) => {
    const nt = {};
    Object.entries(plan.turns).forEach(([key, v]) => {
      const n = +key;
      if (n < from) nt[n] = v;
      else if (delta < 0 && n === from) return;
      else nt[n + delta] = v;
    });
    plan.turns = nt;
  };

  const deletePoint = (i) => {
    if (i <= 0) return;
    snapshot();
    plan.points.splice(i, 1);
    shiftTurns(i, -1);
    selected = -1;
    closePopover();
    redraw();
  };

  svg.addEventListener('pointerdown', (e) => {
    if (mode !== 'edit') return;
    if (e.button && e.button !== 0) return;
    closePopover();
    const target = e.target;
    const wp = target.closest('[data-wp]');
    const leg = target.closest('[data-leg]');
    const before = JSON.stringify(plan);
    const p = toWorld(e);
    if (wp) {
      drag = { index: +wp.dataset.wp, moved: false, sx: e.clientX, sy: e.clientY, created: false, before };
    } else if (leg) {
      const i = +leg.dataset.leg + 1;
      plan.points.splice(i, 0, p);
      shiftTurns(i, 1);
      drag = { index: i, moved: true, sx: e.clientX, sy: e.clientY, created: true, before };
    } else {
      plan.points.push(p);
      drag = { index: plan.points.length - 1, moved: true, sx: e.clientX, sy: e.clientY, created: true, before };
    }
    selected = -1;
    svg.setPointerCapture(e.pointerId);
    redraw();
    e.preventDefault();
  });

  svg.addEventListener('pointermove', (e) => {
    if (mode !== 'edit') return;
    if (drag) {
      if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 6) return;
      drag.moved = true;
      plan.points[drag.index] = toWorld(e);
      hover = null;
      redraw();
    } else if (e.pointerType === 'mouse') {
      hover = toWorld(e);
      drawLegs(true);
    }
  });

  const endDrag = () => {
    if (!drag) return;
    const d = drag;
    drag = null;
    if (!d.moved && !d.created) {
      openPopover(d.index);
      return;
    }
    undoStack.push(d.before);
    redraw();
  };
  svg.addEventListener('pointerup', endDrag);
  svg.addEventListener('pointercancel', endDrag);
  svg.addEventListener('pointerleave', () => {
    hover = null;
    if (mode === 'edit') drawLegs(false);
  });

  $('#tUndo').addEventListener('click', () => mode === 'edit' && restore());
  $('#tClear').addEventListener('click', () => {
    if (mode !== 'edit' || plan.points.length < 2) return;
    snapshot();
    plan = { points: [{ ...level.start }], turns: {} };
    selected = -1;
    closePopover();
    redraw();
  });
  const setAssistBtn = () => $('#tAssist').classList.toggle('on', assist);
  $('#tAssist').addEventListener('click', () => {
    assist = !assist;
    setAssistBtn();
    drawAssist();
  });
  setAssistBtn();

  // ---------- course
  const playRace = (racers, onDone) => {
    mode = 'race';
    closePopover();
    hint('');
    redraw();
    const longest = Math.max(...racers.map((r) => r.sim.time + 1));
    const duration = Math.max(7, Math.min(15, longest / 45)) * 1000;
    const speed = longest / duration; // secondes simulées par ms réelle
    const t0 = performance.now();
    const fired = racers.map(() => new Set());
    const clock = $('#clock');
    clock.classList.add('on');
    const scale = 0.4 / k;
    const step = (now) => {
      const t = (now - t0) * speed;
      let boats = '';
      let wake = '';
      let allDone = true;
      racers.forEach((r, ri) => {
        const tt = Math.min(t, r.sim.time + (r.sim.ok ? 0 : 3));
        if (t < r.sim.time + (r.sim.ok ? 0 : 3)) allDone = false;
        const st = stateAt(r.sim, tt);
        if (!st) return;
        const w = wakePoints(r.sim, tt, st.pos);
        wake += `<polyline class="wake" points="${w.map((p) => `${fx(p.x)},${fx(-p.y)}`).join(' ')}" stroke-width="${fx(2.5 / k)}" style="stroke:${r.wake}"/>`;
        boats += `<g transform="translate(${fx(st.pos.x)},${fx(-st.pos.y)}) scale(${fx(scale)})">${boatSVG({ heading: st.heading, windFrom: W, hull: r.hull, flap: st.stalled })}</g>`;
        if (r.events) {
          r.sim.events.forEach((ev, ei) => {
            if (ev.t <= tt && !fired[ri].has(ei)) {
              fired[ri].add(ei);
              if (ev.type === 'tack') toast('🔄 Virement de bord !');
              else if (ev.type === 'gybe') toast(ev.label === 'Empannage' ? '↪️ Empannage !' : `🔄 ${ev.label} !`, 'warn');
              else if (ev.type === 'cp') {
                toast(`✅ ${cpName(cps[ev.cp], ev.cp)} passée !`, 'good');
                drawCourse(ev.cp + 1, ev.cp + 1 < cps.length ? ev.cp + 1 : -1);
              } else if (ev.type === 'finish') toast('🏁 Arrivée !', 'good');
              else if (ev.type === 'irons') toast('⛔ Vent debout : le bateau s’arrête !', 'bad');
              else if (ev.type === 'aground') toast('🪨 Échouage sur les rochers !', 'bad');
              else if (ev.type === 'touch') toast('💥 Bouée touchée : pénalité d’un tour !', 'bad');
              else if (ev.type === 'unround') toast('↩️ Bouée mal contournée !', 'bad');
            }
          });
        }
      });
      $('#lWake').innerHTML = wake;
      $('#lBoats').innerHTML = boats;
      const main = racers[0];
      const st = stateAt(main.sim, Math.min(t, main.sim.time));
      clock.innerHTML = `${fmt(Math.min(t, main.sim.time))}<small>${st ? `${st.kn.toFixed(1)} nœuds` : ''}${racers.length > 1 ? ` · optimal ${fmt(Math.min(t, racers[1].sim.time))}` : ''}</small>`;
      if (allDone) {
        raf = 0;
        onDone();
        return;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  };

  const backToEdit = () => {
    cancelAnimationFrame(raf);
    mode = 'edit';
    $('#lBoats').innerHTML = '';
    $('#lWake').innerHTML = '';
    $('#clock').classList.remove('on');
    redraw();
  };

  const startRace = () => {
    if (mode !== 'edit' || plan.points.length < 2) return;
    // sur téléphone, le bouton est sous la carte : on remonte pour voir la course
    const top = wrap.getBoundingClientRect().top;
    if (top < 0 || top > window.innerHeight * 0.3) window.scrollTo({ top: window.scrollY + top - 70, behavior: 'smooth' });
    const sim = simulate(level, cps, plan);
    playRace([{ sim, wake: 'rgba(255,255,255,.6)', events: true }], () => showResult(sim));
  };
  $('#tPlay').addEventListener('click', startRace);

  const showDuel = () => {
    closeModal();
    showSolution = true;
    const sim = lastResult;
    playRace(
      [
        { sim, wake: 'rgba(255,255,255,.6)', events: false },
        { sim: optSim, hull: '#e0a400', wake: 'rgba(255,209,102,.8)', events: false },
      ],
      () => {
        hint('Route optimale en jaune. Modifie ta route et retente ta chance !');
        setTimeout(backToEdit, 1500);
      },
    );
  };

  // ---------- résultats
  let modal = null;
  const closeModal = () => {
    if (modal) modal.remove();
    modal = null;
  };

  const showResult = (sim) => {
    lastResult = sim;
    const playerTurns = sim.turns.reduce((a, t) => ({ v: a.v + t.tacks, e: a.e + t.gybes }), { v: 0, e: 0 });
    const optTurns = optSim.turns.reduce((a, t) => ({ v: a.v + t.tacks, e: a.e + t.gybes }), { v: 0, e: 0 });
    let html;
    if (sim.ok) {
      const raw = (optSim.time / sim.time) * 100;
      const score = Math.min(100, Math.round(raw >= 99.5 ? 100 : raw));
      const stars = starsFor(score);
      const xpBefore = xpBreakdown().total;
      const best = storeId ? store.saveLevel(storeId, score, sim.time) : dailyId ? store.daily(dailyId) < score : false;
      if (dailyId) store.saveDaily(dailyId, score);
      const xpAfter = xpBreakdown().total;
      const gained = xpAfter - xpBefore;
      if (stars >= 2 || (best && gained)) setTimeout(() => confetti(stars === 3 ? 220 : 120), 150);
      setTimeout(celebrate, 900);
      window.dispatchEvent(new CustomEvent('progress'));
      const tips = analyze(level, sim, optSim, playerTurns, optTurns);
      const color = score >= 97 ? 'var(--ok)' : score >= 90 ? 'var(--sky-2)' : score >= 80 ? '#ff8a3d' : 'var(--bad)';
      const C = 2 * Math.PI * 52;
      html = `
        <div class="result-top">
          <svg class="score-ring" viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" fill="none" stroke="var(--line)" stroke-width="12"/>
            <circle cx="60" cy="60" r="52" fill="none" stroke="${color}" stroke-width="12" stroke-linecap="round" stroke-dasharray="${fx((C * score) / 100)} ${fx(C)}" transform="rotate(-90 60 60)"/>
            <text x="60" y="66" text-anchor="middle" font-size="30" fill="var(--ink)">${score}%</text></svg>
          <div>
            <div class="result-stars">${starsHTML(stars)}</div>
            <h2 style="margin:4px 0">${score >= 99 ? 'Route parfaite ! 🏆' : score >= 97 ? 'Excellent ! ⛵' : score >= 90 ? 'Très bien !' : score >= 80 ? 'Pas mal !' : 'Il y a mieux à faire…'}</h2>
            ${best && (storeId || dailyId) ? '<span class="pill" style="background:var(--navy);color:#fff;border:0">Nouveau record</span>' : ''}
            ${gained ? `<span class="pill xp-pill">+${gained} XP</span>` : ''}
          </div>
        </div>
        <div class="compare">
          <div class="box"><small>Ton temps</small><b>${fmt(sim.time)}</b><div class="muted">${playerTurns.v} virement${playerTurns.v > 1 ? 's' : ''} · ${playerTurns.e} empannage${playerTurns.e > 1 ? 's' : ''}</div></div>
          <div class="box"><small>Route optimale</small><b>${fmt(optSim.time)}</b><div class="muted">${optTurns.v} virement${optTurns.v > 1 ? 's' : ''} · ${optTurns.e} empannage${optTurns.e > 1 ? 's' : ''}</div></div>
        </div>
        <ul class="tips">${tips.map((t) => `<li>${t}</li>`).join('')}</ul>
        <div class="actions">
          ${nextHref ? `<a class="btn primary" href="${nextHref}">${storeId ? 'Mission suivante →' : 'Nouveau défi →'}</a>` : '<a class="btn primary" href="#/naviguer">Carte de la baie</a>'}
          <button class="btn" data-act="duel">👀 Voir la route optimale (duel)</button>
          <button class="btn" data-act="edit">✏️ Améliorer ma route</button>
          <button class="btn" data-act="clear">🔁 Recommencer à zéro</button>
        </div>`;
    } else {
      const why = sim.reason === 'aground'
        ? `Le bord n°${sim.failLeg + 1} coupe la côte ou des rochers : <b>échouage</b> ! Regarde bien la carte (pointe de Penchâteau, îlots, plage) et garde de l’eau sous la coque.`
        : sim.reason === 'irons'
        ? `Le bord n°${sim.failLeg + 1} part dans la <b>zone interdite</b> (à moins de ${PINCH}° du vent) : le bateau s’arrête, voiles en drapeau. Pour remonter au vent, trace des <b>bords de près</b> en zigzag, à environ ${Math.round(bestVmgAngles(wid).up.angle)}° du vent pour ${getBoat().article}.`
        : sim.reason === 'empty' ? 'Pose au moins un point de route.'
        : `Il manque : <b>${cpName(cps[sim.completed], sim.completed)}</b> (${sideLabel(cps[sim.completed])}). ${cps[sim.completed].type === 'mark' ? 'Vérifie le sens de la flèche autour de la bouée : ta route doit en faire le tour dans ce sens.' : 'Ta route doit passer entre les deux bouées.'}`;
      html = `
        <h2>${sim.reason === 'irons' ? '⛔ Vent debout !' : sim.reason === 'aground' ? '🪨 Échouage !' : '🧭 Parcours incomplet'}</h2>
        <p>${why}</p>
        <div class="actions">
          <button class="btn primary" data-act="edit">✏️ Corriger ma route</button>
          <button class="btn" data-act="clear">🔁 Recommencer</button>
          <button class="btn" data-act="peek">💡 Voir la solution</button>
          <a class="btn" href="#/apprendre/${level.lesson || 'allures'}">📖 Revoir la leçon</a>
        </div>`;
    }
    lastHtml = html;
    openModal(html);
    const after = $('#after');
    after.hidden = false;
    $('#tNext').hidden = !sim.ok;
  };

  // Fenêtre de résultat (rouverte telle quelle par « Mon résultat »).
  let lastHtml = '';
  const openModal = (html) => {
    closeModal();
    const back = document.createElement('div');
    back.className = 'modal-back';
    back.innerHTML = `<div class="modal">${html}</div>`;
    back.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (e.target === back) {
        closeModal();
        backToEdit();
        return;
      }
      if (!b) return;
      const act = b.dataset.act;
      if (act === 'duel') showDuel();
      else if (act === 'edit') {
        closeModal();
        backToEdit();
      } else if (act === 'clear') {
        closeModal();
        snapshot();
        plan = { points: [{ ...level.start }], turns: {} };
        backToEdit();
      } else if (act === 'peek') {
        closeModal();
        showSolution = true;
        backToEdit();
        hint('Route optimale en jaune pointillé. À toi de jouer !');
      }
    });
    document.body.appendChild(back);
    modal = back;
  };
  $('#tResult').addEventListener('click', () => lastHtml && openModal(lastHtml));
  $('#tRestart').addEventListener('click', () => {
    if (mode !== 'edit') return;
    snapshot();
    plan = { points: [{ ...level.start }], turns: {} };
    backToEdit();
  });

  // ---------- clavier
  const onKey = (e) => {
    if (document.querySelector('.ceremony-back')) return; // la cérémonie de grade est au-dessus
    if (modal) {
      if (e.key === 'Escape') {
        closeModal();
        backToEdit();
      }
      return;
    }
    if (mode !== 'edit') return;
    if (e.key === ' ' && e.target === document.body) {
      e.preventDefault();
      startRace();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      restore();
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      if (e.target !== document.body) return;
      e.preventDefault();
      deletePoint(selected > 0 ? selected : plan.points.length - 1);
    } else if (e.key === 'Escape') {
      selected = -1;
      closePopover();
      redraw();
    }
  };
  window.addEventListener('keydown', onKey);

  // ---------- mise en page
  const layout = () => {
    computeK();
    drawStatic();
    if (mode === 'edit') redraw();
  };
  const ro = new ResizeObserver(() => {
    closePopover();
    layout();
  });
  ro.observe(svg);
  layout();

  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    window.removeEventListener('keydown', onKey);
    closeModal();
  };
}

// Sillage exact jusqu'à l'instant t (indépendant de la fréquence d'images).
function wakePoints(sim, t, pos) {
  const pts = [sim.path[0]];
  for (const ph of sim.timeline) {
    if (ph.type !== 'sail') continue;
    if (ph.t1 <= t) pts.push(ph.p1);
    else break;
  }
  pts.push(pos);
  return pts;
}

// ------------------------------------------------------------------ Conseils personnalisés
export function analyze(level, sim, opt, pt, ot) {
  const tips = [];
  const W = level.wind.from;
  const wid = level.wind.level;
  const wind = WINDS[wid];
  const { up, down } = bestVmgAngles(wid);
  const ratio = opt.time / sim.time;
  if (ratio >= 0.99) tips.push('🏆 Ta route est quasiment identique à la route optimale. Bravo !');

  const pm = pt.v + pt.e;
  const om = ot.v + ot.e;
  if (pm > om + 1) tips.push(`🔄 Tu as fait <b>${pm} manœuvres</b>, la route optimale seulement <b>${om}</b>. Chaque virement coûte ≈ ${wind.tack} s et chaque empannage ≈ ${wind.gybe} s : allonge tes bords.`);

  // angle de remontée
  const upLegs = sim.legs.filter((l) => Math.abs(l.twa) < 80 && l.length > 40);
  if (upLegs.length) {
    const tot = upLegs.reduce((s, l) => s + l.length, 0);
    const avg = upLegs.reduce((s, l) => s + Math.abs(l.twa) * l.length, 0) / tot;
    const needUp = opt.legs.some((l) => Math.abs(l.twa) < 60);
    if (needUp && avg > up.angle + 10) tips.push(`📐 Au près, tu naviguais en moyenne à <b>${Math.round(avg)}°</b> du vent. Serre davantage, vers <b>${Math.round(up.angle)}°</b> : tu remonteras plus vite vers la bouée.`);
  }

  // portant
  const runLegs = sim.legs.filter((l) => Math.abs(l.twa) > 165 && l.length > 60);
  const optRun = opt.legs.filter((l) => Math.abs(l.twa) > 130);
  if (runLegs.length && optRun.length && down.angle < 162 && optRun.every((l) => Math.abs(l.twa) < 168)) {
    tips.push(`🌬️ ${getBoat().downwindTip(Math.round(down.angle))}`);
  }

  // route directe ignorée
  const optDirect = opt.legs.filter((l) => Math.abs(l.twa) >= 60 && Math.abs(l.twa) <= 140).length;
  const zig = sim.legs.filter((l) => Math.abs(l.twa) >= 60 && Math.abs(l.twa) <= 140).length;
  if (zig > optDirect + 2) tips.push('➡️ Quand la destination n’est pas dans la zone interdite ni plein vent arrière, la <b>ligne droite</b> est le plus court chemin.');

  if (sim.penalties) tips.push(`💥 Tu as touché une bouée : <b>pénalité d’un tour</b> (≈ ${wind.tack + wind.gybe + 4} s). Garde quelques mètres de marge.`);

  // virement lof pour lof
  const optLof = opt.turns.some((t) => t.mode === 'alt' && t.tacks);
  const myGybes = sim.turns.some((t) => t.gybes && t.mode !== 'alt');
  if (optLof && myGybes && wid === 'strong') tips.push('🌊 Par vent fort, la route optimale préfère <b>virer de bord au lieu d’empanner</b>. Touche le point de manœuvre pour changer de sens.');

  const lenP = sim.path.reduce((s, p, i, a) => (i ? s + dist(a[i - 1], p) : 0), 0);
  const lenO = opt.path.reduce((s, p, i, a) => (i ? s + dist(a[i - 1], p) : 0), 0);
  if (lenP > lenO * 1.15 && tips.length < 2) tips.push(`📏 Ta route fait ${Math.round(lenP)} m contre ${Math.round(lenO)} m pour la route optimale. Coupe au plus court quand l’allure le permet.`);

  if (!tips.length) tips.push(`👍 Belle route ! Il reste ${Math.round(sim.time - opt.time)} s à gagner : regarde la route optimale pour voir où.`);
  return tips;
}
