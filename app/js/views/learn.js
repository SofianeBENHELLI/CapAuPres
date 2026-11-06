// « Apprendre » : parcours de 7 leçons. Chaque leçon = contenu interactif + quiz de validation.
import { LESSONS, lessonById } from '../data/lessons.js';
import { LESSON_VIEWS } from './theory.js';
import { matelotage, TABS as MATELOT_TABS } from './matelotage.js';
import { GEN } from './reflexes.js';
import { boatSVG, windArrowSVG } from '../ui/boat.js';
import { landLayer, SEA_DEFS, fx, OSM_CREDIT, bindMarkPopovers, MARK_INFO, markIcon } from '../ui/map.js';
import { CLIMATE } from '../data/climate.js';
import { getBoat } from '../core/boats.js';
import { store } from '../store.js';
import { XP } from '../core/progress.js';
import { confetti, celebrate } from '../ui/fx.js';
import { PLACES, START } from '../core/levels.js';
import { review, dueItems, questionOf, qid } from '../core/srs.js';
import { recordForSession } from './session.js';
import { BAY } from '../data/bay.js';

const PASS = 80; // % de bonnes réponses pour valider

export function render(root, params) {
  if (params[0] === 'revision') return renderReview(root);
  const lesson = lessonById(params[0]);
  if (!lesson) return renderPath(root);
  if (params[1] === 'quiz') return renderQuiz(root, lesson);
  return renderLesson(root, lesson, params[1]);
}

// ---------------------------------------------------------------- Le chemin
function renderPath(root) {
  const done = LESSONS.filter((l) => store.lesson(l.id)?.done).length;
  const current = LESSONS.find((l) => !store.lesson(l.id)?.done);
  root.innerHTML = `
    <div class="section-title"><h1>Apprendre</h1><span class="pill">🎓 ${done} / ${LESSONS.length} leçons</span></div>
    <p class="muted" style="margin-top:-6px">Sept leçons pour comprendre le vent, ton bateau, ses nœuds et la baie. Chaque leçon se valide par un petit quiz (${PASS} % de bonnes réponses) et rapporte <b>${XP.lesson} XP</b>, +${XP.perfectQuiz} XP pour un sans-faute.</p>
    ${dueItems(store.srs).length ? `<a class="card review-banner" href="#/apprendre/revision"><span>🔁</span><div><b>Révisions du jour : ${dueItems(store.srs).length} question${dueItems(store.srs).length > 1 ? 's' : ''}</b><span class="muted">Les questions ratées reviennent jusqu’à ce qu’elles soient acquises.</span></div><span class="btn primary small">Réviser</span></a>` : ''}
    <div class="learn-layout">
      <ol class="lesson-path">
        ${LESSONS.map((l, i) => {
          const rec = store.lesson(l.id);
          const state = rec?.done ? 'done' : l === current ? 'current' : 'todo';
          return `<li class="lp-node ${state} ${i % 2 ? 'right' : 'left'}">
            <a href="#/apprendre/${l.id}">
              <span class="lp-dot">${rec?.done ? '✓' : l.icon}</span>
              <span class="lp-card">
                <small>Leçon ${l.num}${rec?.done ? ` · quiz ${rec.best} %` : ''}</small>
                <b>${l.title}</b>
                <span class="muted">${l.summary}</span>
                ${state === 'current' ? '<span class="btn primary small">Commencer →</span>' : ''}
              </span>
            </a>
          </li>`;
        }).join('')}
      </ol>
      <aside class="learn-side">
        <a class="card side-link" href="#/lexique">
          <b>📖 Lexique</b>
          <span class="muted">Tous les mots du marin : bôme, choquer, taquet coinceur…</span>
        </a>
        <a class="card side-link" href="#/apprendre/matelotage/noeuds">
          <b>🪢 Les nœuds</b>
          <span class="muted">Huit, chaise, taquet : pas à pas, en animation.</span>
        </a>
        <a class="card side-link" href="#/apprendre/reglages">
          <b>🎯 Atelier réglages</b>
          <span class="muted">Une situation au hasard : règle ton ${getBoat().name} et compare avec les moniteurs.</span>
        </a>
        <a class="card side-link" href="#/reflexes">
          <b>⚡ Réflexes</b>
          <span class="muted">Mini-jeux de 45 secondes pour ancrer les bases : amures, allures, manœuvres.</span>
        </a>
        <a class="card side-link" href="#/seance">
          <b>👩‍🏫 Séance au club</b>
          <span class="muted">Ton moniteur a préparé une séance ? Rejoins-la avec son QR code.</span>
        </a>
        <a class="card side-link" href="#/naviguer">
          <b>⛵ Mettre en pratique</b>
          <span class="muted">Les missions dans la baie de La Baule, au départ du club.</span>
        </a>
      </aside>
    </div>`;
}

// ---------------------------------------------------------------- Révisions espacées
function renderReview(root) {
  const ids = dueItems(store.srs).slice(0, 8);
  if (!ids.length) {
    root.innerHTML = `<div class="quiz-card card quiz-result"><div class="big-score">✓</div><h2>Rien à revoir aujourd’hui</h2>
      <p class="muted">Les questions que tu rates reviennent automatiquement dans tes révisions : le jour même, puis après 1, 3, 7 et 14 jours si tu réponds juste.</p>
      <a class="btn primary" href="#/apprendre">Retour aux leçons</a></div>`;
    return null;
  }
  const qs = ids.map(questionOf).filter(Boolean).map(({ q, id }) => textQuestion(q, id));
  return renderQuiz(root, LESSONS[0], qs);
}

// ---------------------------------------------------------------- Une leçon
function renderLesson(root, lesson, tab) {
  const i = LESSONS.indexOf(lesson);
  const prev = LESSONS[i - 1];
  const next = LESSONS[i + 1];
  const rec = store.lesson(lesson.id);
  root.innerHTML = `
    <div class="lesson-head">
      <a class="btn small ghost" href="#/apprendre">← Leçons</a>
      <div class="lesson-steps">${LESSONS.map((l) => `<a href="#/apprendre/${l.id}" class="${l === lesson ? 'on' : store.lesson(l.id)?.done ? 'ok' : ''}" title="${l.title}"></a>`).join('')}</div>
    </div>
    <div class="section-title"><h1>${lesson.icon} ${lesson.title}</h1><span class="pill">Leçon ${lesson.num} / ${LESSONS.length}</span></div>
    <p class="muted" style="margin-top:-6px">${lesson.summary}</p>
    ${lesson.id === 'reglages' ? '<nav class="tabs" id="subtabs"><button class="active" data-v="reglages">🎛️ Les réglages</button><button data-v="atelier">🎯 Atelier : à toi de régler</button></nav>' : ''}
    ${lesson.id === 'matelotage' ? `<nav class="tabs" id="subtabs">${MATELOT_TABS.map((t) => `<button class="${t.id === (tab || 'bateau') ? 'active' : ''}" data-v="${t.id}">${t.label}</button>`).join('')}</nav>` : ''}
    <div id="lesson-body"></div>
    <div class="card lesson-cta">
      <div>
        <b>${rec?.done ? `✓ Leçon validée (meilleur quiz : ${rec.best} %)` : 'Tu as tout compris ?'}</b>
        <span class="muted">Valide la leçon avec un quiz rapide : ${PASS} % de bonnes réponses pour gagner ${XP.lesson} XP.</span>
      </div>
      <div class="row">
        ${prev ? `<a class="btn" href="#/apprendre/${prev.id}">← ${prev.title}</a>` : ''}
        <a class="btn primary" href="#/apprendre/${lesson.id}/quiz">${rec?.done ? 'Refaire le quiz' : 'Passer le quiz ✓'}</a>
        ${next ? `<a class="btn" href="#/apprendre/${next.id}">${next.title} →</a>` : ''}
      </div>
    </div>`;
  const body = root.querySelector('#lesson-body');
  let cleanup = null;
  const show = (id) => {
    if (cleanup) cleanup();
    body.innerHTML = '';
    if (lesson.id === 'matelotage') cleanup = matelotage(body, id) || null;
    else cleanup = id === 'baie' ? baieLesson(body) : LESSON_VIEWS[id](body) || null;
  };
  show(lesson.id === 'matelotage' ? tab || 'bateau' : lesson.id);
  root.querySelector('#subtabs')?.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    root.querySelectorAll('#subtabs button').forEach((x) => x.classList.toggle('active', x === b));
    show(b.dataset.v);
  });
  return () => cleanup && cleanup();
}

// ---------------------------------------------------------------- Leçon 7 : la baie
// Ligne des 300 m : la Grande plage décalée de 300 m vers le large.
function band300() {
  const c = { x: 2600, y: -2200 };
  // la Grande plage seulement : du Pouliguen (au nord de la base) jusqu'avant le port de Pornichet
  const beach = BAY.mainland.filter(([x, y]) => x > 150 && x < 4700 && y > 150);
  return beach
    .filter((_, i) => i % 3 === 0)
    .map(([x, y]) => {
      const d = Math.hypot(c.x - x, c.y - y) || 1;
      return `${fx(x + ((c.x - x) / d) * 300)},${fx(-(y + ((c.y - y) / d) * 300))}`;
    })
    .join(' ');
}

function baieLesson(el) {
  const box = { minX: -900, maxX: 6200, minY: -3300, maxY: 1900 };
  const w = box.maxX - box.minX;
  const h = box.maxY - box.minY;
  const k = 900 / w;
  const evens = PLACES.evens;
  const windCard = (from, title, text) => `
    <div class="wind-card">
      <svg viewBox="-40 -40 80 80"><circle r="36" fill="var(--sky-soft)"/><g style="color:var(--navy)">${windArrowSVG(from, 24)}</g></svg>
      <div><b>${title}</b><span class="muted">${text}</span></div>
    </div>`;
  el.innerHTML = `
  <div class="theory-grid">
    <div class="card" style="padding:12px">
      <div style="position:relative">
        <svg class="bay-lesson-map" viewBox="${box.minX} ${-box.maxY} ${w} ${h}">
          ${SEA_DEFS}
          <rect x="${box.minX - 2000}" y="${-box.maxY - 2000}" width="${w + 4000}" height="${h + 4000}" fill="url(#seaGrad)"/>
          ${landLayer(k)}
          <circle cx="${START.x}" cy="${-START.y}" r="${fx(7 / k)}" fill="#64c5f1" stroke="#fff" stroke-width="${fx(2 / k)}"/>
          <circle cx="380" cy="847" r="${fx(55 / k)}" class="danger-zone"/>
          <circle cx="${evens.x}" cy="${-evens.y}" r="${fx(40 / k)}" class="danger-zone"/>
          <text x="900" y="1050" class="map-note" font-size="${fx(12 / k)}">⚠️ Rochers</text>
          <text x="${evens.x + 250}" y="${-evens.y + 450}" class="map-note" font-size="${fx(12 / k)}">⚠️ Cailloux autour des Évens</text>
          <polyline points="${band300()}" class="band300" stroke-width="${fx(2.5 / k)}" style="stroke-dasharray:${fx(8 / k)} ${fx(6 / k)}"/>
          <text x="2700" y="-1000" class="map-note" font-size="${fx(11 / k)}">Bande des 300 m : 5 nœuds max</text>
        </svg>
        <div class="map-credit">${OSM_CREDIT}</div>
      </div>
      <p class="muted" style="margin:8px 4px 0;font-size:13px">La baie de La Baule, du Pouliguen à Pornichet. Point bleu : départ des missions, devant la base du CNBPP.</p>
    </div>
    <div>
      <div class="card">
        <h2 class="h3">🌬️ Les vents de la baie</h2>
        ${windCard(240, 'Brise thermique de sud-ouest', 'L’après-midi en été : la terre chauffe et aspire l’air de la mer. Vent régulier qui forcit vers 15–16 h.')}
        ${windCard(315, 'Noroît (nord-ouest)', 'Après le passage d’un front : vent frais et rafaleux, mer agitée au large.')}
        ${windCard(45, 'Vent de terre (nord-est)', 'Le matin ou par beau temps sec : souvent faible et irrégulier près de la plage.')}
      </div>
      <div class="card" style="margin-top:16px">
        <h2 class="h3">🪨 Les dangers cachés</h2>
        <ul class="help-list" style="color:var(--ink);font-size:14px">
          <li><b>Les Impairs</b> : un plateau de roches à environ 1 km à l’est du club, signalé par la tourelle verte des Petits Impairs. Les routes vers La Baule passent juste à côté !</li>
          <li><b>Basse Saint-François</b> : une roche isolée au milieu de la baie, à 3,3 km du club, <b>sans balise</b>.</li>
          <li><b>Pointe de Penchâteau</b>, <b>îlot des Évens</b>, <b>La Pierre Percée</b> : cailloux tout autour, surtout à marée basse.</li>
        </ul>
        <p class="muted" style="font-size:13px;margin:0">Sur la carte : zones hachurées = récifs, croix = roches isolées. Dans les missions, les toucher, c’est l’échouage.</p>
      </div>
      <div class="card" style="margin-top:16px">
        <h2 class="h3">🛟 Les règles d’or</h2>
        <ul class="help-list" style="color:var(--ink);font-size:14px">
          <li><b>Avant de partir :</b> météo, gilet de sauvetage, et quelqu’un au club sait où tu vas.</li>
          <li><b>Bande des 300 m :</b> vitesse limitée à 5 nœuds, respect des zones de baignade (bouées jaunes) ; on rejoint le large par les chenaux balisés.</li>
          <li><b>Dangers :</b> rochers de la pointe de Penchâteau, cailloux autour de l’îlot des Évens et de la Pierre Percée : garde de l’eau !</li>
          <li><b>Balises cardinales :</b> elles indiquent de quel côté passer (Nord = passer au nord de la balise).</li>
          <li><b>Chavirage :</b> on reste avec son bateau, on ne nage jamais vers la plage.</li>
        </ul>
      </div>
    </div>
  </div>
  ${balisesSection()}
  ${climateSection()}`;
  bindMarkPopovers(el.querySelector('.bay-lesson-map').parentElement);
  return null;
}

// Balises réellement présentes dans la baie (OpenStreetMap), avec un exemple nommé.
function balisesSection() {
  const byKind = new Map();
  BAY.marks.forEach(([name, x, y, kind]) => {
    const e = byKind.get(kind) || { n: 0, ex: '' , d: Infinity };
    e.n++;
    const d = Math.hypot(x, y);
    if (name && d < e.d) {
      e.ex = name;
      e.d = d;
    }
    byKind.set(kind, e);
  });
  const order = ['lateral_port', 'lateral_starboard', 'cardinal_N', 'cardinal_S', 'cardinal_W', 'cardinal_E', 'isolated_danger', 'special', 'lighthouse', 'light'];
  const rows = order.filter((k) => byKind.has(k)).map((k) => {
    const e = byKind.get(k);
    const info = MARK_INFO[k];
    return `<div class="mark-row">${markIcon(k, 34)}<div><b>${info.label}</b> <small class="muted">× ${e.n}${e.ex ? ` · ex. ${e.ex}` : ''}</small><span>${info.text}</span></div></div>`;
  }).join('');
  return `<div class="card" style="margin-top:16px">
    <h2 class="h3">🚩 Les balises de la baie</h2>
    <p class="muted" style="margin-top:0">Les ${BAY.marks.length} marques de navigation présentes entre Le Pouliguen et Pornichet (données OpenStreetMap, à vérifier sur la carte marine du SHOM). Touche une balise sur la carte pour sa fiche. Cette carte sert à apprendre : ne l’utilise jamais pour naviguer.</p>
    <div class="mark-grid">${rows}</div>
  </div>`;
}

// Climatologie : rose des vents du mois et cycle de la journée (12 ans de données ERA5).
function climateSection() {
  const m = new Date().getMonth();
  const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const rose = CLIMATE.months[m].rose;
  const max = Math.max(...rose.map((c) => c[0] + c[1] + c[2]));
  const R = 80;
  const COL = ['#9fdcf7', '#2a9fd6', '#243150'];
  let bars = '';
  rose.forEach((c, i) => {
    let r0 = 12;
    c.forEach((p, k) => {
      const r1 = r0 + (p / max) * R;
      const a1 = ((i * 22.5 - 9) * Math.PI) / 180;
      const a2 = ((i * 22.5 + 9) * Math.PI) / 180;
      const P = (a, r) => `${fx(r * Math.sin(a))},${fx(-r * Math.cos(a))}`;
      if (p > 0) bars += `<path d="M${P(a1, r0)} L${P(a1, r1)} A${fx(r1)},${fx(r1)} 0 0 1 ${P(a2, r1)} L${P(a2, r0)} A${fx(r0)},${fx(r0)} 0 0 0 ${P(a1, r0)} Z" fill="${COL[k]}"/>`;
      r0 = r1;
    });
  });
  const lbl = ['N', 'E', 'S', 'O'].map((t, i) => `<text x="${fx(Math.sin((i * Math.PI) / 2) * 104)}" y="${fx(-Math.cos((i * Math.PI) / 2) * 104 + 4)}" text-anchor="middle" font-size="12" font-weight="700" fill="var(--muted)">${t}</text>`).join('');
  const di = CLIMATE.diurnal[m].filter((d) => d.h >= 8 && d.h <= 20);
  const day = di.map((d) => `<div class="hour"><svg viewBox="-12 -12 24 24" width="26" height="26"><g style="color:var(--navy)" transform="scale(.32)">${windArrowSVG(d.dir, 26)}</g></svg><b>${Math.round(d.kn)}</b><small>${d.h} h</small></div>`).join('');
  return `<div class="card" style="margin-top:16px">
    <h2 class="h3">📊 Le vent dans la baie en ${MOIS[m]} (12 ans de mesures)</h2>
    <div class="climate-grid">
      <div>
        <svg viewBox="-115 -115 230 230" class="rose" aria-label="Rose des vents">
          <circle r="${12 + R}" fill="none" stroke="var(--line)"/><circle r="${12 + R / 2}" fill="none" stroke="var(--line)" stroke-dasharray="3 4"/>${bars}${lbl}
        </svg>
        <div class="legend"><span><i style="background:${COL[0]}"></i>&lt; 8 nd</span><span><i style="background:${COL[1]}"></i>8–15 nd</span><span><i style="background:${COL[2]}"></i>&gt; 15 nd</span></div>
      </div>
      <div>
        <p style="margin-top:0">D’où vient le vent, de 9 h à 19 h. Vent moyen : <b>${CLIMATE.months[m].meanKn} nœuds</b>. Brise thermique franche : <b>${Math.round(CLIMATE.months[m].thermal.freq * 100)} %</b> des jours.</p>
        <b>Au fil de la journée</b>
        <div class="hours">${day}</div>
        <div class="callout"><b>👩‍🏫 Pour les moniteurs :</b> en été, les créneaux de <b>14 h à 17 h</b> réunissent 2,7 fois plus souvent des conditions idéales pour débuter (5–14 nœuds, vent de mer régulier) que la fin de matinée (23 % des heures contre 8–9 %). Résultat trouvé sur 2014–2021 et confirmé à l’identique sur 2022–2025.</div>
      </div>
    </div>
    <p class="muted" style="font-size:12px;margin:8px 0 0">Source : réanalyse ERA5 (Open-Meteo), point au large du Croisic, 2014–2025. Le modèle (~30 km) lisse la brise locale : ce sont des tendances, pas une prévision.</p>
  </div>`;
}

// ---------------------------------------------------------------- Quiz
const shuffle = (a) => {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
};

function textQuestion(x, id) {
  const choices = shuffle(x.c.map((text, i) => ({ text, ok: i === 0 })));
  return { kind: 'text', q: x.q, choices, e: x.e, id };
}

function buildQuiz(lesson) {
  // questions à revoir de cette leçon d'abord, puis des nouvelles
  const due = new Set(dueItems(store.srs));
  const indexed = lesson.quiz.map((x, i) => ({ x, id: qid(lesson.id, i) }));
  const ordered = [...shuffle(indexed.filter((o) => due.has(o.id))), ...shuffle(indexed.filter((o) => !due.has(o.id)))];
  const qs = ordered.slice(0, 4).map(({ x, id }) => textQuestion(x, id));
  (lesson.visual || []).forEach((kind) => {
    const g = GEN[kind]();
    qs.push({
      kind: 'visual',
      q: g.question,
      gen: g,
      choices: g.choices.map((c) => ({ text: c.label.replace(/<[^>]+>/g, ''), ok: c.id === g.answer })),
      e: g.explain(),
    });
  });
  return shuffle(qs);
}

function visualSVG(g) {
  const P = (deg, r) => [r * Math.sin((deg * Math.PI) / 180), -r * Math.cos((deg * Math.PI) / 180)];
  const [wx, wy] = P(g.wind, 150);
  let arc = '';
  if (g.kind === 'manoeuvre') {
    const span = ((g.dir > 0 ? g.h2 - g.heading : g.heading - g.h2) % 360 + 360) % 360;
    const pts = [];
    for (let i = 0; i <= 30; i++) {
      const [x, y] = P(g.heading + (g.dir * span * i) / 30, 125);
      pts.push(`${fx(x)},${fx(y)}`);
    }
    arc = `<path d="M${pts.join(' L')}" fill="none" stroke="#ffd166" stroke-width="5" stroke-dasharray="2 10" stroke-linecap="round"/>
      <g transform="scale(1.5)">${boatSVG({ heading: g.h2, windFrom: g.wind, ghost: true })}</g>`;
  }
  return `<svg class="quiz-visual" viewBox="-185 -185 370 370">
    <circle r="182" fill="url(#qsea)"/><defs><radialGradient id="qsea"><stop offset="0" stop-color="#2a9fd6"/><stop offset="1" stop-color="#1b5f8c"/></radialGradient></defs>
    <g transform="translate(${fx(wx)},${fx(wy)})" style="color:#fff">${windArrowSVG(g.wind, 24)}</g>
    ${arc}
    <g transform="scale(1.5)">${boatSVG({ heading: g.heading, windFrom: g.wind })}</g>
  </svg>`;
}

function renderQuiz(root, lesson, custom = null) {
  const qs = custom || buildQuiz(lesson);
  let i = 0;
  let good = 0;
  const wrongIds = [];
  const show = () => {
    const q = qs[i];
    root.innerHTML = `
      <div class="lesson-head">
        <a class="btn small ghost" href="#/apprendre${custom ? '' : `/${lesson.id}`}">← ${custom ? 'Leçons' : 'Revoir la leçon'}</a>
        <div class="quiz-progress">${qs.map((_, j) => `<i class="${j < i ? 'past' : j === i ? 'now' : ''}"></i>`).join('')}</div>
      </div>
      <div class="quiz-card card">
        <small class="muted">${custom ? 'Révisions du jour' : `Quiz · ${lesson.title}`} · question ${i + 1} / ${qs.length}</small>
        <h1 class="h2">${q.q}</h1>
        ${q.kind === 'visual' ? visualSVG(q.gen) : ''}
        <div class="quiz-choices">${q.choices.map((c, j) => `<button class="btn qchoice" data-j="${j}">${c.text}</button>`).join('')}</div>
        <div class="feedback" id="qfb"></div>
        <button class="btn primary" id="qnext" hidden>${i < qs.length - 1 ? 'Question suivante →' : 'Voir mon résultat'}</button>
      </div>`;
    root.querySelectorAll('.qchoice').forEach((b) =>
      b.addEventListener('click', () => {
        const c = q.choices[+b.dataset.j];
        if (c.ok) good++;
        if (q.id) store.setSrs(review(store.srs, q.id, c.ok));
        if (q.id && !c.ok) wrongIds.push(q.id);
        root.querySelectorAll('.qchoice').forEach((x, j) => {
          x.disabled = true;
          if (q.choices[j].ok) x.classList.add('starboard');
          else if (x === b) x.classList.add('port');
        });
        const fb = root.querySelector('#qfb');
        fb.className = `feedback ${c.ok ? 'ok' : 'ko'}`;
        fb.innerHTML = `${c.ok ? '✓ Bravo !' : '✗ Pas tout à fait.'} ${q.e}`;
        const nx = root.querySelector('#qnext');
        nx.hidden = false;
        nx.focus();
      }),
    );
    root.querySelector('#qnext').addEventListener('click', () => {
      i++;
      if (i < qs.length) show();
      else result();
    });
  };
  const result = () => {
    const pct = Math.round((good / qs.length) * 100);
    if (custom) {
      // fin d'une séance de révisions
      const left = dueItems(store.srs).length;
      root.innerHTML = `<div class="quiz-card card quiz-result"><div class="big-score">${pct} %</div>
        <h2>${pct === 100 ? 'Révisions parfaites ! 🧠' : 'Révisions terminées'}</h2>
        <p>${good} / ${qs.length} bonnes réponses. Les questions ratées reviendront plus tôt, les autres s’espacent (1, 3, 7 puis 14 jours).</p>
        <p class="muted">${left ? `Encore ${left} question${left > 1 ? 's' : ''} à revoir aujourd’hui.` : 'Plus rien à revoir aujourd’hui.'}</p>
        <div class="row" style="justify-content:center">${left ? '<a class="btn primary" href="#/apprendre/revision">Continuer</a>' : ''}<a class="btn" href="#/apprendre">Retour aux leçons</a></div></div>`;
      if (pct >= 80) confetti(80);
      return;
    }
    const passed = pct >= PASS;
    const wasDone = store.lesson(lesson.id)?.done;
    recordForSession({ lesson: lesson.id, pct, wrong: wrongIds });
    if (passed) store.saveLesson(lesson.id, pct);
    const idx = LESSONS.indexOf(lesson);
    const next = LESSONS[idx + 1];
    const gained = passed && !wasDone ? XP.lesson + (pct === 100 ? XP.perfectQuiz : 0) : 0;
    root.innerHTML = `
      <div class="quiz-card card quiz-result">
        <div class="big-score">${pct} %</div>
        <h2>${passed ? (pct === 100 ? 'Sans faute ! 🏆' : 'Leçon validée ! ✓') : 'Presque !'}</h2>
        <p>${good} bonne${good > 1 ? 's' : ''} réponse${good > 1 ? 's' : ''} sur ${qs.length}.
          ${passed ? (gained ? `<b>+${gained} XP</b>` : '') : `Il faut ${PASS} % pour valider : relis la leçon et retente ta chance.`}</p>
        <div class="row" style="justify-content:center">
          ${passed && next ? `<a class="btn primary" href="#/apprendre/${next.id}">Leçon suivante : ${next.title} →</a>` : ''}
          ${passed && !next ? '<a class="btn primary" href="#/naviguer">⛵ Mettre en pratique dans la baie</a>' : ''}
          ${!passed ? `<a class="btn primary" href="#/apprendre/${lesson.id}">Revoir la leçon</a>` : ''}
          <button class="btn" id="again">Refaire le quiz</button>
          <a class="btn ghost" href="#/apprendre">Toutes les leçons</a>
        </div>
      </div>`;
    root.querySelector('#again').addEventListener('click', () => renderQuiz(root, lesson));
    if (passed) {
      confetti(pct === 100 ? 200 : 110);
      window.dispatchEvent(new CustomEvent('progress'));
      setTimeout(celebrate, 600);
    }
  };
  show();
}
