import { boatSVG, windArrowSVG } from '../ui/boat.js';
import { twa, tackOf, allureOf, norm360, NO_GO, TACKS } from '../core/angles.js';
import { allureRing } from './theory.js';
import { store } from '../store.js';
import { boomless } from '../core/boats.js';
import { celebrate, confetti } from '../ui/fx.js';
import { playHeel } from './heel.js';

const DURATION = 45; // s
// Grand mix : pas de chrono global, un nombre de questions fixe. Répondre vite rapporte un bonus
// qui fond doucement pendant SPEED_WINDOW secondes, sans jamais pénaliser qui prend son temps.
// Après chaque réponse on lit l'explication et on passe à la suite soi-même ; on peut revenir
// sur les questions déjà jouées pour comprendre ses erreurs.
const MIX_QUESTIONS = 15;
const SPEED_WINDOW = 20; // s
const SPEED_MAX = 15; // pts

export const MODES = [
  { id: 'amure', emoji: '↔️', title: 'Bâbord ou tribord ?', text: 'Le vent et le bateau changent à chaque fois : de quel côté vient le vent ?' },
  { id: 'allure', emoji: '🧭', title: 'Quelle allure ?', text: 'Près, travers, largue, vent arrière… Reconnais l’allure du premier coup d’œil.' },
  { id: 'manoeuvre', emoji: '🔄', title: 'Quelle manœuvre ?', text: 'Virement, empannage, lofer (pousser la barre) ou abattre (tirer la barre) : nomme le virage dessiné.' },
  { id: 'barre', emoji: '🎮', title: 'À la barre !', text: 'Oriente toi-même le bateau à l’allure et à l’amure demandées.' },
  { id: 'mix', emoji: '🌪️', title: 'Grand mix', text: `${MIX_QUESTIONS} questions mélangées, sans chrono : prends ton temps, mais plus tu réponds vite, plus tu marques !` },
  { id: 'gite', emoji: '⚖️', title: 'Pas de dessalage !', text: 'Les risées arrivent : choque ou borde l’écoute, lofe (pousse la barre)… et garde le bateau à plat !' },
];

const ALLURE_CHOICES = [
  // la limite vent debout / près dépend du bateau choisi (NO_GO)
  { id: 'debout', label: '⛔ Vent debout', get range() { return [0, NO_GO]; } },
  { id: 'pres', label: 'Près', get range() { return [NO_GO, 75]; } },
  { id: 'travers', label: 'Travers', range: [75, 105] },
  { id: 'petitlargue', label: 'Petit largue', range: [105, 135] },
  { id: 'grandlargue', label: 'Grand largue', range: [135, 165] },
  { id: 'arriere', label: 'Vent arrière', range: [165, 180] },
];

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const fx = (n) => Math.round(n * 10) / 10;
const P = (deg, r) => [r * Math.sin((deg * Math.PI) / 180), -r * Math.cos((deg * Math.PI) / 180)];

export function render(root, params) {
  const mode = MODES.find((m) => m.id === params[0]);
  if (!mode) return renderMenu(root);
  if (mode.id === 'gite') return playHeel(root, mode);
  return play(root, mode);
}

function renderMenu(root) {
  root.innerHTML = `
    <div class="section-title"><h1>Réflexes</h1><a class="btn small ghost" href="#/jeux">← Jeux</a></div>
    <p class="muted" style="margin-top:-6px">Sur l’eau, il faut savoir en une seconde d’où vient le vent et comment on navigue. Enchaîne les bonnes réponses pour faire monter le combo !</p>
    <div class="reflex-modes">
      ${MODES.map((m) => `
        <a href="#/reflexes/${m.id}"><div class="card">
          <div class="emoji">${m.emoji}</div>
          <h2 class="h3" style="margin:0">${m.title}</h2>
          <p class="muted" style="margin:0">${m.text}</p>
          <div class="best">Record : ${store.reflex(m.id)} pts</div>
        </div></a>`).join('')}
    </div>`;
}

// ---------------------------------------------------------------- Générateurs de questions
function qAmure() {
  const wind = Math.round(rand(0, 360));
  let t;
  do t = rand(-178, 178);
  while (Math.abs(t) < NO_GO + 3);
  const heading = norm360(wind - t);
  const ans = tackOf(heading, wind);
  return {
    kind: 'amure', wind, heading, question: 'Quelle amure ?',
    choices: [
      { id: 'babord', label: '⬅️ Bâbord', cls: 'port', key: 'ArrowLeft' },
      { id: 'tribord', label: 'Tribord ➡️', cls: 'starboard', key: 'ArrowRight' },
    ],
    answer: ans,
    explain: () => `Le vent arrive par ${ans === 'tribord' ? 'la droite (tribord)' : 'la gauche (bâbord)'} du bateau, ${boomless('la bôme')} est de l’autre côté : <b>${TACKS[ans].label}</b>.`,
  };
}

function qAllure() {
  const wind = Math.round(rand(0, 360));
  const c = pick(ALLURE_CHOICES);
  const lo = c.range[0] + (c.id === 'debout' ? 0 : 5);
  const hi = c.range[1] - (c.id === 'arriere' ? 0 : 5);
  const a = rand(lo, hi) * (Math.random() < 0.5 ? 1 : -1);
  const heading = norm360(wind - a);
  return {
    kind: 'allure', wind, heading, question: 'Quelle allure ?',
    choices: ALLURE_CHOICES.map((x, i) => ({ id: x.id, label: x.label, key: String(i + 1) })),
    answer: c.id,
    explain: () => `Le vent fait un angle de <b>${Math.round(Math.abs(a))}°</b> avec l’axe du bateau : <b>${c.label.replace('⛔ ', '')}</b> (${c.range[0]}–${c.range[1]}°).`,
  };
}

function qManoeuvre() {
  const wind = Math.round(rand(0, 360));
  const type = pick(['virement', 'empannage', 'lofer', 'abattre']);
  let a1;
  let a2;
  let dir;
  const s = Math.random() < 0.5 ? 1 : -1; // côté de départ (twa signé)
  if (type === 'virement') {
    a1 = s * rand(NO_GO + 3, 70);
    a2 = -s * rand(NO_GO + 3, 70);
  } else if (type === 'empannage') {
    a1 = s * rand(140, 165);
    a2 = -s * rand(140, 165);
  } else if (type === 'lofer') {
    a1 = s * rand(90, 150);
    a2 = s * rand(NO_GO + 3, Math.abs(a1) - 30);
  } else {
    a1 = s * rand(NO_GO + 3, 100);
    a2 = s * rand(Math.abs(a1) + 30, 170);
  }
  // virement : on passe par 0 ; empannage : par 180 (sens du virage déduit)
  const h1 = norm360(wind - a1);
  const h2 = norm360(wind - a2);
  if (type === 'virement') dir = a1 > 0 ? 1 : -1; // twa diminue vers 0 => cap augmente si a1>0
  else if (type === 'empannage') dir = a1 > 0 ? -1 : 1;
  else dir = norm360(h2 - h1) <= 180 ? 1 : -1;
  const names = { virement: 'Virement de bord', empannage: 'Empannage', lofer: 'Lofer (pousser la barre)', abattre: 'Abattre (tirer la barre)' };
  const why = {
    virement: 'Le bateau change d’amure en passant <b>face au vent</b> : c’est un virement de bord.',
    empannage: 'Le bateau change d’amure en passant <b>vent arrière</b> : c’est un empannage.',
    lofer: 'Le bateau se <b>rapproche</b> du vent sans changer d’amure : il lofe, le barreur a <b>poussé la barre</b>.',
    abattre: 'Le bateau s’<b>éloigne</b> du vent sans changer d’amure : il abat, le barreur a <b>tiré la barre</b>.',
  };
  return {
    kind: 'manoeuvre', wind, heading: h1, h2, dir, question: 'Quelle est cette manœuvre ?',
    choices: Object.entries(names).map(([id, label], i) => ({ id, label, key: String(i + 1) })),
    answer: type,
    explain: () => why[type],
  };
}

function qBarre() {
  const wind = Math.round(rand(0, 360));
  const c = pick(ALLURE_CHOICES.slice(1));
  const tack = pick(['babord', 'tribord']);
  return {
    kind: 'barre', wind, heading: norm360(wind + rand(-20, 20)), target: c, tack,
    question: `Mets-toi au <b>${c.label.toLowerCase()}</b>, <b style="color:${TACKS[tack].color}">${TACKS[tack].label.toLowerCase()}</b>`,
    choices: [{ id: 'ok', label: '✅ Valider', cls: 'primary wide', key: 'Enter' }],
  };
}

export const GEN = { amure: qAmure, allure: qAllure, manoeuvre: qManoeuvre, barre: qBarre };

// ---------------------------------------------------------------- Partie
function play(root, mode) {
  root.innerHTML = `
    <div class="section-title"><h1>${mode.emoji} ${mode.title}</h1><a class="btn small ghost" href="#/reflexes">← Mini-jeux</a></div>
    <div class="reflex-play">
      <div class="reflex-stage">
        <svg viewBox="-200 -200 400 400" id="stage">
          <g id="ring"></g>
          <g id="streaks"></g>
          <g id="windInd" style="color:#fff"></g>
          <path id="turnArc" fill="none" stroke="#ffd166" stroke-width="5" stroke-linecap="round" stroke-dasharray="2 10"/>
          <g id="turnHead"></g>
          <g id="ghost" transform="scale(1.7)"></g>
          <g id="boat" transform="scale(1.7)"></g>
        </svg>
        <div class="reflex-hud"><span id="hScore">0 pts</span><div class="timer"><i id="hTimer"></i></div><span id="hCombo" class="combo"></span></div>
      </div>
      <div class="card" id="side"></div>
    </div>`;
  const $ = (s) => root.querySelector(s);
  const stage = $('#stage');
  let q;
  let score = 0;
  let streak = 0;
  let good = 0;
  let total = 0;
  let tEnd = 0;
  let tQ = 0;
  let raf;
  let locked = false;
  let running = false;
  let timeoutId;
  const mix = mode.id === 'mix';
  let speedBonus = 0;
  let history = []; // Grand mix : { q, id, ok, fb } de chaque question jouée

  // traînées de vent (décor)
  const streaks = () => {
    let s = '';
    for (let i = 0; i < 26; i++) {
      const x = rand(-260, 260);
      const y = rand(-260, 260);
      s += `<line class="streak" x1="${fx(x)}" y1="${fx(y)}" x2="${fx(x)}" y2="${fx(y + 26)}" stroke-width="2" style="animation-delay:${fx(-rand(0, 3.2))}s"/>`;
    }
    return s;
  };

  const drawQ = () => {
    $('#streaks').innerHTML = `<g transform="rotate(${q.wind})">${streaks()}</g>`;
    const [wx, wy] = P(q.wind, 160);
    const [lx, ly] = P(q.wind, 120);
    $('#windInd').innerHTML = `<g transform="translate(${fx(wx)},${fx(wy)})">${windArrowSVG(q.wind, 30)}</g>
      <text x="${fx(lx)}" y="${fx(ly)}" fill="#fff" font-size="13" font-weight="900" text-anchor="middle" dominant-baseline="central" opacity=".85">VENT</text>`;
    $('#ring').innerHTML = '';
    $('#ghost').innerHTML = '';
    $('#boat').innerHTML = boatSVG({ heading: q.heading, windFrom: q.wind });
    if (q.kind === 'manoeuvre') {
      const pts = [];
      const span = norm360(q.dir > 0 ? q.h2 - q.heading : q.heading - q.h2);
      for (let i = 0; i <= 30; i++) {
        const h = q.heading + (q.dir * span * i) / 30;
        const [x, y] = P(h, 130);
        pts.push(`${fx(x)},${fx(y)}`);
      }
      $('#turnArc').setAttribute('d', `M${pts.join(' L')}`);
      const [hx, hy] = P(q.h2, 130);
      $('#turnHead').innerHTML = `<g transform="translate(${fx(hx)},${fx(hy)}) rotate(${fx(q.dir > 0 ? q.h2 : q.h2 + 180)})"><path d="M-11,-8 L11,0 L-11,8 Z" fill="#ffd166"/></g>`;
      $('#ghost').innerHTML = boatSVG({ heading: q.h2, windFrom: q.wind, ghost: true });
    } else {
      $('#turnArc').setAttribute('d', '');
      $('#turnHead').innerHTML = '';
    }
    $('#side').innerHTML = `
      <div class="reflex-question">${q.question}</div>
      ${q.kind === 'barre' ? '<p class="muted" style="margin-top:-6px">Fais glisser autour du bateau, ou flèches ← → (Maj pour aller plus vite), puis Valider (Entrée).</p>' : ''}
      <div class="answers">${q.choices.map((c) => `<button class="btn ${c.cls || ''}" data-id="${c.id}">${c.label}${c.key && c.key.length === 1 ? ` <span class="kbd">${c.key}</span>` : ''}</button>`).join('')}</div>
      <div class="feedback" id="fb"></div>`;
    $('#side').querySelectorAll('.answers .btn').forEach((b) => b.addEventListener('click', () => answer(b.dataset.id)));
  };

  const newQ = () => {
    locked = false;
    const kind = mode.id === 'mix' ? pick(Object.keys(GEN)) : mode.id;
    q = GEN[kind]();
    tQ = performance.now();
    drawQ();
  };

  const answer = (id) => {
    if (locked || !running) return;
    locked = true;
    total++;
    let ok;
    let msg;
    if (q.kind === 'barre') {
      const t = twa(q.heading, q.wind);
      const a = Math.abs(t);
      const inRange = a >= q.target.range[0] && a <= q.target.range[1];
      const tackOk = q.target.id === 'debout' || tackOf(q.heading, q.wind) === q.tack;
      ok = inRange && tackOk;
      $('#ring').innerHTML = `<g opacity=".55">${allureRing(q.wind, 150, 190, true)}</g>`;
      msg = ok
        ? `Bien barré ! ${Math.round(a)}° du vent, ${TACKS[tackOf(q.heading, q.wind)].label.toLowerCase()}.`
        : `${!inRange ? `Tu es à ${Math.round(a)}° du vent (${allureOf(t).label.toLowerCase()}), il fallait ${q.target.range[0]}–${q.target.range[1]}°. ` : ''}${!tackOk ? `Mauvaise amure : le vent doit arriver par ${q.tack === 'tribord' ? 'la droite' : 'la gauche'}.` : ''}`;
    } else {
      ok = id === q.answer;
      msg = q.explain();
    }
    const dt = (performance.now() - tQ) / 1000;
    let fb;
    if (ok) {
      streak++;
      good++;
      const fast = mix ? Math.round(SPEED_MAX * Math.max(0, 1 - dt / SPEED_WINDOW)) : Math.max(0, Math.round(5 - dt));
      speedBonus += fast;
      const pts = 10 + Math.min(10, (streak - 1) * 2) + fast;
      score += pts;
      fb = `+${pts}${mix ? ` (⚡ +${fast} rapidité, ${Math.round(dt)} s)` : ''} · ${msg}`;
    } else {
      streak = 0;
      fb = `✗ ${msg}`;
    }
    const entry = { q, id, ok, fb };
    mark(entry);
    $('#hScore').textContent = mix ? `${score} pts · ${total}/${MIX_QUESTIONS}` : `${score} pts`;
    $('#hCombo').textContent = streak > 1 ? `🔥 x${streak}` : '';
    if (mix) {
      history.push(entry);
      nav(history.length - 1);
      return;
    }
    timeoutId = setTimeout(() => running && newQ(), ok ? 900 : 2200);
  };

  // Réponse affichée : explication, bonne réponse en vert, la sienne en rouge si elle était fausse.
  const mark = (e) => {
    $('#fb').className = `feedback ${e.ok ? 'ok' : 'ko'}`;
    $('#fb').innerHTML = e.fb;
    if (e.q.kind === 'barre') $('#ring').innerHTML = `<g opacity=".55">${allureRing(e.q.wind, 150, 190, true)}</g>`;
    $('#side').querySelectorAll('.answers .btn').forEach((b) => {
      if (e.q.kind !== 'barre' && b.dataset.id === e.q.answer) b.classList.add('starboard');
      else if (b.dataset.id === e.id && !e.ok) b.classList.add('port');
      b.disabled = true;
    });
  };

  // Grand mix : boutons pour revenir sur les questions jouées et passer à la suite.
  const nav = (i) => {
    const last = history.length - 1;
    const el = document.createElement('div');
    el.className = 'review-nav';
    const nextLabel = i < last ? 'Suivante ▶' : !running ? 'Mon score ▶' : total >= MIX_QUESTIONS ? 'Voir mon score ▶' : 'Question suivante ▶';
    el.innerHTML = `
      ${i > 0 ? '<button class="btn" data-nav="prev">◀ Précédente <span class="kbd">←</span></button>' : '<span></span>'}
      <small class="muted">Question ${i + 1} / ${MIX_QUESTIONS}</small>
      <button class="btn primary" data-nav="next">${nextLabel} <span class="kbd">Entrée</span></button>`;
    el.querySelector('[data-nav="next"]').addEventListener('click', () => next(i));
    el.querySelector('[data-nav="prev"]')?.addEventListener('click', () => showPast(i - 1));
    $('#side').appendChild(el);
    el.querySelector('[data-nav="next"]').focus({ preventScroll: true });
    // sur téléphone, le bouton « suivante » tombe sous l'écran : on l'amène en vue
    requestAnimationFrame(() => el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
    viewing = i;
  };
  let viewing = -1;
  const showPast = (i) => {
    q = history[i].q;
    locked = true;
    drawQ();
    mark(history[i]);
    nav(i);
  };
  const next = (i) => {
    if (i < history.length - 1) showPast(i + 1);
    else if (!running) results();
    else if (total >= MIX_QUESTIONS) finish();
    else newQ();
  };

  // Barre : orientation par glisser.
  let dragging = false;
  const fromPointer = (e) => {
    if (!q || q.kind !== 'barre' || locked) return;
    const pt = stage.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(stage.getScreenCTM().inverse());
    q.heading = norm360((Math.atan2(p.x, -p.y) * 180) / Math.PI);
    $('#boat').innerHTML = boatSVG({ heading: q.heading, windFrom: q.wind });
  };
  stage.addEventListener('pointerdown', (e) => {
    dragging = true;
    stage.setPointerCapture(e.pointerId);
    fromPointer(e);
  });
  stage.addEventListener('pointermove', (e) => dragging && fromPointer(e));
  stage.addEventListener('pointerup', () => (dragging = false));

  const onKey = (e) => {
    if (document.querySelector('.ceremony-back')) return; // la cérémonie de grade est au-dessus
    if (mix && locked && viewing >= 0 && $('.review-nav')) {
      if (e.key === 'Enter' || e.key === 'ArrowRight') next(viewing);
      else if (e.key === 'ArrowLeft' && viewing > 0) showPast(viewing - 1);
      else return;
      e.preventDefault();
      return;
    }
    if (!running || !q) return;
    if (q.kind === 'barre') {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        if (locked) return;
        q.heading = norm360(q.heading + (e.key === 'ArrowLeft' ? -1 : 1) * (e.shiftKey ? 15 : 5));
        $('#boat').innerHTML = boatSVG({ heading: q.heading, windFrom: q.wind });
        e.preventDefault();
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        answer('ok');
        e.preventDefault();
      }
      return;
    }
    const c = q.choices.find((x) => x.key === e.key);
    if (c) {
      answer(c.id);
      e.preventDefault();
    }
  };
  window.addEventListener('keydown', onKey);

  const tick = () => {
    if (mix) {
      // la jauge montre le bonus de rapidité qui fond, et le compteur les questions restantes
      const dt = (performance.now() - tQ) / 1000;
      $('#hTimer').style.width = `${locked ? 0 : Math.max(0, 1 - dt / SPEED_WINDOW) * 100}%`;
      $('#hTimer').parentElement.title = 'Bonus de rapidité';
      raf = requestAnimationFrame(tick);
      return;
    }
    const left = Math.max(0, (tEnd - performance.now()) / 1000);
    $('#hTimer').style.width = `${(left / DURATION) * 100}%`;
    if (left <= 0) return finish();
    raf = requestAnimationFrame(tick);
  };

  const start = () => {
    score = 0;
    streak = 0;
    good = 0;
    total = 0;
    speedBonus = 0;
    history = [];
    viewing = -1;
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
    results(record);
  };

  const results = (record = false) => {
    viewing = -1;
    const pct = total ? Math.round((good / total) * 100) : 0;
    const msg = pct >= 90 ? 'Réflexes de skipper ! 🏆' : pct >= 70 ? 'Bien joué, encore un peu d’entraînement ⛵' : 'Révise la théorie et retente ta chance 📖';
    $('#side').innerHTML = `
      <div class="reflex-question">${mix ? 'Terminé !' : 'Temps écoulé !'}</div>
      <div class="big-score">${score} pts</div>
      <p>${good} bonne${good > 1 ? 's' : ''} réponse${good > 1 ? 's' : ''} sur ${total} (${pct} %)${record && score > 0 ? ' · <b style="color:var(--link)">Nouveau record !</b>' : ` · Record : ${store.reflex(mode.id)} pts`}</p>
      ${mix ? `<p>⚡ Bonus de rapidité : <b>+${speedBonus} pts</b></p>` : ''}
      <p class="muted">${msg}</p>
      ${mix && history.some((e) => !e.ok) ? `<h4 style="margin:8px 0 4px">À revoir</h4><ul class="review-list">${history.map((e, i) => (e.ok ? '' : `<li><button class="linklike" data-past="${i}">${i + 1}. ${e.q.question.replace(/<[^>]+>/g, '')}</button></li>`)).join('')}</ul>` : ''}
      <div class="answers">${mix && history.length ? '<button class="btn wide" id="review">🔍 Revoir mes réponses</button>' : ''}<button class="btn primary wide" id="again">🔁 Rejouer</button><a class="btn wide" href="#/apprendre/${mode.id === 'manoeuvre' ? 'manoeuvres' : mode.id === 'amure' ? 'amures' : 'allures'}">📖 Revoir la leçon</a></div>`;
    $('#again').addEventListener('click', start);
    $('#review')?.addEventListener('click', () => showPast(0));
    $('#side').querySelectorAll('[data-past]').forEach((b) => b.addEventListener('click', () => showPast(Number(b.dataset.past))));
  };

  // écran d'accueil de la partie
  q = GEN[mode.id === 'mix' ? 'amure' : mode.id]();
  drawQ();
  $('#side').innerHTML = `
    <div class="reflex-question">${mode.title}</div>
    <p class="muted">${mode.text}</p>
    <ul class="help-list">${mix
      ? `<li>${MIX_QUESTIONS} questions, pas de chrono : personne ne te presse.</li><li>Bonne réponse : +10, plus un bonus de combo.</li><li>⚡ Bonus de rapidité : jusqu’à +${SPEED_MAX} si tu réponds tout de suite, il fond en ${SPEED_WINDOW} secondes (la jauge en haut).</li><li>Après chaque réponse, lis l’explication puis clique <b>Question suivante</b>. Tu peux revenir sur les questions précédentes.</li>`
      : `<li>${DURATION} secondes, autant de questions que possible.</li><li>Bonne réponse : +10, plus un bonus de rapidité et de combo.</li>`}<li>Raccourcis clavier affichés sur les boutons.</li></ul>
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
