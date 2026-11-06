import { BOATS, BOAT_LIST, polarSpeed, bestVmgAngles } from './boats.js';
import { MISSIONS, byId, stars, dailyChallenge } from './missions.js';
import { LESSONS, makeQuiz, makeQuestion } from './lessons.js';
import { createProgress, BADGES, RANKS } from './progress.js';
import { evaluate, fetchForecast, cardinal, LEVELS } from './conditions.js';
import { mountSim, drawBoat } from './sim-view.js';
import { REFS } from './refs.js';
import { rng } from './wind.js';

const P = createProgress();
const view = document.getElementById('view');
const toastBox = document.getElementById('toasts');
let sim = null;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtTime = (s) => `${Math.floor(s / 60)} min ${String(Math.round(s % 60)).padStart(2, '0')}`;

// ---------- Notifications, confettis ----------
function toast(html, kind = '') {
  const el = document.createElement('div');
  el.className = `toast ${kind}`; el.innerHTML = html;
  toastBox.append(el);
  setTimeout(() => el.classList.add('out'), 3200);
  setTimeout(() => el.remove(), 3800);
}
function confetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = document.createElement('canvas'); c.className = 'confetti'; document.body.append(c);
  c.width = innerWidth; c.height = innerHeight;
  const x = c.getContext('2d');
  const cols = ['#64C5F1', '#243150', '#ffd23f', '#e5484d', '#2fb36d'];
  const parts = Array.from({ length: 120 }, () => ({ x: innerWidth / 2, y: innerHeight / 3, vx: (Math.random() - 0.5) * 12, vy: Math.random() * -12 - 2, c: cols[Math.floor(Math.random() * 5)], r: Math.random() * 6 + 3 }));
  let n = 0;
  (function f() {
    x.clearRect(0, 0, c.width, c.height);
    for (const p of parts) { p.vy += 0.35; p.x += p.vx; p.y += p.vy; x.fillStyle = p.c; x.fillRect(p.x, p.y, p.r, p.r * 0.6); }
    if (n++ < 110) requestAnimationFrame(f); else c.remove();
  })();
}
P.on((e) => {
  if (e.type === 'badge') { toast(`<b>${e.badge.icon} Badge : ${esc(e.badge.name)}</b><br>${esc(e.badge.desc)}`, 'gold'); confetti(); }
  if (e.type === 'rank') { toast(`<b>Nouveau grade : ${esc(e.rank.name)} !</b>`, 'gold'); confetti(); }
  if (e.type === 'xp' && e.n > 0) toast(`+${e.n} XP`, 'xp');
  renderHeader();
});

// ---------- En-tête ----------
function renderHeader() {
  const r = P.rank();
  document.getElementById('rank-chip').innerHTML = `<span class="rank-name">${r.name}</span><span class="bar"><i style="width:${Math.round(r.pct * 100)}%"></i></span><small>${r.xp} XP</small>`;
}

// ---------- Météo partagée ----------
const FC_KEY = 'cnbpp-forecast';
let forecast = null;
try { forecast = JSON.parse(localStorage.getItem(FC_KEY) || 'null'); } catch { /* ignore */ }
async function loadForecast(force = false) {
  if (!force && forecast && Date.now() - forecast.at < 60 * 60 * 1000) return forecast;
  const hours = await fetchForecast();
  forecast = { at: Date.now(), hours };
  localStorage.setItem(FC_KEY, JSON.stringify(forecast));
  return forecast;
}
function currentHour(fc) {
  if (!fc) return null;
  const now = new Date();
  const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:00`;
  return fc.hours.find((h) => h.time === key) || fc.hours[0];
}
function levelBadge(ev) {
  return `<span class="level" style="--lv:${ev.color}">${ev.label}</span>`;
}

// ---------- Lancement d'une navigation ----------
function sail(mission, { wind, sea, daily, real } = {}) {
  const boatId = P.data.boat;
  const ref = REFS[mission.id]?.[boatId];
  const best = P.data.missions[mission.id]?.[boatId];
  document.body.classList.add('sailing');
  view.innerHTML = '<div id="sim-root"></div>';
  const warp = ref ? Math.max(3, Math.min(20, Math.round(ref / 300))) : 6;
  sim = mountSim(document.getElementById('sim-root'), {
    mission, boatId, wind, sea, warp, ghost: best?.ghost,
    onFinish: (r) => {
      if (r.demo) return { title: 'Démonstration terminée', stars: 0, ref, note: 'Le pilote automatique a fait le parcours. À toi maintenant !' };
      if (!mission.marks.length) return { title: 'Balade terminée' };
      const st = stars(r.time, daily ? null : ref, r.groundings);
      const ghost = r.track.filter((_, i) => i % 2 === 0).map((p) => ({ t: Math.round(p.t), x: Math.round(p.x), y: Math.round(p.y) }));
      P.missionResult(mission.id, boatId, { stars: st, time: r.time }, { ghost, total: MISSIONS.length, daily: daily || null, real });
      if (st === 3) confetti();
      return { title: st === 3 ? 'Parfait, moussaillon !' : 'Mission réussie !', stars: st, ref, note: best ? `Ton record : ${fmtTime(Math.min(best.time, r.time))}` : '' };
    },
    onExit: () => { sim = null; document.body.classList.remove('sailing'); route(); },
  });
}

// ---------- Vues ----------
const views = {};

views.accueil = () => {
  const d = dailyChallenge();
  const done = P.data.daily[d.key];
  const r = P.rank();
  const next = MISSIONS.find((m) => !P.data.missions[m.id]) || MISSIONS[0];
  const h = currentHour(forecast);
  view.innerHTML = `
  <section class="hero">
    <div>
      <p class="kicker">Club Nautique Baule Pouliguen Pornichet</p>
      <h1>Apprends la voile dans la baie de La Baule</h1>
      <p>Barre, règle tes voiles, lis le vent et la houle. Dix missions du Pouliguen au Grand Charpentier, quatre bateaux de l'école.</p>
      <div class="row"><a class="btn primary" href="#missions/${next.id}">Continuer : ${esc(next.title)}</a><a class="btn" href="#meteo">Conditions du jour</a></div>
    </div>
    <canvas class="hero-boat" width="260" height="260" aria-hidden="true"></canvas>
  </section>
  <section class="grid3">
    <article class="card">
      <h3>📅 Défi du jour</h3>
      <p><b>${esc(d.mission.title)}</b> en ${esc(BOATS[P.data.boat].name)}, vent ${d.wind.tws} nds de ${cardinal(d.wind.twd)}.</p>
      <p class="muted">Le même défi pour tous les élèves du club aujourd'hui.</p>
      ${done ? '<p class="ok">✓ Relevé aujourd\'hui</p>' : '<button class="btn primary" data-go="daily">Relever le défi</button>'}
    </article>
    <article class="card">
      <h3>🌤️ Dans la baie</h3>
      ${h ? `<p>${levelBadge(h.eval)}</p><p>${esc(h.eval.summary)}</p>${h.eval.warnings.slice(0, 1).map((w) => `<p class="muted">${esc(w.title)} : ${esc(w.text)}</p>`).join('')}` : '<p class="muted">Pas encore de prévision chargée.</p>'}
      <a class="btn" href="#meteo">Voir la météo</a>
    </article>
    <article class="card">
      <h3>🎖️ ${esc(r.name)}</h3>
      <div class="bar big"><i style="width:${Math.round(r.pct * 100)}%"></i></div>
      <p class="muted">${r.next ? `${r.toNext} XP avant ${r.next}` : 'Grade maximal !'} · série de ${P.streak()} jour(s)</p>
      <p>${Object.keys(P.data.badges).length} / ${BADGES.length} badges</p>
      <a class="btn" href="#profil">Mon carnet</a>
    </article>
  </section>`;
  view.querySelector('[data-go="daily"]')?.addEventListener('click', () => sail(d.mission, { wind: d.wind, daily: d.key }));
  heroBoat(view.querySelector('.hero-boat'));
  if (!forecast) loadForecast().then(() => location.hash === '#accueil' || location.hash === '' ? views.accueil() : 0).catch(() => {});
};

function heroBoat(c) {
  if (!c) return;
  const x = c.getContext('2d');
  let t = 0, alive = true;
  const b = BOATS[P.data.boat];
  (function f() {
    if (!c.isConnected || !alive) return;
    t += 0.016;
    x.clearRect(0, 0, 260, 260);
    x.fillStyle = '#64C5F1'; x.globalAlpha = 0.25; x.beginPath(); x.arc(130, 130, 120, 0, Math.PI * 2); x.fill(); x.globalAlpha = 1;
    drawBoat(x, b, { heading: 70 + Math.sin(t) * 6, twa: 100, twd: 170, sheet: 0.45, heel: 10, spi: false }, 130, 130, 4);
    requestAnimationFrame(f);
  })();
}

views.missions = (id) => {
  if (id && byId[id]) return missionDetail(byId[id]);
  const doneCount = (m) => Object.keys(P.data.missions[m.id] || {}).length;
  view.innerHTML = `<h1>Missions</h1>
  <p class="muted">Bateau : <b>${esc(BOATS[P.data.boat].name)}</b> · <a href="#flotte">changer</a></p>
  <div class="missions">${MISSIONS.map((m, i) => {
    const unlocked = i < 3 || MISSIONS.slice(0, i).filter((x) => P.data.missions[x.id]).length >= i - 2;
    const st = P.data.missions[m.id]?.[P.data.boat]?.stars || 0;
    return `<a class="mission card ${unlocked ? '' : 'locked'}" href="${unlocked ? `#missions/${m.id}` : '#missions'}">
      <span class="num">${m.n}</span><div><h3>${esc(m.title)}</h3><p class="muted">${esc(m.place)} · ${m.wind.tws} nds de ${cardinal(m.wind.twd)}</p>
      <p class="stars small">${'★'.repeat(st)}<span>${'★'.repeat(3 - st)}</span> ${doneCount(m) ? `<small>${doneCount(m)}/4 bateaux</small>` : ''}</p></div>
      ${unlocked ? '' : '<span class="lock">🔒</span>'}</a>`;
  }).join('')}</div>
  <article class="card"><h3>⛵ Navigation libre</h3><p>Pas de bouée, pas de chrono : la baie pour toi, dans les conditions de ton choix ou celles du jour.</p>
  <div class="row"><button class="btn" data-free="std">Brise d'ouest 12 nds</button><button class="btn primary" data-free="real">Conditions réelles</button></div></article>`;
  view.querySelectorAll('[data-free]').forEach((b) => b.addEventListener('click', () => freeSail(b.dataset.free === 'real')));
};

async function freeSail(real) {
  const base = { id: 'libre', title: 'Navigation libre', goal: 'Explore la baie', start: { x: 0, y: -230, heading: 180 }, marks: [], wind: { twd: 270, tws: 12, gust: 15, shift: 6 }, sea: { swellH: 0.6 } };
  if (real) {
    try {
      const h = currentHour(await loadForecast());
      base.wind = { twd: h.twd, tws: h.tws, gust: h.gust, shift: 8 };
      base.sea = { swellH: h.swellH || 0, swellDir: h.swellDir || 250, swellT: h.swellT };
      base.goal = `Conditions réelles : ${h.eval.summary}`;
      P.award('reel');
    } catch { toast('Météo indisponible hors ligne : conditions standard.'); }
  }
  sail(base, { real });
}

function missionDetail(m) {
  const res = P.data.missions[m.id] || {};
  const ev = evaluate({ tws: m.wind.tws, gust: m.wind.gust, twd: m.wind.twd, swellH: m.sea?.swellH, swellT: m.sea?.swellT });
  view.innerHTML = `<a href="#missions" class="back">← Missions</a>
  <article class="card mission-detail">
    <p class="kicker">Mission ${m.n} · ${esc(m.place)}</p>
    <h1>${esc(m.title)}</h1>
    <p class="story">${esc(m.story)}</p>
    <div class="facts">
      <div><small>Objectif</small><b>${esc(m.goal)}</b></div>
      <div><small>Vent</small><b>${m.wind.tws} nds (raf. ${m.wind.gust}) de ${cardinal(m.wind.twd)}</b></div>
      <div><small>Houle</small><b>${(m.sea?.swellH || 0).toFixed(1)} m</b></div>
      <div><small>Conditions</small>${levelBadge(ev)}</div>
    </div>
    ${ev.warnings.map((w) => `<p class="warning ${w.kind}"><b>${esc(w.title)}</b> : ${esc(w.text)}</p>`).join('')}
    <h3>Tes résultats</h3>
    <table class="tbl">${BOAT_LIST.map((b) => `<tr><td>${b.name}</td><td>${res[b.id] ? `${'★'.repeat(res[b.id].stars)} · ${fmtTime(res[b.id].time)}` : '<span class="muted">pas encore</span>'}</td><td class="muted">réf. ${fmtTime(REFS[m.id][b.id])}</td></tr>`).join('')}</table>
    <div class="row">
      <button class="btn primary" data-go>Larguer les amarres (${esc(BOATS[P.data.boat].name)})</button>
      <a class="btn" href="#ecole/${m.lesson}">Réviser la leçon</a>
    </div>
    <p class="muted small">Clavier : ← → barre, ↑ border, ↓ choquer, T virer, H rappel, P spi, + − zoom, ] accélérer le temps. Sur mobile : boutons et curseur.</p>
  </article>`;
  view.querySelector('[data-go]').addEventListener('click', () => sail(m));
}

views.ecole = (id) => {
  if (id === 'reflexes') return reflexes();
  const l = LESSONS.find((x) => x.id === id);
  if (l) return lesson(l);
  view.innerHTML = `<h1>École de voile</h1><p class="muted">Six leçons, chacune avec un quiz illustré. Les quiz se renouvellent à chaque fois.</p>
  <div class="grid3">${LESSONS.map((x) => `<a class="card lesson-card" href="#ecole/${x.id}"><span class="emoji">${x.icon}</span><h3>${esc(x.title)}</h3><p class="muted">${esc(x.intro)}</p>${P.data.lessons[x.id] != null ? `<p class="ok">Quiz : ${P.data.lessons[x.id]} %</p>` : ''}</a>`).join('')}
  <a class="card lesson-card accent" href="#ecole/reflexes"><span class="emoji">⚡</span><h3>Réflexes de marin</h3><p>60 secondes pour enchaîner un maximum de bonnes réponses : allures, penons, priorités.</p><p>Record : <b>${P.data.reflexBest}</b></p></a></div>`;
};

function lesson(l) {
  view.innerHTML = `<a href="#ecole" class="back">← École</a><article class="card lesson"><h1>${l.icon} ${esc(l.title)}</h1><p class="lead">${esc(l.intro)}</p>${l.body()}<button class="btn primary" data-quiz>Faire le quiz</button></article><div id="quiz"></div>`;
  view.querySelector('[data-quiz]').addEventListener('click', () => runQuiz(l));
}

function runQuiz(l) {
  const qs = makeQuiz(l.quiz, rng(Date.now() & 0xffffffff), 6);
  let i = 0, score = 0;
  const box = document.getElementById('quiz');
  box.scrollIntoView({ behavior: 'smooth' });
  const show = () => {
    if (i >= qs.length) {
      P.lessonResult(l.id, score, qs.length, LESSONS.length);
      box.innerHTML = `<article class="card quiz"><h2>${score} / ${qs.length}</h2><p>${score === qs.length ? 'Sans faute, bravo !' : score >= qs.length / 2 ? 'Bien joué, encore un effort pour le sans-faute.' : 'Relis la leçon et retente ta chance.'}</p><div class="row"><button class="btn" data-again>Recommencer</button><a class="btn primary" href="#ecole">Autres leçons</a></div></article>`;
      box.querySelector('[data-again]').onclick = () => runQuiz(l);
      if (score === qs.length) confetti();
      return;
    }
    const q = qs[i];
    box.innerHTML = `<article class="card quiz"><p class="kicker">Question ${i + 1} / ${qs.length}</p><h3>${esc(q.q)}</h3>${q.svg || ''}<div class="answers">${q.a.map((a, k) => `<button class="btn answer" data-k="${k}">${esc(a)}</button>`).join('')}</div></article>`;
    box.querySelectorAll('.answer').forEach((b) => b.addEventListener('click', () => {
      const k = +b.dataset.k;
      box.querySelectorAll('.answer').forEach((x) => { x.disabled = true; if (+x.dataset.k === q.ok) x.classList.add('good'); });
      if (k === q.ok) score++; else b.classList.add('bad');
      setTimeout(() => { i++; show(); }, 900);
    }));
  };
  show();
}

function reflexes() {
  const r = rng(Date.now() & 0xffffffff);
  const kinds = ['allure', 'penons', 'priorites', 'allure'];
  let score = 0, left = 60, timer = null, q;
  view.innerHTML = `<a href="#ecole" class="back">← École</a><article class="card quiz reflex"><div class="reflex-top"><b>⚡ Réflexes</b><span data-k="score">0</span><span data-k="time">60 s</span></div><div data-k="q"><p>Réponds vite et juste. Une erreur coûte 3 secondes.</p><button class="btn primary" data-start>C'est parti</button></div></article>`;
  const $ = (k) => view.querySelector(`[data-k="${k}"]`);
  const next = () => {
    q = makeQuestion(kinds[Math.floor(r() * kinds.length)], r);
    $('q').innerHTML = `<h3>${esc(q.q)}</h3>${q.svg || ''}<div class="answers">${q.a.map((a, k) => `<button class="btn answer" data-k="${k}">${esc(a)}</button>`).join('')}</div>`;
    $('q').querySelectorAll('.answer').forEach((b) => b.addEventListener('click', () => {
      if (+b.dataset.k === q.ok) { score++; $('score').textContent = score; } else { left -= 3; b.classList.add('bad'); }
      next();
    }));
  };
  view.querySelector('[data-start]').addEventListener('click', () => {
    next();
    timer = setInterval(() => {
      if (!view.contains($('time'))) return clearInterval(timer);
      left--; $('time').textContent = `${Math.max(0, left)} s`;
      if (left <= 0) {
        clearInterval(timer);
        const best = P.data.reflexBest;
        P.reflexResult(score);
        $('q').innerHTML = `<h2>${score} bonnes réponses</h2><p>${score > best ? 'Nouveau record !' : `Record : ${best}`}</p><button class="btn primary" data-again>Rejouer</button>`;
        $('q').querySelector('[data-again]').onclick = reflexes;
      }
    }, 1000);
  });
}

views.meteo = () => {
  view.innerHTML = `<h1>Conditions dans la baie</h1>
  <p class="muted">Un seul verdict pour tout le club, quel que soit le bateau : il se fonde sur <b>le vent</b> (moyen et rafales) et <b>la houle</b>. La direction du vent et le reste donnent des points d'attention. La décision finale revient au moniteur.</p>
  <div id="now" class="card"><p class="muted">Chargement de la prévision Open-Meteo…</p></div>
  <div id="timeline"></div>
  <article class="card"><h3>🎛️ Simulateur de conditions</h3><p class="muted">Joue avec les curseurs pour comprendre le verdict.</p>
    <div class="sliders">
      <label>Vent moyen <output data-o="tws"></output><input type="range" min="0" max="35" value="12" data-i="tws"></label>
      <label>Rafales <output data-o="gust"></output><input type="range" min="0" max="45" value="16" data-i="gust"></label>
      <label>Direction <output data-o="twd"></output><input type="range" min="0" max="350" step="10" value="250" data-i="twd"></label>
      <label>Houle <output data-o="swellH"></output><input type="range" min="0" max="35" value="6" data-i="swellH"></label>
      <label>Période <output data-o="swellT"></output><input type="range" min="4" max="16" value="10" data-i="swellT"></label>
    </div>
    <div id="manual"></div>
    <button class="btn primary" data-sail>Naviguer dans ces conditions</button>
  </article>
  <article class="card"><h3>Repères</h3><table class="tbl">${LEVELS.map((l) => `<tr><td>${levelBadge(l)}</td><td>${esc(l.advice)}</td></tr>`).join('')}</table>
  <p class="muted small">Seuils indicatifs : vent effectif (le plus fort entre vent moyen et 82 % des rafales) &lt; 6 nds petit temps, &lt; 18 bon, &lt; 23 vigilance, &lt; 29 engagé. Houle &lt; 1 m sans effet, &lt; 1,6 m vigilance, &lt; 2,5 m engagé (majorée si la période est courte).</p></article>`;
  const cur = () => {
    const v = {};
    view.querySelectorAll('[data-i]').forEach((i) => (v[i.dataset.i] = +i.value));
    v.swellH /= 10;
    return v;
  };
  const upd = () => {
    const v = cur();
    view.querySelector('[data-o="tws"]').textContent = `${v.tws} nds (F${evaluate(v).beaufort})`;
    view.querySelector('[data-o="gust"]').textContent = `${v.gust} nds`;
    view.querySelector('[data-o="twd"]').textContent = `${cardinal(v.twd)} (${v.twd}°)`;
    view.querySelector('[data-o="swellH"]').textContent = `${v.swellH.toFixed(1)} m`;
    view.querySelector('[data-o="swellT"]').textContent = `${v.swellT} s`;
    view.querySelector('#manual').innerHTML = verdictHtml(evaluate(v));
  };
  view.querySelectorAll('[data-i]').forEach((i) => i.addEventListener('input', upd));
  upd();
  view.querySelector('[data-sail]').addEventListener('click', () => {
    const v = cur();
    sail({ id: 'libre', title: 'Navigation libre', goal: 'Conditions du simulateur', start: { x: 0, y: -230, heading: 180 }, marks: [], wind: { twd: v.twd, tws: v.tws, gust: Math.max(v.gust, v.tws), shift: 8 }, sea: { swellH: v.swellH, swellT: v.swellT } });
  });
  loadForecast(true).catch(() => forecast).then((fc) => {
    if (!view.querySelector('#now')) return;
    if (!fc) { view.querySelector('#now').innerHTML = '<p>Prévision indisponible (hors ligne). Utilise le simulateur ci-dessous.</p>'; return; }
    P.award('meteo');
    const h = currentHour(fc);
    view.querySelector('#now').innerHTML = `<p class="kicker">Maintenant · ${new Date(h.time).toLocaleString('fr-FR', { weekday: 'long', hour: '2-digit', minute: '2-digit' })}</p>${verdictHtml(h.eval, h)}<p class="muted small">Source : Open-Meteo, point ${'47.26 N, 2.40 O'}. Mise à jour ${new Date(fc.at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}.</p>`;
    const days = {};
    for (const x of fc.hours) { const d = x.time.slice(0, 10), hr = +x.time.slice(11, 13); if (hr >= 8 && hr <= 20) (days[d] ||= []).push(x); }
    view.querySelector('#timeline').innerHTML = Object.entries(days).map(([d, hs]) => `<article class="card day"><h3>${new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
      <div class="hours">${hs.map((x) => `<div class="hour" style="--lv:${x.eval.color}" title="${esc(x.eval.label)} · ${esc(x.eval.summary)}"><small>${x.time.slice(11, 13)}h</small><i class="arrow" style="transform:rotate(${x.twd + 180}deg)">↑</i><b>${Math.round(x.tws)}</b><small>${Math.round(x.gust)}</small><small>${x.swellH != null ? x.swellH.toFixed(1) + 'm' : '-'}</small></div>`).join('')}</div></article>`).join('');
  });
};

function verdictHtml(ev, h) {
  return `<div class="verdict" style="--lv:${ev.color}"><div class="verdict-head">${levelBadge(ev)}<span>${esc(ev.summary)}</span></div><p>${esc(ev.advice)}</p>
  ${ev.warnings.map((w) => `<p class="warning ${w.kind}"><b>${w.kind === 'info' ? 'ℹ️' : '⚠️'} ${esc(w.title)}</b> : ${esc(w.text)}</p>`).join('')}
  ${h?.temp != null ? `<p class="muted small">Air ${Math.round(h.temp)} °C</p>` : ''}</div>`;
}

views.flotte = () => {
  view.innerHTML = `<h1>La flotte du club</h1><p class="muted">Choisis ton bateau. Chaque bateau a ses vitesses (polaire) et ses réglages.</p>
  <div class="fleet">${BOAT_LIST.map((b) => {
    const v = bestVmgAngles(b, 12);
    return `<article class="card boat ${P.data.boat === b.id ? 'selected' : ''}">
      <canvas width="160" height="160" data-boat="${b.id}"></canvas>
      <div><h3>${b.name}</h3><p class="muted">${esc(b.crew)} · ${b.length} m</p><p>${esc(b.pitch)}</p>
      <p class="small">À 12 nds : ${polarSpeed(b, 100, 12).toFixed(1)} nds au travers · près à ${v.up}° · portant à ${v.down}°${b.hasSpi ? ' · spi' : ''}${b.capsizes ? '' : ' · ne chavire pas'}</p>
      ${polarSvg(b)}
      <button class="btn ${P.data.boat === b.id ? '' : 'primary'}" data-pick="${b.id}">${P.data.boat === b.id ? 'Ton bateau' : 'Choisir'}</button></div></article>`;
  }).join('')}</div>`;
  view.querySelectorAll('canvas[data-boat]').forEach((c) => drawBoat(c.getContext('2d'), BOATS[c.dataset.boat], { heading: 45, twa: 110, twd: 155, sheet: 0.4, heel: 5, spi: BOATS[c.dataset.boat].hasSpi, hike: true }, 80, 80, 2.4));
  view.querySelectorAll('[data-pick]').forEach((b) => b.addEventListener('click', () => { P.setBoat(b.dataset.pick); toast(`Bateau : ${BOATS[b.dataset.pick].name}`); views.flotte(); }));
};

function polarSvg(b) {
  const max = 14, R = 78;
  const curve = (tws) => {
    let d = '';
    for (let a = 0; a <= 180; a += 4) {
      const v = polarSpeed(b, a, tws) / max * R;
      d += `${a ? 'L' : 'M'}${80 + Math.sin(a * Math.PI / 180) * v} ${80 - Math.cos(a * Math.PI / 180) * v}`;
    }
    return d;
  };
  return `<svg viewBox="0 0 170 165" class="polar" aria-label="Polaire ${b.name}">${[5, 10, 15].map((k) => `<circle cx="80" cy="80" r="${k / max * R}" fill="none" stroke="currentColor" opacity=".15"/>`).join('')}
  <line x1="80" y1="5" x2="80" y2="155" stroke="currentColor" opacity=".2"/><text x="80" y="8" font-size="8" text-anchor="middle" fill="currentColor">vent</text>
  <path d="${curve(8)}" fill="none" stroke="#64C5F1" stroke-width="2"/><path d="${curve(15)}" fill="none" stroke="#243150" stroke-width="2"/>
  <text x="120" y="150" font-size="8" fill="#64C5F1">8 nds</text><text x="120" y="140" font-size="8" fill="currentColor">15 nds</text></svg>`;
}

views.profil = () => {
  const r = P.rank();
  const d = P.data;
  const done = Object.keys(d.missions).length;
  const starsTotal = Object.values(d.missions).reduce((n, m) => n + Math.max(0, ...Object.values(m).map((x) => x.stars)), 0);
  view.innerHTML = `<h1>Mon carnet de bord</h1>
  <article class="card"><h3>${esc(d.name || 'Moussaillon anonyme')}</h3><label>Prénom <input data-name value="${esc(d.name)}" maxlength="20"></label>
    <h2>${r.name}</h2><div class="bar big"><i style="width:${Math.round(r.pct * 100)}%"></i></div><p class="muted">${r.xp} XP${r.next ? ` · ${r.toNext} XP avant ${r.next}` : ''}</p>
    <div class="ranks">${RANKS.map((x, i) => `<span class="${i <= r.index ? 'on' : ''}">${x.name}</span>`).join('')}</div>
    <div class="facts"><div><small>Missions</small><b>${done} / ${MISSIONS.length}</b></div><div><small>Étoiles</small><b>${starsTotal} / 30</b></div><div><small>Leçons</small><b>${Object.keys(d.lessons).length} / ${LESSONS.length}</b></div><div><small>Série</small><b>${P.streak()} j</b></div></div>
  </article>
  <h2>Badges</h2><div class="badges">${BADGES.map((b) => `<div class="badge ${d.badges[b.id] ? 'on' : ''}"><span>${b.icon}</span><b>${esc(b.name)}</b><small>${esc(b.desc)}</small></div>`).join('')}</div>
  <p><button class="btn danger" data-reset>Remettre à zéro</button></p>`;
  view.querySelector('[data-name]').addEventListener('change', (e) => P.setName(e.target.value.trim()));
  view.querySelector('[data-reset]').addEventListener('click', () => { if (confirm('Effacer toute ta progression ?')) { P.reset(); views.profil(); renderHeader(); } });
};

// ---------- Routeur ----------
function route() {
  if (sim) { sim.destroy(); sim = null; document.body.classList.remove('sailing'); }
  const [name, arg] = (location.hash.slice(1) || 'accueil').split('/');
  const fn = views[name] || views.accueil;
  document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === (views[name] ? name : 'accueil')));
  fn(arg);
  view.focus({ preventScroll: true });
  scrollTo(0, 0);
}
addEventListener('hashchange', route);
renderHeader();
route();

// ---------- PWA ----------
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js').then((reg) => {
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      nw?.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) {
          const bar = document.getElementById('update');
          bar.hidden = false;
          bar.querySelector('button').onclick = () => { nw.postMessage('skip'); location.reload(); };
        }
      });
    });
  }).catch(() => {});
}
