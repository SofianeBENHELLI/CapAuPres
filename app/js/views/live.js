// « À la barre » : navigation en temps réel, seul ou en régate contre une flotte.
//   #/barre/:mission     #/regate/:mission
import { LEVELS } from '../core/levels.js';
import { solve } from '../core/solver.js';
import { Race, idealBoom } from '../core/live.js';
import { twa, tackOf, allureOf, compassLong, NO_GO, TACKS, dist, bearing, norm180, vec } from '../core/angles.js';
import { WINDS, speedKnTws, KN } from '../core/polar.js';
import { boatSVG, windArrowSVG } from '../ui/boat.js';
import { fieldBox, courseLayer, seaLayer, SEA_DEFS, fx, cpName, sideLabel, landLayer, OSM_CREDIT } from '../ui/map.js';
import { centerOf } from '../core/course.js';
import { store, starsFor, starsHTML } from '../store.js';
import { xpBreakdown } from '../core/progress.js';
import { confetti, celebrate } from '../ui/fx.js';
import { RULE_TEXT, ZONE_LENGTHS } from '../core/rules.js';
import { getBoat } from '../core/boats.js';

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

export function render(root, params, section) {
  const level = LEVELS.find((l) => l.id === params[0]);
  if (!level) {
    location.replace('#/naviguer');
    return null;
  }
  const regatta = section === 'regate';
  const sol = solve(level);
  const cps = sol.cps;
  const optTime = sol.sim.time;
  const box = fieldBox(level, sol.sim.path, 250, 1200);
  // vitesse de lecture : la mission dure ≈ 3 minutes réelles
  let timeScale = clamp(Math.round(optTime / 180), 3, 30);
  const seed = Math.floor(Math.random() * 1e6);
  let race = new Race(level, cps, { seed, fleet: regatta ? 5 : 0, solution: sol.sim, box, auto: store.pref.manualTrim !== true });

  root.className = 'full';
  root.innerHTML = `
  <div class="live">
    <div class="map-wrap live-map" id="lmap">
      <svg class="map" id="lsvg" preserveAspectRatio="xMidYMid slice">
        ${SEA_DEFS}
        <g id="lStatic"></g><g id="lStreaks"></g><g id="lGusts"></g><g id="lCourse"></g><g id="lGuide"></g>
        <g id="lTracks"></g><g id="lBoats"></g>
      </svg>
      <div class="map-hud">
        <div class="wind-badge"><svg viewBox="-50 -50 100 100" style="color:#fff"><g id="windArrow"></g></svg><div><b id="windTxt"></b><small id="windSub"></small></div></div>
        <div class="clock on" id="lclock"></div>
      </div>
      <div class="map-tools">
        <button class="btn small" id="bPause" aria-label="Pause">⏸</button>
        <button class="btn small" id="bSpeed" aria-label="Vitesse de lecture">×${timeScale}</button>
        <button class="btn small" id="bView" aria-label="Voir tout le parcours">🗺️<span class="lbl"> Parcours</span></button>
      </div>
      <div class="zoom-tools">
        <button class="btn small" id="bZoomIn" aria-label="Zoomer">+</button>
        <button class="btn small" id="bZoomOut" aria-label="Dézoomer">−</button>
      </div>
      <svg class="mini-map" id="lmini" aria-label="Tout le parcours (touche pour l’afficher en grand)"><g id="miniCourse"></g><circle id="miniMe" r="0"/><rect id="miniView" class="mini-view"/></svg>
      <div class="course-intro" id="lintro">
        <b>Voici ton parcours</b>
        <p>Repère les marques dans l’ordre et la ligne d’arrivée 🏁. Pendant la course, zoome avec <b>+</b> / <b>−</b> (ou la molette, ou deux doigts) et touche la mini-carte pour revoir tout le parcours.</p>
        <button class="btn" id="bGo">Je suis prêt ▶</button>
      </div>
      <div class="toast-zone" id="ltoasts"></div>
      <div class="countdown" id="countdown"></div>
      <div class="helm">
        <button class="helm-btn" id="hLeft" aria-label="Barrer à bâbord (gauche)">◀<small>bâbord</small></button>
        <div class="helm-mid">
          <div class="gauge-speed"><b id="gSpeed">0.0</b><small>nœuds</small></div>
          <div class="allure-now" id="gAllure"></div>
        </div>
        <button class="helm-btn" id="hRight" aria-label="Barrer à tribord (droite)">▶<small>tribord</small></button>
      </div>
      <div class="map-credit">${OSM_CREDIT}</div>
    </div>
    <aside class="panel live-panel">
      <div class="card brief">
        <div class="row" style="justify-content:space-between"><a class="btn small ghost" href="#/naviguer">← Carte</a><span class="pill">${regatta ? '🏁 Régate · 6 bateaux' : '☸️ À la barre'}</span></div>
        <h1 class="h2" style="margin:6px 0 2px">Mission ${level.num} · ${level.title}</h1>
        <p class="muted" style="margin:0">${level.goal}</p>
        <ul class="checklist" id="lcheck" style="margin-top:8px"></ul>
      </div>
      <div class="card">
        <div class="live-stats">
          <div><small>Cap</small><b id="sHead"></b></div>
          <div><small>Angle au vent</small><b id="sTwa"></b></div>
          <div><small>Amure</small><b id="sTack"></b></div>
          <div><small>Rendement</small><b id="sEff"></b></div>
        </div>
        <label class="trim-toggle"><input type="checkbox" id="manual" ${store.pref.manualTrim ? 'checked' : ''}/> Je règle l’écoute moi-même (expert)</label>
        <div id="sheetBox" ${store.pref.manualTrim ? '' : 'hidden'}>
          <div class="row" style="justify-content:space-between"><small>Choquer</small><b id="sheetTxt"></b><small>Border</small></div>
          <input type="range" id="sheet" min="2" max="88" value="20" aria-label="Écoute : ouverture de la voile" style="width:100%;direction:rtl"/>
          <div class="telltale-box" id="tellBox"></div>
        </div>
      </div>
      ${regatta ? '<div class="card"><b>Classement</b><ol class="fleet-rank" id="rank"></ol><p class="muted" style="font-size:12px;margin:6px 0 0">Règles de priorité appliquées : tribord prioritaire, bateau sous le vent prioritaire, rattrapage. Un contact fautif = deux tours de pénalité.</p></div>' : ''}
      <div class="card">
        <b>Comment barrer</b>
        <ul class="help-list">
          <li>Maintiens <b>◀</b> ou <b>▶</b> (ou les flèches du clavier) pour tourner.</li>
          <li>Observe le vent : il <b>tourne</b> et des <b>risées</b> (taches sombres) passent : profite des adonnantes !</li>
          <li>La ligne pointillée montre la prochaine marque. Garde de l’eau autour des rochers.</li>
          <li>Zoome avec <b>+</b> / <b>−</b>, la molette ou deux doigts. <b>🗺️ Parcours</b> ou la mini-carte montrent toute la course.</li>
          <li><span class="kbd">Espace</span> pause · <span class="kbd">↑</span>/<span class="kbd">↓</span> border / choquer (mode expert).</li>
        </ul>
      </div>
    </aside>
  </div>`;

  const $ = (s) => root.querySelector(s);
  const svg = $('#lsvg');
  const wrap = $('#lmap');
  let k = 1;
  let follow = false; // on commence par montrer tout le parcours
  let intro = true;
  let viewW = 650; // largeur de la vue qui suit le bateau (m)
  const VIEW_MIN = 200;
  const viewMax = () => Math.max(box.w, box.h) * 1.1;
  let staticQueued = false;
  const queueStatic = () => {
    if (staticQueued) return;
    staticQueued = true;
    requestAnimationFrame(() => {
      staticQueued = false;
      drawStatic();
    });
  };
  const syncViewBtn = () => {
    $('#bView').innerHTML = follow ? '🗺️<span class="lbl"> Parcours</span>' : '🎯<span class="lbl"> Mon bateau</span>';
    $('#bView').setAttribute('aria-label', follow ? 'Voir tout le parcours' : 'Revenir sur mon bateau');
    $('#lmini').toggleAttribute('hidden', !follow || intro);
  };
  const setFollow = (on) => {
    follow = on;
    syncViewBtn();
    queueStatic();
  };
  // zoom continu : depuis la vue d'ensemble, un zoom repart de la largeur du parcours
  const zoomBy = (f) => {
    if (intro) return;
    if (!follow) {
      viewW = viewMax();
      follow = true;
      syncViewBtn();
    }
    viewW = clamp(viewW * f, VIEW_MIN, viewMax());
    queueStatic();
  };
  let paused = true;
  let raf = 0;
  let last = 0;
  let steer = 0;
  // une tape brève tourne quand même un peu (≈ 5°), même si la touche est relâchée avant l'image suivante
  let pulse = { dir: 0, until: 0 };
  const tap = (dir) => {
    const now = performance.now();
    const from = pulse.dir === dir ? Math.max(now, pulse.until) : now;
    pulse = { dir, until: Math.min(from + 120, now + 1000) };
  };
  let ended = false;
  const seen = new Set();

  const toast = (text, cls = '') => {
    const t = document.createElement('div');
    t.className = `toast ${cls}`;
    t.textContent = text;
    $('#ltoasts').appendChild(t);
    setTimeout(() => t.remove(), 2300);
  };

  // ---------- couches fixes (terre, parcours), recalculées si l'échelle change
  const drawStatic = () => {
    const r = svg.getBoundingClientRect();
    const w = follow ? viewW : box.w;
    const h = follow ? viewW * (r.height / r.width) : box.h;
    k = Math.min(r.width / w, r.height / h) || 1;
    $('#lStatic').innerHTML = seaLayer({ ...box, minX: box.minX - 3000, maxX: box.maxX + 3000, minY: box.minY - 3000, maxY: box.maxY + 3000, w: box.w + 6000, h: box.h + 6000 }, k, 0, { streaks: false }) + (level.bay ? landLayer(k) : '');
    // traînées de vent (orientées à chaque image)
    let lines = '';
    let s = 11;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const R = Math.max(box.w, box.h);
    for (let i = 0; i < 90; i++) {
      const x = -R + rnd() * 2 * R;
      const y = -R + rnd() * 2 * R;
      lines += `<line class="streak" x1="${fx(x)}" y1="${fx(y)}" x2="${fx(x)}" y2="${fx(y + 30 / k)}" stroke-width="${fx(1.6 / k)}" style="animation-delay:${fx(-rnd() * 3.2)}s"/>`;
    }
    $('#lStreaks').innerHTML = `<g id="streakRot">${lines}</g>`;
    drawCourse();
  };
  const drawCourse = () => {
    const done = race.player.tracker.target;
    // en régate : zone de la règle 18 (3 longueurs de coque) autour des marques à contourner
    const zones = regatta
      ? cps.map((cp, i) => (cp.type === 'mark' && i >= done ? `<circle class="mark-zone" cx="${fx(cp.x)}" cy="${fx(-cp.y)}" r="${fx(ZONE_LENGTHS * race.player.len)}" stroke-width="${fx(1.2 / k)}" stroke-dasharray="${fx(4 / k)} ${fx(4 / k)}"/>` : '')).join('')
      : '';
    $('#lCourse').innerHTML = zones + courseLayer(cps, k, { done, next: done < cps.length ? done : -1 });
    drawMini();
    $('#lcheck').innerHTML = cps.map((cp, i) => `<li><span class="ico" style="background:${i < done ? 'var(--ok)' : cp.type === 'mark' ? 'var(--orange)' : cp.type === 'gate' ? 'var(--gold)' : '#0d2536'}">${i < done ? '✓' : cp.type === 'finish' ? '🏁' : i + 1}</span><span>${cpName(cp, i)} <span class="muted">— ${sideLabel(cp)}</span></span></li>`).join('');
  };

  // ---------- mini-carte : tout le parcours, avec le bateau et la zone affichée
  const drawMini = () => {
    const mini = $('#lmini');
    const r = mini.getBoundingClientRect();
    if (!r.width) return;
    const km = Math.min(r.width / box.w, r.height / box.h) || 1;
    mini.setAttribute('viewBox', `${fx(box.minX)} ${fx(-box.maxY)} ${fx(box.w)} ${fx(box.h)}`);
    const done = race.player.tracker.target;
    $('#miniCourse').innerHTML = (level.bay ? landLayer(km, { labels: false, marks: false }) : '') + courseLayer(cps, km, { done, next: done < cps.length ? done : -1, labels: false });
    $('#miniMe').setAttribute('r', fx(5 / km));
    $('#miniView').setAttribute('stroke-width', fx(1.5 / km));
  };
  const drawMiniDynamic = () => {
    if (!follow) return;
    const p = race.player;
    const me = $('#miniMe');
    me.setAttribute('cx', fx(p.x));
    me.setAttribute('cy', fx(-p.y));
    const r = svg.getBoundingClientRect();
    const h = viewW * (r.height / r.width);
    const v = $('#miniView');
    v.setAttribute('x', fx(p.x - viewW / 2));
    v.setAttribute('y', fx(-p.y - h / 2));
    v.setAttribute('width', fx(viewW));
    v.setAttribute('height', fx(h));
  };

  const setView = () => {
    const r = svg.getBoundingClientRect();
    const p = race.player;
    if (follow) {
      const h = viewW * (r.height / r.width);
      // le bateau est un peu en dessous du centre pour voir loin devant
      svg.setAttribute('viewBox', `${fx(p.x - viewW / 2)} ${fx(-p.y - h / 2)} ${fx(viewW)} ${fx(h)}`);
    } else {
      // vue d'ensemble : tout le parcours tient dans l'écran (marge pour les boutons et l'aperçu)
      const m = Math.max(box.w, box.h) * 0.08;
      svg.setAttribute('viewBox', `${fx(box.minX - m)} ${fx(-box.maxY - m)} ${fx(box.w + 2 * m)} ${fx(box.h + 2 * m)}`);
    }
    svg.setAttribute('preserveAspectRatio', follow ? 'xMidYMid slice' : 'xMidYMid meet');
  };

  // ---------- image par image
  const drawDynamic = () => {
    const t = race.t;
    const W = race.wind.dirAt(t);
    const p = race.player;
    const w = race.wind.at(t, p);
    $('#streakRot').setAttribute('transform', `translate(${fx(p.x)},${fx(-p.y)}) rotate(${fx(W)})`);
    $('#windArrow').innerHTML = windArrowSVG(W, 34);
    $('#windTxt').textContent = `Vent ${compassLong(W)} · ${w.kts.toFixed(0)} nd`;
    const shift = norm180(W - level.wind.from);
    $('#windSub').textContent = Math.abs(shift) < 2 ? 'vent dans l’axe' : `a tourné de ${Math.abs(Math.round(shift))}° vers ${shift > 0 ? 'la droite' : 'la gauche'}`;
    // risées
    $('#lGusts').innerHTML = race.wind.gusts.map((g) => {
      const age = (t - g.born) / g.life;
      const op = Math.max(0, Math.sin(Math.PI * Math.min(1, Math.max(0, age)))) * g.str * 0.9;
      return `<circle cx="${fx(g.x)}" cy="${fx(-g.y)}" r="${fx(g.r)}" class="gust" style="opacity:${fx(op)}"/>`;
    }).join('');
    drawMiniDynamic();
    // guide vers la prochaine marque
    const tg = p.tracker.target;
    if (tg < cps.length) {
      const c = cps[tg].type === 'mark' ? cps[tg] : centerOf(cps[tg]);
      $('#lGuide').innerHTML = `<line x1="${fx(p.x)}" y1="${fx(-p.y)}" x2="${fx(c.x)}" y2="${fx(-c.y)}" class="guide" stroke-width="${fx(2 / k)}" style="stroke-dasharray:${fx(6 / k)} ${fx(8 / k)}"/>`;
    } else $('#lGuide').innerHTML = '';
    // sillages et bateaux
    $('#lTracks').innerHTML = race.boats.map((b) => `<polyline points="${[...b.track.slice(-160), b].map((q) => `${fx(q.x)},${fx(-q.y)}`).join(' ')}" class="wake" stroke-width="${fx(2 / k)}" style="stroke:${b === p ? 'rgba(255,255,255,.75)' : 'rgba(255,255,255,.3)'}"/>`).join('');
    const scale = Math.max(b0len() * 1.9, 30 / k) / 100;
    $('#lBoats').innerHTML = race.boats.map((b) => {
      const bw = race.wind.dirAt(t);
      const g = `<g transform="translate(${fx(b.x)},${fx(-b.y)}) scale(${fx(scale)})">${boatSVG({ heading: b.heading, windFrom: bw, hull: b === p ? undefined : b.color, boom: b.auto ? undefined : b.boom, flap: Math.abs(twa(b.heading, bw)) < NO_GO })}</g>`;
      const label = b === p ? '' : `<text class="leg-label" x="${fx(b.x)}" y="${fx(-b.y - 26 / k)}" font-size="${fx(11 / k)}" stroke-width="${fx(3 / k)}">${b.name}${b.penaltyLeft > 0 ? ' ⟳' : ''}</text>`;
      return g + label;
    }).join('');
    // instruments
    const a = twa(p.heading, w.from);
    const al = allureOf(a);
    const tk = TACKS[tackOf(p.heading, w.from)];
    const target = speedKnTws(a, w.kts) * p.skill;
    $('#gSpeed').textContent = (p.speed / KN).toFixed(1);
    $('#gAllure').innerHTML = Math.abs(a) < NO_GO ? '<span style="color:#ffb3b3">⛔ Vent debout !</span>' : `<span style="color:${al.color}">${al.short}</span> · <span style="color:${tackOf(p.heading, w.from) === 'tribord' ? '#7ee2a8' : '#ffb3b3'}">${tk.short}</span>`;
    $('#sHead').textContent = `${Math.round(((p.heading % 360) + 360) % 360)}°`;
    $('#sTwa').textContent = `${Math.round(Math.abs(a))}°`;
    $('#sTack').innerHTML = Math.abs(a) < NO_GO ? '—' : `<span class="tagc" style="--c:${tk.color}">${tk.short}</span>`;
    $('#sEff').textContent = target > 0.05 ? `${Math.round(Math.min(1.2, p.speed / KN / target) * 100)} %` : '—';
    if (!p.auto) {
      const ideal = idealBoom(Math.abs(a));
      const err = p.boom - ideal;
      const st = Math.abs(a) < NO_GO ? 'Vent debout' : err > 8 ? '↗ trop choqué : borde' : err < -8 ? '↙ trop bordé : choque' : '✓ bien réglé';
      $('#sheetTxt').textContent = `${Math.round(p.boom)}°`;
      $('#tellBox').innerHTML = `<span class="tt ${err > 8 ? 'bad' : ''}">penon au vent</span><b>${st}</b><span class="tt lee ${err < -8 ? 'bad' : ''}">penon sous le vent</span>`;
    }
    $('#lclock').innerHTML = `${fmt(t)}<small>${(p.speed / KN).toFixed(1)} nœuds · ×${timeScale}</small>`;
    if (regatta) {
      const rk = race.ranking();
      $('#rank').innerHTML = rk.map((b) => `<li class="${b === p ? 'me' : ''}"><span class="dot" style="background:${b === p ? '#173d61' : b.color}"></span>${b.name}${b.finished ? ` · ${fmt(b.finishTime)}` : ` · marque ${Math.min(b.tracker.target + 1, cps.length)}`}${b.penaltyLeft > 0 ? ' ⟳' : ''}</li>`).join('');
    }
    setView();
  };
  const b0len = () => race.player.len;

  // ---------- évènements
  const handleEvents = () => {
    race.events.forEach((ev, i) => {
      if (seen.has(i)) return;
      seen.add(i);
      const mine = ev.boat === 'me';
      if (!mine && ev.type !== 'foul') return;
      if (ev.type === 'tack') toast('🔄 Virement !');
      else if (ev.type === 'gybe') toast('↪️ Empannage !', 'warn');
      else if (ev.type === 'cp') {
        toast(`✅ ${cpName(cps[ev.cp], ev.cp)} passée !`, 'good');
        drawCourse();
      } else if (ev.type === 'unround') {
        toast('↩️ Marque mal contournée !', 'bad');
        drawCourse();
      } else if (ev.type === 'touch') toast('💥 Bouée touchée !', 'bad');
      else if (ev.type === 'aground') toast('🪨 Échouage ! 15 s pour repartir', 'bad');
      else if (ev.type === 'foul') {
        if (mine) toast(`⚠️ Faute (règle ${ev.rule}) : deux tours de pénalité !`, 'bad');
        else toast(`${race.boats.find((b) => b.id === ev.boat)?.name} fait ses tours de pénalité`, '');
      } else if (ev.type === 'finish') {
        drawCourse();
        finish();
      }
    });
  };

  // ---------- boucle
  // à la barre, on tourne à vitesse « humaine » (≈ 45°/s réelles), quelle que soit l'accélération du temps
  const HELM_DEG_PER_REAL_S = 45;
  const loop = (now) => {
    const real = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    if (!paused && !ended) {
      const p = race.player;
      p.turnRate = HELM_DEG_PER_REAL_S / timeScale;
      p.rudder = steer || (now < pulse.until ? pulse.dir : 0);
      let sim = real * timeScale;
      while (sim > 1e-6) {
        const dt = Math.min(0.25, sim);
        race.step(dt);
        sim -= dt;
      }
      handleEvents();
    }
    drawDynamic();
    raf = requestAnimationFrame(loop);
  };

  // ---------- fin de course
  const finish = () => {
    if (ended) return;
    ended = true;
    const p = race.player;
    const time = p.finishTime;
    const raw = (optTime / time) * 100;
    const score = Math.min(100, Math.round(raw >= 99.5 ? 100 : raw));
    const stars = starsFor(score);
    const xpBefore = xpBreakdown().total;
    const best = store.saveLevel(level.id, score, time, { mode: regatta ? 'regate' : 'barre' });
    const gained = xpBreakdown().total - xpBefore;
    window.dispatchEvent(new CustomEvent('progress'));
    const rank = regatta ? race.ranking().indexOf(p) + 1 : null;
    const myRules = [...new Set(race.events.filter((e) => e.type === 'foul' && e.boat === 'me').map((e) => e.rule))];
    if (stars >= 2 || rank === 1) setTimeout(() => confetti(rank === 1 ? 220 : 120), 100);
    setTimeout(celebrate, 900);
    const back = document.createElement('div');
    back.className = 'modal-back';
    back.innerHTML = `<div class="modal">
      <div class="result-top">
        <div class="big-score">${regatta ? `${rank}<sup>${rank === 1 ? 'er' : 'e'}</sup>` : `${score}%`}</div>
        <div>
          <div class="result-stars">${starsHTML(stars)}</div>
          <h2 style="margin:4px 0">${regatta ? (rank === 1 ? 'Victoire ! 🏆' : rank <= 3 ? 'Sur le podium ! 🥉' : 'Course terminée') : score >= 97 ? 'Superbe barre ! ⛵' : score >= 85 ? 'Bien barré !' : 'Course terminée'}</h2>
          ${best ? '<span class="pill" style="background:var(--navy);color:#fff;border:0">Nouveau record</span>' : ''} ${gained ? `<span class="pill xp-pill">+${gained} XP</span>` : ''}
        </div>
      </div>
      <div class="compare">
        <div class="box"><small>Ton temps</small><b>${fmt(time)}</b><div class="muted">${p.tacks} virement${p.tacks > 1 ? 's' : ''} · ${p.gybes} empannage${p.gybes > 1 ? 's' : ''}</div></div>
        <div class="box"><small>Route optimale (vent stable)</small><b>${fmt(optTime)}</b><div class="muted">${score} % ${raw > 100 ? '· tu as profité des sautes de vent !' : ''}</div></div>
      </div>
      <ul class="tips">
        ${p.fouls ? `<li>⚠️ ${p.fouls} faute${p.fouls > 1 ? 's' : ''} de priorité. ${myRules.map((r) => `<b>Règle ${r}</b> : ${RULE_TEXT[r] || ''}`).join(' ')}</li>` : regatta ? '<li>✅ Aucune faute de priorité : bravo !</li>' : ''}
        ${race.events.some((e) => e.boat === 'me' && e.type === 'aground') ? '<li>🪨 Tu t’es échoué : regarde mieux la carte près de la côte.</li>' : ''}
        <li>🌬️ Le vent a tourné jusqu’à ${Math.round(Math.max(...race.wind.osc.map((o) => o.amp)) * 1.4)}° pendant la course : les meilleurs barreurs virent quand le vent les refuse (il tourne vers l’avant) et profitent des adonnantes.</li>
      </ul>
      <div class="actions">
        <button class="btn primary" data-act="again">🔁 Rejouer</button>
        <a class="btn" href="#/mission/${level.id}">✏️ Mode tracé</a>
        <a class="btn sea" href="#/naviguer">Carte de la baie</a>
      </div>
    </div>`;
    back.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (b && b.dataset.act === 'again') {
        back.remove();
        restart();
      }
    });
    document.body.appendChild(back);
    modal = back;
  };
  let modal = null;

  const countdown = () => {
    const el = $('#countdown');
    let n = 3;
    el.textContent = n;
    el.hidden = false;
    const id = setInterval(() => {
      n--;
      if (n > 0) el.textContent = n;
      else if (n === 0) el.textContent = 'Partez !';
      else {
        clearInterval(id);
        el.hidden = true;
        paused = false;
        $('#bPause').textContent = '⏸';
      }
    }, 700);
    return id;
  };
  let cdId = 0;

  const restart = () => {
    race = new Race(level, cps, { seed: Math.floor(Math.random() * 1e6), fleet: regatta ? 5 : 0, solution: sol.sim, box, auto: !$('#manual').checked });
    if (!race.player.auto) race.player.boom = +$('#sheet').value;
    seen.clear();
    ended = false;
    paused = true;
    drawStatic();
    clearInterval(cdId);
    cdId = countdown();
  };

  // ---------- commandes
  const hold = (el, v) => {
    const on = (e) => {
      e.preventDefault();
      steer = v;
      tap(v);
      el.classList.add('on');
    };
    const off = () => {
      if (steer === v) steer = 0;
      el.classList.remove('on');
    };
    el.addEventListener('pointerdown', on);
    el.addEventListener('pointerup', off);
    el.addEventListener('pointerleave', off);
    el.addEventListener('pointercancel', off);
  };
  hold($('#hLeft'), -1);
  hold($('#hRight'), 1);
  const keys = new Set();
  const onKey = (e) => {
    if (modal && document.body.contains(modal)) return;
    const down = e.type === 'keydown';
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      if (down) {
        keys.add(e.key);
        if (!e.repeat) tap(e.key === 'ArrowRight' ? 1 : -1);
      } else keys.delete(e.key);
      steer = (keys.has('ArrowRight') ? 1 : 0) - (keys.has('ArrowLeft') ? 1 : 0);
    } else if (down && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && !race.player.auto) {
      e.preventDefault();
      const s = $('#sheet');
      s.value = clamp(+s.value + (e.key === 'ArrowUp' ? -3 : 3), 2, 88);
      race.player.boom = +s.value;
    } else if (down && intro && (e.key === ' ' || e.key === 'Enter')) {
      e.preventDefault();
      go();
    } else if (down && (e.key === '+' || e.key === '=')) zoomBy(1 / 1.4);
    else if (down && (e.key === '-' || e.key === '_')) zoomBy(1.4);
    else if (down && (e.key === 'v' || e.key === 'V') && !intro) setFollow(!follow);
    else if (down && e.key === ' ') {
      e.preventDefault();
      paused = !paused;
      $('#bPause').textContent = paused ? '▶' : '⏸';
    }
  };
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKey);
  $('#bPause').addEventListener('click', () => {
    paused = !paused;
    $('#bPause').textContent = paused ? '▶' : '⏸';
  });
  const SPEEDS = [3, 5, 8, 12, 20, 30];
  $('#bSpeed').addEventListener('click', () => {
    const i = SPEEDS.findIndex((s) => s > timeScale);
    timeScale = SPEEDS[i >= 0 ? i : 0];
    $('#bSpeed').textContent = `×${timeScale}`;
  });
  $('#bView').addEventListener('click', () => {
    if (!intro) setFollow(!follow);
  });
  $('#bZoomIn').addEventListener('click', () => zoomBy(1 / 1.4));
  $('#bZoomOut').addEventListener('click', () => zoomBy(1.4));
  $('#lmini').addEventListener('click', () => setFollow(false));
  // molette et pincement à deux doigts sur la carte
  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoomBy(Math.exp(clamp(e.deltaY, -120, 120) / 300));
  }, { passive: false });
  const fingers = new Map();
  let pinch = 0;
  const spread = () => {
    const [a, b] = [...fingers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };
  svg.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (fingers.size === 2) pinch = spread();
  });
  svg.addEventListener('pointermove', (e) => {
    if (!fingers.has(e.pointerId)) return;
    fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (fingers.size === 2 && pinch > 0) {
      const d = spread();
      if (d > 0) zoomBy(pinch / d);
      pinch = d;
    }
  });
  const lift = (e) => {
    fingers.delete(e.pointerId);
    if (fingers.size < 2) pinch = 0;
  };
  svg.addEventListener('pointerup', lift);
  svg.addEventListener('pointercancel', lift);
  // aperçu du parcours avant le départ, puis on zoome sur le bateau et le compte à rebours démarre
  const go = () => {
    if (!intro) return;
    intro = false;
    $('#lintro').hidden = true;
    setFollow(true);
    cdId = countdown();
  };
  $('#bGo').addEventListener('click', go);
  $('#manual').addEventListener('change', (e) => {
    race.player.auto = !e.target.checked;
    store.setPref('manualTrim', e.target.checked);
    $('#sheetBox').hidden = !e.target.checked;
    if (!race.player.auto) race.player.boom = +$('#sheet').value;
  });
  $('#sheet').addEventListener('input', (e) => (race.player.boom = +e.target.value));

  const ro = new ResizeObserver(() => drawStatic());
  ro.observe(svg);
  syncViewBtn();
  drawStatic();
  raf = requestAnimationFrame(loop);
  void wrap;
  void getBoat;
  void bearing;
  void dist;
  void vec;
  void WINDS;

  return () => {
    cancelAnimationFrame(raf);
    clearInterval(cdId);
    ro.disconnect();
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('keyup', onKey);
    if (modal) modal.remove();
  };
}
