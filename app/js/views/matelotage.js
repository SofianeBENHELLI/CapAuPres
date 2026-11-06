// Leçon « Le bateau et les nœuds » : le bateau annoté, le lexique, les trois nœuds essentiels.
import { BOAT_LIST, getBoat } from '../core/boats.js';
import { TERMS, CATS, termById, termFor } from '../data/glossary.js';
import { KNOTS } from '../data/knots.js';
import { profileSVG, profileParts, gearIcon, GEAR_ICONS } from '../ui/gear.js';
import { mountKnot } from '../ui/rope.js';
import { store } from '../store.js';
import { celebrate } from '../ui/fx.js';

const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const boatName = (id) => BOAT_LIST.find((b) => b.id === id).name;

// Définition d'un terme pour un bateau donné (avec la précision propre au bateau s'il y en a une).
const defFor = (t, boat) => `${t.def}${t.note?.[boat] ? ` <span class="term-note">${boatName(boat)} : ${t.note[boat]}</span>` : ''}`;

export const TABS = [
  { id: 'bateau', label: '⛵ Le bateau' },
  { id: 'lexique', label: '📖 Lexique' },
  { id: 'noeuds', label: '🪢 Les nœuds' },
];

export function matelotage(body, tab = 'bateau') {
  if (tab === 'lexique') return lexique(body);
  if (tab === 'noeuds') return noeuds(body);
  return bateau(body);
}

// ---------------------------------------------------------------- Le bateau annoté
function bateau(body) {
  let boat = getBoat().id;
  let sel = null;
  const draw = () => {
    const parts = profileParts(boat);
    body.innerHTML = `
      <div class="card">
        <div class="row" style="justify-content:space-between;align-items:center">
          <h2 class="h3" style="margin:0">Les pièces ${boat === 'optimist' ? 'de l’' : 'du '}${boatName(boat)}</h2>
          <div class="seg" id="pboat">${BOAT_LIST.map((b) => `<button data-b="${b.id}" class="${b.id === boat ? 'active' : ''}">${b.name}</button>`).join('')}</div>
        </div>
        <p class="muted" style="margin:6px 0 0">Touche un numéro sur le schéma ou dans la liste pour voir la pièce et à quoi elle sert.</p>
        <div class="profile-layout">
          <div class="profile-wrap">${profileSVG(boat)}</div>
          <div>
            <div class="part-card" id="pcard" aria-live="polite"><b>👆 Choisis une pièce</b><span class="muted">Chaque bateau a son propre équipement : compare-les avec les boutons au-dessus.</span></div>
            <ol class="part-list">${parts.map((k) => `<li><button data-part="${k}">${esc(termById(k).term)}</button></li>`).join('')}</ol>
          </div>
        </div>
      </div>
      <div class="card" style="margin-top:16px">
        <h2 class="h3" style="margin-top:0">🔩 L’accastillage</h2>
        <p class="muted" style="margin-top:0">Les petites pièces qui guident et bloquent les cordages.</p>
        <div class="gear-grid">${Object.keys(GEAR_ICONS).map((id) => {
          const t = termById(id);
          const on = termFor(t, boat) && !(id === 'coinceur' && boat === 'optimist');
          return `<div class="gear-card ${on ? '' : 'off'}">${gearIcon(id, 52)}<div><b>${esc(t.term)}</b><span class="pill ${on ? 'ok' : ''}">${on ? `✓ sur ${boat === 'optimist' ? 'l’' : 'le '}${boatName(boat)}` : `pas sur ${boat === 'optimist' ? 'l’' : 'le '}${boatName(boat)}`}</span><p>${defFor(t, boat)}</p></div></div>`;
        }).join('')}</div>
      </div>`;
    const svg = body.querySelector('.profile');
    const pick = (k) => {
      sel = k;
      const t = termById(k);
      const n = parts.indexOf(k) + 1;
      body.querySelector('#pcard').innerHTML = `<b><span class="num">${n}</span> ${esc(t.term)}</b><span>${defFor(t, boat)}</span>`;
      svg.querySelectorAll('[data-part]').forEach((g) => g.classList.toggle('on', g.dataset.part === k));
      body.querySelectorAll('.part-list button').forEach((b) => b.classList.toggle('on', b.dataset.part === k));
    };
    svg.addEventListener('click', (e) => {
      const g = e.target.closest('[data-part]');
      if (g) pick(g.dataset.part);
    });
    svg.addEventListener('keydown', (e) => {
      const g = e.target.closest('.spot');
      if (g && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        pick(g.dataset.part);
      }
    });
    body.querySelector('.part-list').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (b) pick(b.dataset.part);
    });
    body.querySelector('#pboat').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      boat = b.dataset.b;
      const keep = sel;
      draw();
      if (keep && profileParts(boat).includes(keep)) pick(keep);
    });
  };
  draw();
}

// ---------------------------------------------------------------- Lexique
function lexique(body) {
  const boat = getBoat().id;
  let cat = 'all';
  let q = '';
  body.innerHTML = `
    <div class="card">
      <div class="lex-tools">
        <input id="lq" type="search" class="code-input" placeholder="Chercher un mot : bôme, choquer, taquet…" aria-label="Chercher dans le lexique"/>
        <div class="chips" id="lcat"><button data-c="all" class="chip active">Tout</button>${CATS.map((c) => `<button data-c="${c.id}" class="chip">${c.emoji} ${c.label}</button>`).join('')}</div>
      </div>
      <p class="muted" style="margin:8px 0 0">${TERMS.length} mots. Les précisions concernent ton bateau : <b>${esc(getBoat().name)}</b>.</p>
      <div id="lres"></div>
    </div>`;
  const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const draw = () => {
    const nq = norm(q.trim());
    const list = TERMS.filter((t) => (cat === 'all' || t.cat === cat) && (!nq || norm(t.term).includes(nq) || norm(t.def).includes(nq)));
    const groups = CATS.filter((c) => list.some((t) => t.cat === c.id));
    body.querySelector('#lres').innerHTML = list.length
      ? groups.map((c) => `<h2 class="lex-cat">${c.emoji} ${c.label}</h2><dl class="lex">${list.filter((t) => t.cat === c.id).sort((a, b) => a.term.localeCompare(b.term, 'fr')).map((t) => `
          <div class="lex-item ${termFor(t, boat) ? '' : 'other'}" id="lex-${t.id}">
            <dt>${t.icon ? gearIcon(t.icon, 30) : ''}${esc(t.term)}${termFor(t, boat) ? '' : `<span class="pill">${t.boats.map(boatName).join(', ')}</span>`}</dt>
            <dd>${defFor(t, boat)}</dd>
          </div>`).join('')}</dl>`).join('')
      : '<p class="muted">Aucun mot trouvé.</p>';
  };
  body.querySelector('#lq').addEventListener('input', (e) => {
    q = e.target.value;
    draw();
  });
  body.querySelector('#lcat').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    cat = b.dataset.c;
    body.querySelectorAll('#lcat button').forEach((x) => x.classList.toggle('active', x === b));
    draw();
  });
  draw();
}

// ---------------------------------------------------------------- Les nœuds
function noeuds(body) {
  let knot = KNOTS[0];
  let step = 0;
  let timer = 0;
  let view = null;
  const known = () => store.pref.knots || {};
  const draw = () => {
    clearInterval(timer);
    step = 0;
    body.innerHTML = `
      <div class="knot-pick">${KNOTS.map((k) => `<button class="card knot-btn ${k === knot ? 'on' : ''}" data-k="${k.id}"><span>${k.emoji}</span><b>${k.name}</b>${known()[k.id] ? '<small class="ok-txt">✓ Je sais le faire</small>' : ''}</button>`).join('')}</div>
      <div class="card knot-card">
        <div class="knot-stage" id="kstage"></div>
        <div class="knot-side">
          <h2 class="h3" style="margin-top:0">${knot.emoji} ${knot.name}</h2>
          <p><b>À quoi ça sert ?</b> ${knot.use}</p>
          <div class="knot-steps" id="ksteps">${knot.steps.map((s, i) => `<button class="kstep" data-i="${i}"><span class="num">${i + 1}</span><span>${s.text}</span></button>`).join('')}</div>
          <div class="row" style="margin-top:10px">
            <button class="btn small" id="kprev" aria-label="Étape précédente">◀</button>
            <button class="btn small primary" id="kplay">▶ Animer</button>
            <button class="btn small" id="knext" aria-label="Étape suivante">▶</button>
          </div>
          <div class="callout" style="margin-top:12px">💡 ${knot.tip}</div>
          <label class="know"><input type="checkbox" id="kknow" ${known()[knot.id] ? 'checked' : ''}/> Je sais faire ce nœud les yeux fermés</label>
        </div>
      </div>`;
    view = mountKnot(body.querySelector('#kstage'), knot);
    const set = (i) => {
      step = Math.max(0, Math.min(knot.steps.length - 1, i));
      view.show(step);
      body.querySelectorAll('.kstep').forEach((b, j) => b.classList.toggle('on', j === step));
    };
    set(0);
    body.querySelector('#kprev').onclick = () => (clearInterval(timer), set(step - 1));
    body.querySelector('#knext').onclick = () => (clearInterval(timer), set(step + 1));
    body.querySelector('#ksteps').onclick = (e) => {
      const b = e.target.closest('.kstep');
      if (b) (clearInterval(timer), set(+b.dataset.i));
    };
    body.querySelector('#kplay').onclick = () => {
      clearInterval(timer);
      set(0);
      timer = setInterval(() => (step >= knot.steps.length - 1 ? clearInterval(timer) : set(step + 1)), 1800);
    };
    body.querySelector('#kknow').onchange = (e) => {
      store.setPref('knots', { ...known(), [knot.id]: e.target.checked });
      window.dispatchEvent(new CustomEvent('progress'));
      celebrate();
      draw();
    };
    body.querySelector('.knot-pick').onclick = (e) => {
      const b = e.target.closest('.knot-btn');
      if (!b) return;
      knot = KNOTS.find((k) => k.id === b.dataset.k);
      draw();
    };
  };
  draw();
  return () => clearInterval(timer);
}
