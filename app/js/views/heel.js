// Mini-jeu « Pas de dessalage ! » : le dériveur vu de l'arrière. Les risées et les molles arrivent,
// le bateau gîte : on choque ou on borde l'écoute, on lofe… et on garde le
// bateau à plat pour aller vite. Le moteur est dans core/heel.js.
import { createHeel, stepHeel, rightBoat, heelHint, sailPower, knotsOf, HEEL } from '../core/heel.js';
import { store } from '../store.js';
import { celebrate, confetti } from '../ui/fx.js';
import { resolveLook } from '../core/look.js';

const DURATION = 60; // s
const SHEET_RATE = 0.9; // par seconde, en gardant le bouton appuyé
const fx = (n) => Math.round(n * 10) / 10;
const WATER = 60; // ligne d'eau (repère de la scène)

const scoreOf = (s) => Math.round(s.dist + s.flatTime * 2);

// Bateau en coupe, vu de l'arrière, dans le repère du pivot (0, 0) à la flottaison.
function boatView(s, flapPhase) {
  const lee = -s.side; // côté sous le vent, à l'écran
  const flapping = s.sheet < HEEL.flapAt;
  const bx = lee * (10 + (1 - s.sheet) * 78);
  const belly = lee * (14 + 22 * Math.min(1, sailPower(s)));
  const sail = flapping
    ? `M0,-190 Q${fx(bx + Math.sin(flapPhase) * 22)},-100 ${fx(bx)},-22 L0,-22 Z`
    : `M0,-190 Q${fx(bx * 0.5 + belly)},-95 ${fx(bx)},-22 L0,-22 Z`;
  const cx = s.side * s.crew * 50;
  const hiking = s.crew > 0.75 ? s.side * 28 * (s.crew - 0.75) * 4 : 0; // le marin se penche au rappel
  return `
    <line x1="0" y1="20" x2="0" y2="78" class="hv-board"/>
    <path d="M-62,-10 C-60,22 -30,30 0,30 C30,30 60,22 62,-10 Z" class="hv-hull"/>
    <line x1="-62" y1="-10" x2="62" y2="-10" class="hv-deck"/>
    <line x1="0" y1="-10" x2="0" y2="-198" class="hv-mast"/>
    <path d="${sail}" class="hv-sail${flapping ? ' flap' : ''}"/>
    <line x1="0" y1="-22" x2="${fx(bx)}" y2="-22" class="hv-boom"/>
    <line x1="${fx(bx)}" y1="-22" x2="${fx(cx * 0.4)}" y2="-12" class="hv-sheet"/>
    <g transform="translate(${fx(cx)},-12) rotate(${fx(hiking)})">
      <line x1="0" y1="0" x2="0" y2="-26" class="hv-body"/>
      <rect x="-8" y="-28" width="16" height="16" rx="5" class="hv-vest"/>
      <circle cx="0" cy="-36" r="8" class="hv-head"/>
    </g>`;
}

// Risées (sombres) et molles (claires) qui arrivent du côté du vent.
function gustView(s) {
  return s.gusts.map((g) => {
    const lead = g.at - s.t;
    const p = lead > 0 ? 1 - lead / 2 : 1;
    const x = s.side * (230 - 200 * Math.max(0, p));
    const fade = lead > 0 ? 1 : Math.max(0, 1 - (s.t - g.at) / g.dur);
    const cls = g.amp > 0 ? 'hv-gust' : 'hv-lull';
    let marks = '';
    for (let i = 0; i < 7; i++) {
      const y = WATER + 8 + i * 9;
      const dx = ((i * 37) % 50) - 25;
      marks += `<line x1="${fx(x + dx - 22)}" y1="${y}" x2="${fx(x + dx + 22)}" y2="${y}"/>`;
    }
    return `<g class="${cls}" opacity="${fx(fade)}">${marks}</g>`;
  }).join('');
}

function gaugeView(s) {
  const rot = -s.side * s.heel;
  const arc = (a0, a1, cls) => {
    const p = (a) => [fx(Math.sin((a * Math.PI) / 180) * 46), fx(-Math.cos((a * Math.PI) / 180) * 46)];
    const [x0, y0] = p(a0);
    const [x1, y1] = p(a1);
    return `<path d="M${x0},${y0} A46,46 0 0 1 ${x1},${y1}" class="${cls}"/>`;
  };
  return `<g transform="translate(0,-196)">
    ${arc(-60, -HEEL.flat, 'hv-arc warn')}${arc(-HEEL.flat, HEEL.flat, 'hv-arc ok')}${arc(HEEL.flat, 60, 'hv-arc warn')}
    <line x1="0" y1="0" x2="${fx(Math.sin((Math.max(-60, Math.min(60, rot)) * Math.PI) / 180) * 52)}" y2="${fx(-Math.cos((Math.max(-60, Math.min(60, rot)) * Math.PI) / 180) * 52)}" class="hv-needle"/>
    <circle r="4" class="hv-needle-dot"/>
    <text y="18" class="hv-gauge-txt">gîte ${Math.round(Math.abs(s.heel))}°</text>
  </g>`;
}

function windView(s) {
  const x = s.side * 150;
  const dir = -s.side;
  return `<g transform="translate(${x},-150)" class="hv-wind">
    <line x1="${-dir * 26}" y1="0" x2="${dir * 18}" y2="0"/>
    <path d="M${dir * 28},0 L${dir * 14},-9 L${dir * 14},9 Z"/>
    <text y="26">${knotsOf(s.wind)} nds</text>
    <text y="-16" class="hv-wlabel">VENT</text>
  </g>`;
}

export function playHeel(root, mode) {
  root.innerHTML = `
    <div class="section-title"><h1>${mode.emoji} ${mode.title}</h1><a class="btn small ghost" href="#/reflexes">← Mini-jeux</a></div>
    <div class="reflex-play">
      <div>
        <div class="reflex-stage heel-stage">
          <svg viewBox="-200 -260 400 380" id="hstage" aria-label="Dériveur vu de l’arrière">
            <rect x="-200" y="${WATER}" width="400" height="80" class="hv-sea"/>
            <g id="hgusts"></g>
            <g id="hwind"></g>
            <g id="hgauge"></g>
            <g id="hboat" transform="translate(0,${WATER})"></g>
            <path d="M-200,${WATER} Q-150,${WATER - 5} -100,${WATER} T0,${WATER} T100,${WATER} T200,${WATER}" class="hv-wave"/>
            <text id="hbig" x="0" y="-60" class="hv-big"></text>
          </svg>
          <div class="reflex-hud"><span id="hScore">0 m</span><div class="timer"><i id="hTimer"></i></div><span id="hInfo" class="combo"></span></div>
        </div>
        <div class="heel-controls" id="hctl">
          <div class="hc-group"><small>Écoute</small><div class="hc-row"><button class="btn" data-hold="ease">Choquer</button><span class="hc-sheet" aria-hidden="true"><i id="hSheet"></i></span><button class="btn" data-hold="trim">Border</button></div></div>
          <div class="hc-group"><small>Barre</small><div class="hc-row"><button class="btn hc-luff" data-hold="luff">Lofer<small>pousser la barre</small></button></div></div>
        </div>
      </div>
      <div class="card" id="hside"></div>
    </div>`;
  const $ = (q) => root.querySelector(q);
  const look = resolveLook();
  $('#hstage').style.cssText = `--hull:${look.hull};--sail:${look.sail}`;
  const held = new Set();
  let s = createHeel();
  let raf;
  let last = 0;
  let running = false;
  let pauseUntil = 0;
  let flash = '';
  let flashUntil = 0;
  let phase = 0;
  let capRot = 0;

  const say = (text, ms = 1400) => {
    flash = text;
    flashUntil = performance.now() + ms;
  };

  const draw = (capsized = 0) => {
    const rot = capsized ? capsized * 88 : -s.side * s.heel;
    $('#hboat').setAttribute('transform', `translate(0,${WATER + (capsized ? 20 : 0)}) rotate(${fx(rot)})`);
    $('#hboat').innerHTML = boatView(s, phase);
    $('#hgusts').innerHTML = gustView(s);
    $('#hwind').innerHTML = windView(s);
    $('#hgauge').innerHTML = gaugeView(s);
    $('#hbig').textContent = performance.now() < flashUntil ? flash : '';
    $('#hSheet').style.height = `${Math.round(s.sheet * 100)}%`;
    $('#hScore').textContent = `${scoreOf(s)} m`;
    $('#hInfo').textContent = s.capsizes ? `💦 ${s.capsizes}` : '';
    $('#hTimer').style.width = `${Math.max(0, 1 - s.t / DURATION) * 100}%`;
  };

  const hintBox = () => {
    const h = $('#hHint');
    if (h) h.textContent = heelHint(s);
    const sp = $('#hSpeed');
    if (sp) sp.textContent = `${(s.speed * 1.94).toFixed(1)} nds`;
  };

  const loop = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    phase += dt * 22;
    if (now < pauseUntil) {
      draw(capRot);
      raf = requestAnimationFrame(loop);
      return;
    }
    if (held.has('trim')) s.sheet += SHEET_RATE * dt;
    if (held.has('ease')) s.sheet -= SHEET_RATE * dt;
    s.sheet = Math.max(0, Math.min(1, s.sheet));
    s.luff = held.has('luff');
    for (const e of stepHeel(s, dt)) {
      if (e.type === 'gust') say(e.gust.amp > 0 ? '💨 Risée !' : '🍃 Molle…');
      if (e.type === 'tackSoon') say('🔄 Virement dans 2 s…', 1800);
      if (e.type === 'tack') say('🔄 Virement ! Change de côté !', 1600);
      if (e.type === 'capsize') {
        say('💦 Dessalé !', 2200);
        capRot = s.heel >= 0 ? -s.side : s.side;
        pauseUntil = now + 2200;
        draw(capRot);
        rightBoat(s);
      }
    }
    if (s.t >= DURATION) return finish();
    draw();
    hintBox();
    raf = requestAnimationFrame(loop);
  };

  const start = () => {
    s = createHeel();
    held.clear();
    running = true;
    $('#hside').innerHTML = `
      <div class="reflex-question">À toi de jouer !</div>
      <p class="heel-hint" id="hHint" role="status"></p>
      <p class="muted">Vitesse : <b id="hSpeed">0 nds</b></p>
      <p class="muted small-print">Clavier : ↑ border · ↓ choquer · Espace lofer (pousser la barre)</p>`;
    last = performance.now();
    say('⛵ C’est parti !');
    window.scrollTo(0, 0);
    raf = requestAnimationFrame(loop);
  };

  const finish = () => {
    running = false;
    held.clear();
    cancelAnimationFrame(raf);
    const score = scoreOf(s);
    const record = store.saveReflex(mode.id, score);
    if (record && score > 0) confetti(90);
    setTimeout(celebrate, 700);
    const flatPct = Math.round((s.flatTime / DURATION) * 100);
    $('#hside').innerHTML = `
      <div class="reflex-question">${s.capsizes ? 'Arrivée… un peu mouillée !' : 'Arrivée sans dessaler ! 🏆'}</div>
      <div class="big-score">${score} <sup>pts</sup></div>
      <p>${Math.round(s.dist)} m parcourus · bateau à plat ${flatPct} % du temps (+${Math.round(s.flatTime * 2)} pts) · ${s.capsizes} dessalage${s.capsizes > 1 ? 's' : ''}</p>
      <p>${record && score > 0 ? '<b style="color:var(--link)">Nouveau record !</b>' : `Record : ${store.reflex(mode.id)} pts`}</p>
      <p class="muted">${s.capsizes > 1 ? 'Dans une risée : choque l’écoute ou lofe (pousse la barre) tout de suite, puis reborde quand elle est passée.' : flatPct < 50 ? 'Garde le bateau plus à plat : c’est là qu’il va le plus vite.' : 'Beau travail d’équilibre !'}</p>
      <div class="answers"><button class="btn primary wide" id="again">🔁 Rejouer</button></div>`;
    $('#again').addEventListener('click', start);
  };

  // Boutons à garder appuyés (souris, doigt) et clavier.
  const ctl = $('#hctl');
  ctl.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('[data-hold]');
    if (!b) return;
    e.preventDefault();
    b.setPointerCapture(e.pointerId);
    held.add(b.dataset.hold);
    b.classList.add('on');
  });
  const release = (e) => {
    const b = e.target.closest('[data-hold]');
    if (!b) return;
    held.delete(b.dataset.hold);
    b.classList.remove('on');
  };
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((t) => ctl.addEventListener(t, release));
  ctl.addEventListener('contextmenu', (e) => e.preventDefault());
  const KEYS = { ArrowUp: 'trim', ArrowDown: 'ease', ' ': 'luff' };
  const onKey = (e) => {
    const k = KEYS[e.key];
    if (!k || !running) return;
    e.preventDefault();
    if (e.type === 'keydown') held.add(k);
    else held.delete(k);
  };
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKey);

  // écran d'accueil
  draw();
  $('#hside').innerHTML = `
    <div class="reflex-question">${mode.title}</div>
    <p class="muted">Ton dériveur est vu <b>de l’arrière</b> : c’est comme ça qu’on voit le mieux la gîte. Le vent arrive du côté de la flèche.</p>
    <ul class="help-list">
      <li>L’équipage est déjà au rappel, du côté du vent. À toi l’écoute et la barre !</li>
      <li><b>Ça gîte ?</b> <b>Choque</b> l’écoute ou <b>lofe</b> : pousse la barre, le bateau remonte vers le vent et la voile porte moins. Trop longtemps, il s’arrête face au vent !</li>
      <li><b>Risée 💨</b> : l’eau fonce au vent, elle arrive. Anticipe !</li>
      <li><b>Molle 🍃</b> : le vent tombe, le bateau penche vers toi : <b>borde</b> pour garder de la vitesse.</li>
      <li><b>Virement 🔄</b> : le vent change de côté, la voile et l’équipage aussi.</li>
      <li>Voile bordée et bateau à plat = vitesse maximale. ${DURATION} secondes pour aller le plus loin possible.</li>
    </ul>
    <p>Record : <b>${store.reflex(mode.id)} pts</b></p>
    <div class="answers"><button class="btn primary wide" id="go">▶ Larguer les amarres</button></div>`;
  $('#go').addEventListener('click', start);

  return () => {
    running = false;
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('keyup', onKey);
  };
}
