// Quiz chronométrés de l'onglet Jeux : même principe et même habillage que les réflexes
// (60 secondes, combo, record), mais sur les connaissances : balisage, priorités, vocabulaire,
// force du vent, et un quiz éclair qui pioche dans toutes les leçons.
import { boatSVG, windArrowSVG } from '../ui/boat.js';
import { markIcon, MARK_INFO } from '../ui/map.js';
import { gearIcon, GEAR_ICONS } from '../ui/gear.js';
import { TERMS } from '../data/glossary.js';
import { LESSONS } from '../data/lessons.js';
import { BEAUFORT } from './theory2.js';
import { norm360, twa } from '../core/angles.js';
import { store } from '../store.js';
import { celebrate, confetti } from '../ui/fx.js';

const DURATION = 60; // s

export const QUIZ_MODES = [
  { id: 'eclair', emoji: '⚡', title: 'Quiz éclair', text: 'Des questions tirées de toutes les leçons. Combien de bonnes réponses en une minute ?' },
  { id: 'mots', emoji: '📖', title: 'Les mots du marin', text: 'Une définition s’affiche : retrouve le bon mot du lexique.' },
  { id: 'balise', emoji: '🔭', title: 'Balisage express', text: 'Cardinales, latérales, danger isolé : reconnais la balise et le côté où passer.' },
  { id: 'priorite', emoji: '⚖️', title: 'Qui est prioritaire ?', text: 'Deux voiliers se croisent : tribord amure, sous le vent, rattrapé… qui passe ?' },
  { id: 'beaufort', emoji: '🌬️', title: 'Force du vent', text: 'Regarde la mer ou lis les nœuds : quelle force sur l’échelle de Beaufort ?' },
];

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
const fx = (n) => Math.round(n * 10) / 10;
const plain = (s) => String(s).replace(/<[^>]+>/g, '');
const letters = (list) => list.map((c, i) => ({ ...c, key: String(i + 1) }));

// ---------------------------------------------------------------- Quiz éclair
const POOL = LESSONS.flatMap((l) => l.quiz.map((x) => ({ l, x })));
function qEclair() {
  const { l, x } = pick(POOL);
  const choices = shuffle(x.c.map((text, i) => ({ id: `c${i}`, label: text })));
  return {
    stage: `<div class="qz-card"><span class="qz-emoji">${l.icon}</span><small>Leçon ${l.num} · ${l.title}</small></div>`,
    question: x.q, choices: letters(choices), answer: 'c0', explain: x.e, wide: true,
  };
}

// ---------------------------------------------------------------- Les mots du marin
function qMots() {
  const t = pick(TERMS.filter((x) => x.def.length < 170));
  const same = TERMS.filter((x) => x.cat === t.cat && x.id !== t.id);
  const others = shuffle(same.length >= 3 ? same : TERMS.filter((x) => x.id !== t.id)).slice(0, 3);
  // la définition ne doit pas contenir le mot à trouver
  const word = t.term.split(/[\s(]/)[0].toLowerCase();
  const def = word.length > 3 ? t.def.replace(new RegExp(word, 'gi'), '…') : t.def;
  return {
    stage: `<div class="qz-card">${GEAR_ICONS[t.icon] ? `<span class="qz-gear">${gearIcon(t.icon, 84)}</span>` : '<span class="qz-emoji">📖</span>'}<p class="qz-def">${def}</p></div>`,
    question: 'Quel est ce mot ?',
    choices: letters(shuffle([t, ...others]).map((x) => ({ id: x.id, label: x.term }))),
    answer: t.id, explain: `<b>${t.term}</b> : ${t.def}`,
  };
}

// ---------------------------------------------------------------- Balisage express
const MARKS = ['lateral_port', 'lateral_starboard', 'cardinal_N', 'cardinal_S', 'cardinal_E', 'cardinal_W', 'isolated_danger', 'special', 'safe_water'];
function qBalise() {
  const k = pick(MARKS);
  const info = MARK_INFO[k];
  const stage = `<div class="qz-mark">${markIcon(k, 200)}</div>`;
  const kind = k.startsWith('cardinal') && Math.random() < 0.5 ? 'side' : k.startsWith('lateral') && Math.random() < 0.5 ? 'port' : 'name';
  if (kind === 'side') {
    const sides = { N: 'Au nord', S: 'Au sud', E: 'À l’est', W: 'À l’ouest' };
    return {
      stage, question: 'De quel côté de cette balise passes-tu ?',
      choices: letters(Object.entries(sides).map(([id, label]) => ({ id, label }))), answer: k.slice(-1), explain: info.text,
    };
  }
  if (kind === 'port') {
    return {
      stage, question: 'Tu rentres au port. Cette marque, tu la laisses…',
      choices: letters([{ id: 'lateral_port', label: 'à bâbord (à gauche)' }, { id: 'lateral_starboard', label: 'à tribord (à droite)' }]), answer: k, explain: info.text,
    };
  }
  const others = shuffle(MARKS.filter((x) => x !== k)).slice(0, 3);
  return {
    stage, question: 'Quelle est cette balise ?',
    choices: letters(shuffle([k, ...others]).map((id) => ({ id, label: MARK_INFO[id].label }))), answer: k, explain: `<b>${info.label}.</b> ${info.text}`,
  };
}

// ---------------------------------------------------------------- Qui est prioritaire ?
// Scènes décrites avec un vent venant du haut, puis tournées d'un angle au hasard.
const BLUE = '#2a6fdb';
const RED = '#d6453d';
function qPriorite() {
  const w = pick([0, 0, 45, 90, 180, 270, 315]);
  const sc = pick(['amures', 'amures', 'vent', 'vent', 'rattrape']);
  let a; // bateau prioritaire
  let b; // bateau qui s'écarte
  let why;
  if (sc === 'amures') {
    [a, b] = pick([
      [{ x: 78, y: 72, h: 315 }, { x: -78, y: 72, h: 45 }],
      [{ x: 112, y: -8, h: 270 }, { x: -58, y: 92, h: 45 }],
      [{ x: 82, y: 82, h: 315 }, { x: -92, y: -78, h: 135 }],
    ]);
    why = 'Amures opposées : le bateau <b>tribord amure</b> (il reçoit le vent par la droite) est prioritaire. Le bateau bâbord amure s’écarte.';
  } else if (sc === 'vent') {
    const h = pick([315, 45, 225, 135]);
    const side = twa(h, 0) > 0 ? 90 : -90; // côté du bateau tourné vers le vent
    const r = ((h + side) * Math.PI) / 180;
    a = { x: -Math.sin(r) * 58, y: Math.cos(r) * 58, h };
    b = { x: Math.sin(r) * 58, y: -Math.cos(r) * 58, h };
    why = 'Même amure, bord à bord : le bateau <b>sous le vent</b> est prioritaire. Le bateau au vent (le plus près du vent) s’écarte.';
  } else {
    const h = pick([315, 45, 270, 90, 225, 135]);
    const r = (h * Math.PI) / 180;
    a = { x: Math.sin(r) * 70, y: -Math.cos(r) * 70, h };
    b = { x: -Math.sin(r) * 80, y: Math.cos(r) * 80, h };
    why = 'Même amure, l’un derrière l’autre : le bateau <b>qui rattrape</b> s’écarte. Celui de devant est prioritaire.';
  }
  const rot = (p) => {
    const r = (w * Math.PI) / 180;
    return { x: p.x * Math.cos(r) - p.y * Math.sin(r), y: p.x * Math.sin(r) + p.y * Math.cos(r), h: norm360(p.h + w) };
  };
  const blueFirst = Math.random() < 0.5;
  const draw = (p, color) => {
    const q = rot(p);
    return `<g transform="translate(${fx(q.x)},${fx(q.y)}) scale(0.85)">${boatSVG({ heading: q.h, windFrom: w, hull: color, mine: false })}</g>`;
  };
  const wr = (w * Math.PI) / 180;
  const stage = `<svg viewBox="-200 -200 400 400">
    <g transform="translate(${fx(Math.sin(wr) * 165)},${fx(-Math.cos(wr) * 165)})" style="color:#fff">${windArrowSVG(w, 30)}</g>
    <text x="${fx(Math.sin(wr) * 124)}" y="${fx(-Math.cos(wr) * 124)}" fill="#fff" font-size="13" font-weight="900" text-anchor="middle" dominant-baseline="central" opacity=".85">VENT</text>
    ${draw(a, blueFirst ? BLUE : RED)}${draw(b, blueFirst ? RED : BLUE)}
  </svg>`;
  const giveWay = Math.random() < 0.3;
  return {
    stage, question: giveWay ? 'Qui doit <b>s’écarter</b> ?' : 'Qui est <b>prioritaire</b> ?',
    choices: letters([{ id: 'blue', label: '🔵 Le bleu' }, { id: 'red', label: '🔴 Le rouge' }]),
    answer: (giveWay ? !blueFirst : blueFirst) ? 'blue' : 'red', explain: why,
  };
}

// ---------------------------------------------------------------- Force du vent
export function seaSVG(f, id = 'qzSea') {
  return `<svg viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b6f9e"/><stop offset="1" stop-color="#2a9fd6"/></linearGradient></defs>
    <rect width="400" height="240" fill="url(#${id})"/>
    ${Array.from({ length: 9 }, (_, r) => `<path d="M-20,${22 + r * 26} ${Array.from({ length: 9 }, () => `q25,${-f * 2.2 - 1} 50,0`).join(' ')}" fill="none" stroke="#fff" stroke-width="${f >= 3 ? 2.2 : 1.3}" opacity="${0.22 + f * 0.07}"/>`).join('')}
    ${Array.from({ length: Math.max(0, (f - 2) * 9) }, (_, k) => `<ellipse cx="${(k * 83 + 30) % 396}" cy="${14 + ((k * 47) % 212)}" rx="${5 + (f - 3) * 1.4}" ry="${2 + (f - 3) * 0.3}" fill="#fff" opacity=".88"/>`).join('')}
  </svg>`;
}
function qBeaufort() {
  const b = pick(BEAUFORT.slice(1));
  const near = shuffle(BEAUFORT.filter((x) => x.f !== b.f && Math.abs(x.f - b.f) <= 3)).slice(0, 3);
  const byKnots = Math.random() < 0.45;
  return {
    stage: `<div class="qz-sea">${seaSVG(b.f)}<div class="qz-over">${byKnots ? `<b>${b.kn} nœuds</b>` : `<span>${b.sea}</span>`}</div></div>`,
    question: byKnots ? 'Quelle force sur l’échelle de Beaufort ?' : 'La mer ressemble à ça. Quelle force ?',
    choices: letters([b, ...near].sort((x, y) => x.f - y.f).map((x) => ({ id: `f${x.f}`, label: `Force ${x.f}` }))),
    answer: `f${b.f}`, explain: `<b>Force ${b.f}, ${b.name.toLowerCase()}</b> : ${b.kn} nœuds. ${b.sea}`,
  };
}

const GEN = { eclair: qEclair, mots: qMots, balise: qBalise, priorite: qPriorite, beaufort: qBeaufort };

// ---------------------------------------------------------------- Partie
export function render(root, params) {
  const mode = QUIZ_MODES.find((m) => m.id === params[0]);
  if (!mode) {
    location.replace('#/jeux');
    return null;
  }
  root.innerHTML = `
    <div class="section-title"><h1>${mode.emoji} ${mode.title}</h1><a class="btn small ghost" href="#/jeux">← Jeux</a></div>
    <div class="reflex-play">
      <div class="reflex-stage quiz-stage">
        <div id="stage"></div>
        <div class="reflex-hud"><span id="hScore">0 pts</span><div class="timer"><i id="hTimer"></i></div><span id="hCombo" class="combo"></span></div>
      </div>
      <div class="card" id="side"></div>
    </div>`;
  const $ = (s) => root.querySelector(s);
  let q;
  let score = 0;
  let streak = 0;
  let good = 0;
  let total = 0;
  let tEnd = 0;
  let tQ = 0;
  let raf;
  let timeoutId;
  let locked = true;
  let running = false;
  let missed = [];

  const drawQ = () => {
    $('#stage').innerHTML = q.stage;
    $('#side').innerHTML = `
      <div class="reflex-question${q.wide ? ' small' : ''}">${q.question}</div>
      <div class="answers${q.wide ? ' one-col' : ''}">${q.choices.map((c) => `<button class="btn" data-id="${c.id}">${c.label} <span class="kbd">${c.key}</span></button>`).join('')}</div>
      <div class="feedback" id="fb"></div>`;
    $('#side').querySelectorAll('.answers .btn').forEach((b) => b.addEventListener('click', () => answer(b.dataset.id)));
  };

  const newQ = () => {
    let next;
    do next = GEN[mode.id](); while (q && next.question === q.question && next.answer === q.answer && plain(next.stage) === plain(q.stage));
    q = next;
    locked = false;
    tQ = performance.now();
    drawQ();
  };

  const answer = (id) => {
    if (locked || !running) return;
    locked = true;
    total++;
    const ok = id === q.answer;
    const dt = (performance.now() - tQ) / 1000;
    let fb;
    if (ok) {
      streak++;
      good++;
      const fast = Math.max(0, Math.round(6 - dt));
      const pts = 10 + Math.min(10, (streak - 1) * 2) + fast;
      score += pts;
      fb = `+${pts} · ${q.explain}`;
    } else {
      streak = 0;
      fb = `✗ ${q.explain}`;
      missed.push({ question: plain(q.question), answer: plain(q.choices.find((c) => c.id === q.answer).label), explain: q.explain });
    }
    $('#fb').className = `feedback ${ok ? 'ok' : 'ko'}`;
    $('#fb').innerHTML = fb;
    $('#side').querySelectorAll('.answers .btn').forEach((b) => {
      if (b.dataset.id === q.answer) b.classList.add('starboard');
      else if (b.dataset.id === id) b.classList.add('port');
      b.disabled = true;
    });
    $('#hScore').textContent = `${score} pts`;
    $('#hCombo').textContent = streak > 1 ? `🔥 x${streak}` : '';
    // une erreur laisse le temps de lire l'explication, sans manger le chrono
    const pause = ok ? 900 : 3200;
    if (!ok) tEnd += pause;
    timeoutId = setTimeout(() => running && newQ(), pause);
  };

  const onKey = (e) => {
    if (document.querySelector('.ceremony-back') || !running || !q) return;
    const c = q.choices.find((x) => x.key === e.key);
    if (c) {
      answer(c.id);
      e.preventDefault();
    }
  };
  window.addEventListener('keydown', onKey);

  const tick = () => {
    const left = Math.max(0, (tEnd - performance.now()) / 1000);
    $('#hTimer').style.width = `${Math.min(100, (left / DURATION) * 100)}%`;
    if (left <= 0) return finish();
    raf = requestAnimationFrame(tick);
  };

  const start = () => {
    score = 0;
    streak = 0;
    good = 0;
    total = 0;
    missed = [];
    q = null;
    running = true;
    $('#hScore').textContent = '0 pts';
    $('#hCombo').textContent = '';
    tEnd = performance.now() + DURATION * 1000;
    newQ();
    raf = requestAnimationFrame(tick);
  };

  const finish = () => {
    if (!running) return;
    running = false;
    cancelAnimationFrame(raf);
    clearTimeout(timeoutId);
    const record = store.saveReflex(mode.id, score);
    window.dispatchEvent(new CustomEvent('progress'));
    if (record && score > 0) confetti(90);
    setTimeout(celebrate, 700);
    const pct = total ? Math.round((good / total) * 100) : 0;
    const msg = pct >= 90 ? 'Incollable ! 🏆' : pct >= 70 ? 'Bien joué, encore un petit effort ⛵' : 'Un tour par l’École, et tu reviens plus fort 📖';
    $('#side').innerHTML = `
      <div class="reflex-question">Temps écoulé !</div>
      <div class="big-score">${score} pts</div>
      <p>${good} bonne${good > 1 ? 's' : ''} réponse${good > 1 ? 's' : ''} sur ${total} (${pct} %)${record && score > 0 ? ' · <b style="color:var(--link)">Nouveau record !</b>' : ` · Record : ${store.reflex(mode.id)} pts`}</p>
      <p class="muted">${msg}</p>
      ${missed.length ? `<details class="met-more-txt"><summary>À revoir <span class="pill">${missed.length}</span></summary><ul class="review-list">${missed.slice(0, 8).map((m) => `<li><b>${m.question}</b> ${m.answer}.<br/><span class="muted">${m.explain}</span></li>`).join('')}</ul></details>` : ''}
      <div class="answers"><button class="btn primary wide" id="again">🔁 Rejouer</button><a class="btn wide" href="#/jeux">Autres jeux</a></div>`;
    $('#again').addEventListener('click', start);
  };

  // écran d'accueil de la partie
  q = GEN[mode.id]();
  $('#stage').innerHTML = q.stage;
  $('#side').innerHTML = `
    <div class="reflex-question">${mode.title}</div>
    <p class="muted">${mode.text}</p>
    <ul class="help-list"><li>${DURATION} secondes, autant de questions que possible.</li><li>Bonne réponse : +10, plus un bonus de rapidité et de combo.</li><li>Une erreur ? Tu as le temps de lire l’explication : le chrono t’attend.</li></ul>
    <p>Record actuel : <b>${store.reflex(mode.id)} pts</b></p>
    <div class="answers"><button class="btn primary wide" id="go">▶ C’est parti !</button></div>`;
  $('#go').addEventListener('click', start);

  return () => {
    running = false;
    cancelAnimationFrame(raf);
    clearTimeout(timeoutId);
    window.removeEventListener('keydown', onKey);
  };
}
