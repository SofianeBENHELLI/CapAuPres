// Page « Conditions en temps réel » : météo, vent, vagues, marée et webcam de La Baule.
import { loadConditions, summarize, flagFor, FLAGS, WEBCAM_URL, HORIZON_H, findWebcamThumb } from '../core/conditions.js';
import { getBoat } from '../core/boats.js';
import { levelOfKn } from '../core/weather.js';
import { WINDS } from '../core/polar.js';
import { compass, compassLong } from '../core/angles.js';
import { windMapNode, updateWindMap } from '../ui/windmap.js';

const num = (n, d = 1) => n.toLocaleString('fr-FR', { maximumFractionDigits: d });
export const hhmm = (t) => t.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

// Flèche qui part dans le sens où va le vent (ou la houle) : dessinée vers le nord, tournée de from + 180°.
export const arrow = (from, size = 22) =>
  `<svg class="cond-arrow" width="${size}" height="${size}" viewBox="-12 -12 24 24" aria-hidden="true"><path transform="rotate(${from + 180})" d="M0,-10 L6,6 L0,2 L-6,6Z"/></svg>`;

// Petit drapeau sur sa hampe, qui flotte.
// La nuit, le drapeau est gris rayé : motif propre à chaque dessin (un motif partagé disparaît
// quand le premier dessin est masqué, par exemple dans une liste repliée).
let stripeId = 0;
export const flagSVG = (color, size = 34) => {
  const id = color === 'night' ? `nightStripes${++stripeId}` : '';
  const defs = id ? `<defs><pattern id="${id}" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="4" height="4" fill="#c9ccd2"/><rect width="2" height="4" fill="#8a8f99"/></pattern></defs>` : '';
  return `<svg class="flag flag-${color}" width="${size}" height="${size}" viewBox="0 0 32 32" aria-hidden="true">${defs}<rect x="4" y="2" width="2.5" height="28" rx="1" class="flag-pole"/><path d="M6.5,4 C12,1 17,7 23,4 S29,4 29,4 L29,17 C23,20 18,14 12.5,17 S6.5,17 6.5,17 Z" class="flag-cloth"${id ? ` style="fill:url(#${id})"` : ''}/></svg>`;
};

// Courbe de marée du jour affiché, avec pleines / basses mers et l'heure choisie.
function tideSVG(tide, now) {
  const day0 = new Date(now);
  day0.setHours(0, 0, 0, 0);
  const day1 = day0.getTime() + 24 * 3600e3;
  const pts = tide.times.map((t, i) => ({ t: t.getTime(), v: tide.levels[i] })).filter((p) => p.t >= day0.getTime() && p.t <= day1 && p.v != null);
  if (pts.length < 6) return '';
  const W = 600;
  const H = 176;
  const top = 26;
  const bot = 44; // place pour l'étiquette des basses mers au-dessus des heures
  const vs = pts.map((p) => p.v);
  const lo = Math.min(...vs);
  const hi = Math.max(...vs);
  const x = (t) => ((t - day0.getTime()) / (day1 - day0.getTime())) * W;
  const y = (v) => top + (1 - (v - lo) / (hi - lo || 1)) * (H - top - bot);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const ext = tide.extremes.filter((e) => e.time.getTime() >= day0.getTime() && e.time.getTime() <= day1);
  const nx = x(now.getTime());
  return `<svg class="tide-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Courbe de la marée du jour">
    <path d="${line} L${W},${H - bot} L0,${H - bot} Z" class="tide-area"/>
    <path d="${line}" class="tide-line"/>
    ${[0, 6, 12, 18, 24].map((h) => `<text x="${Math.min(W - 14, Math.max(14, (h / 24) * W))}" y="${H - 6}" class="tide-hour">${h}h</text>`).join('')}
    ${ext.map((e) => `<g><circle cx="${x(e.time.getTime())}" cy="${y(e.level)}" r="4" class="tide-dot"/><text x="${Math.min(W - 40, Math.max(40, x(e.time.getTime())))}" y="${e.type === 'PM' ? y(e.level) - 9 : y(e.level) + 16}" class="tide-lab">${e.type} ${hhmm(e.time)}</text></g>`).join('')}
    <line x1="${nx}" x2="${nx}" y1="${top - 14}" y2="${H - bot}" class="tide-now"/>
  </svg>`;
}

// « Aujourd'hui 14h », « Demain 9h », « Mercredi 15h »
export function whenLabel(at, now = new Date()) {
  const d0 = new Date(now);
  d0.setHours(0, 0, 0, 0);
  const days = Math.floor((at - d0) / 86400e3);
  const day = days <= 0 ? 'Aujourd’hui' : days === 1 ? 'Demain' : days === 2 ? 'Après-demain' : at.toLocaleDateString('fr-FR', { weekday: 'long' });
  return `${day} ${at.getHours()}h`;
}

// Instant affiché pour un décalage de `o` heures : maintenant, ou une heure pleine à venir.
function atOffset(o, now) {
  if (!o) return now;
  const t = new Date(now);
  t.setMinutes(0, 0, 0);
  return new Date(t.getTime() + o * 3600e3);
}

// Jours couverts par la prévision (aujourd'hui, demain, après-demain) avec leurs heures.
const DAY_FMT = (d) => d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }).replace('.', '');
function dayGroups(strip, now) {
  const d0 = new Date(now);
  d0.setHours(0, 0, 0, 0);
  const groups = [];
  for (const h of strip) {
    const k = Math.floor((h.at - d0) / 86400e3);
    let g = groups.find((x) => x.k === k);
    if (!g) {
      const date = new Date(d0.getTime() + k * 86400e3);
      g = { k, date, name: k === 0 ? 'Aujourd’hui' : k === 1 ? 'Demain' : (([w]) => w.charAt(0).toUpperCase() + w.slice(1))([date.toLocaleDateString('fr-FR', { weekday: 'long' })]), hours: [] };
      groups.push(g);
    }
    g.hours.push(h);
  }
  // meilleur créneau de jour de chaque journée : le drapeau le plus doux, vent le plus proche de 10 nds
  const rank = { green: 0, yellow: 1, red: 2, black: 3 };
  for (const g of groups) {
    const day = g.hours.filter((h) => !h.night && h.flag && h.flag.color !== 'night');
    g.best = day.length ? day.reduce((a, h) => (rank[h.flag.color] - rank[a.flag.color] || Math.abs(h.kn - 10) - Math.abs(a.kn - 10)) < 0 ? h : a) : null;
    g.worst = day.reduce((m, h) => Math.max(m, rank[h.flag.color]), 0);
  }
  return groups;
}

function dayTabs(groups, selK) {
  const color = ['green', 'yellow', 'red', 'black'];
  return groups.map((g) => `<button class="day-tab${g.k === selK ? ' active' : ''}" data-k="${g.k}" role="tab" aria-selected="${g.k === selK}">
    <b>${g.name}</b><small>${DAY_FMT(g.date)}</small>
    <span class="day-dots" aria-hidden="true">${g.hours.filter((h) => !h.night).map((h) => `<i class="dot-${h.flag?.color || 'none'}"></i>`).join('')}</span>
    ${g.best ? `<small class="day-best">Meilleur : ${g.best.at.getHours()}h</small>` : `<small class="day-best muted">Nuit</small>`}
  </button>`).join('');
}

function hourCards(g, selO) {
  return g.hours.map((h) => `<button class="hour-card hc-${h.flag?.color || 'none'}${h.night ? ' hc-night' : ''}${h.o === selO ? ' active' : ''}${g.best && h.o === g.best.o ? ' hc-best' : ''}" data-o="${h.o}" role="option" aria-selected="${h.o === selO}" aria-label="${h.o ? `${h.at.getHours()} heures` : 'Maintenant'} : vent ${h.kn} nœuds, rafales ${h.gust}${h.waves != null ? `, vagues ${num(h.waves)} mètre` : ''}, ${h.flag ? h.flag.label.toLowerCase() : ''}">
    <span class="hc-time">${h.o ? `${h.at.getHours()}<small>h</small>` : '<span class="hc-live">Direct</span>'}</span>
    <span class="hc-sky" aria-hidden="true">${h.night ? '🌙' : h.sky?.icon || ''}</span>
    <span class="hc-wind">${arrow(h.from, 18)}<b>${h.kn}</b></span>
    <small class="hc-gust">raf. ${h.gust}</small>
    ${h.waves != null ? `<small class="hc-wave">🌊 ${num(h.waves)} m</small>` : ''}
    <span class="hc-flag" aria-hidden="true"></span>
    ${g.best && h.o === g.best.o ? '<span class="hc-star" aria-hidden="true">★</span>' : ''}
  </button>`).join('');
}

// Synthèse de l'heure choisie : drapeau + chiffres clés. Le texte (pourquoi, à savoir) se déplie.
function summaryCard(flag, s) {
  if (!flag) return '';
  const next = s.tide?.next?.[0];
  const notes = [...flag.why, ...(flag.warnings || [])];
  return `<div class="card met-sum flag-bg-${flag.color}">
    <div class="met-sum-top">
      ${flagSVG(flag.color, 52)}
      <div class="met-sum-txt">
        <small>Pour tout le club · ${s.live ? 'maintenant' : whenLabel(s.at).toLowerCase()}</small>
        <b>${(([l]) => l.charAt(0).toUpperCase() + l.slice(1))([flag.label.replace('Drapeau ', '')])} · ${flag.text}</b>
      </div>
    </div>
    <div class="met-kpis">
      ${s.wind ? `<span class="kpi">${arrow(s.wind.from, 22)}<b>${s.wind.kn}</b><small>nds · raf. ${s.wind.gust}<br>${compass(s.wind.from)}</small></span>` : ''}
      ${s.waves ? `<span class="kpi"><span class="kpi-ico">🌊</span><b>${num(s.waves.height)}</b><small>m<br>${num(s.waves.period, 0)} s</small></span>` : ''}
      ${s.sky ? `<span class="kpi"><span class="kpi-ico">${s.night ? '🌙' : s.sky.icon}</span><b>${s.temp}°</b><small>${s.water != null ? `eau ${num(s.water, 0)}°` : ''}</small></span>` : ''}
      ${next ? `<span class="kpi"><span class="kpi-ico">${next.type === 'PM' ? '⬆️' : '⬇️'}</span><b>${hhmm(next.time)}</b><small>${next.type === 'PM' ? 'pleine mer' : 'basse mer'}</small></span>` : ''}
    </div>
    ${notes.length ? `<details class="met-more-txt"><summary>${flag.why.length ? 'Pourquoi' : 'À savoir'} <span class="pill">${notes.length}</span></summary>
      <ul>${flag.why.map((w) => `<li>${w}</li>`).join('')}${(flag.warnings || []).map((w) => `<li class="muted">ℹ️ ${w}</li>`).join('')}</ul></details>` : ''}
    <details class="met-more-txt"><summary>Les drapeaux</summary>
      <ul class="flag-legend">${Object.entries(FLAGS).map(([c, f]) => `<li>${flagSVG(c, 18)} <b>${f.label.replace('Drapeau ', '')}</b> ${f.text}</li>`).join('')}</ul>
      <small class="muted">Même calcul pour tous les bateaux : seuls le vent, les rafales et les vagues comptent. Indicatif, le moniteur décide.</small>
    </details>
  </div>`;
}

function daylightLeft(s) {
  const m = Math.round((s.sun.set - s.at) / 60e3);
  return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}` : `${m} min`;
}

// Webcam : l'image de la plage, tout de suite visible. Un toucher ouvre le direct.
let thumb = null;
function camCard() {
  return `<a class="card met-cam" href="${WEBCAM_URL}" target="_blank" rel="noopener" aria-label="Webcam de la plage de La Baule, en direct">
    <span class="cam-img">${thumb ? `<img src="${thumb.url}" alt="La plage de La Baule à ${hhmm(thumb.time)}"/>` : '<span class="cam-ph" aria-hidden="true">📹</span>'}</span>
    <span class="cam-badge">● EN DIRECT</span>
    <span class="cam-cap">${thumb ? `La plage à ${hhmm(thumb.time)}` : 'La plage de La Baule'} · voir le direct ↗<small>© Skaping</small></span>
  </a>`;
}

// Détails condensés : une ligne par sujet, le reste replié.
function details(s) {
  const ext = s.tide?.extremes.filter((e) => e.time > s.at) || [];
  const marnage = ext.length > 1 ? Math.abs(ext[0].level - ext[1].level) : null;
  const lvl = s.wind ? levelOfKn(s.wind.kn) : null;
  return `
    <div class="card met-facts">
      ${s.wind ? `<div><small>Vent</small><b>${compassLong(s.wind.from)}</b><span>force ${s.wind.bf} · ${WINDS[lvl].label.toLowerCase()}</span></div>` : ''}
      ${s.waves ? `<div><small>Vagues au large</small><b>${num(s.waves.height)} m · ${num(s.waves.period, 0)} s</b><span>houle de ${compass(s.waves.from)}</span></div>` : ''}
      ${s.sun ? `<div><small>Soleil</small><b>${hhmm(s.sun.rise)} → ${hhmm(s.sun.set)}</b><span>${s.night ? 'nuit : on ne navigue pas' : `encore ${daylightLeft(s)} de jour`}</span></div>` : ''}
      ${s.water != null ? `<div><small>Eau</small><b>${num(s.water)}°</b><span>${s.water < 18 ? 'combinaison conseillée' : 'agréable'}</span></div>` : ''}
      ${s.current ? `<div><small>Courant</small><b>${num(s.current.kn)} nd</b><span>vers ${compass(s.current.to)}</span></div>` : ''}
    </div>
    ${s.tide ? `<div class="card cond-tide">
      <div class="row" style="justify-content:space-between;align-items:baseline">
        <h2 class="h3" style="margin:0">🌙 Marée</h2>
        <span class="pill">${s.tide.rising ? '↗ monte' : '↘ descend'}</span>
      </div>
      <p class="tide-next">${s.tide.next.map((e) => `<span><b>${e.type === 'PM' ? 'PM' : 'BM'}</b> ${hhmm(e.time)}</span>`).join('')}${marnage ? `<span class="muted">marnage ≈ ${num(marnage)} m</span>` : ''}</p>
      ${tideSVG(s.tide, s.at)}
      <details class="met-more-txt"><summary>À propos des heures de marée</summary><p class="muted small-print">Modèle Open-Meteo, à quelques minutes près. L’annuaire du <a href="https://maree.shom.fr/" target="_blank" rel="noopener">SHOM</a> fait foi. À marée basse, attention aux cailloux !</p></details>
    </div>` : ''}`;
}

export function render(root) {
  root.innerHTML = '<div class="cond-page"><p class="muted">Chargement des conditions…</p></div>';
  const box = root.firstElementChild;
  let alive = true;
  let offset = 0;
  const load = async (force) => {
    const data = await loadConditions({ force });
    if (!alive) return;
    if (!data) {
      box.innerHTML = `<div class="card"><h1 class="h2">🌊 Conditions en temps réel</h1><p>Pas de réseau pour l’instant : les conditions s’afficheront dès que tu seras connecté·e.</p>
        <a class="btn primary" href="${WEBCAM_URL}" target="_blank" rel="noopener">📹 Webcam de La Baule ↗</a></div>`;
      return;
    }
    const now = new Date();
    const boat = getBoat();
    // drapeau de chaque heure des 48 prochaines : la frise montre d'un coup d'œil les bons créneaux
    const strip = Array.from({ length: HORIZON_H + 1 }, (_, o) => {
      const at = atOffset(o, now);
      const sum = summarize(data, at, now);
      return { o, at, night: sum.night, flag: flagFor(sum, boat.id), kn: sum.wind?.kn ?? 0, gust: sum.wind?.gust ?? 0, from: sum.wind?.from ?? 0, sky: sum.sky, waves: sum.waves?.height };
    });
    const groups = dayGroups(strip, now);
    const dayOf = (o) => groups.find((g) => g.hours.some((h) => h.o === o)) || groups[0];
    box.innerHTML = `
      <div class="met">
        <div class="met-head">
          <h1 class="h2" id="ctitle"></h1>
          <span class="muted small-print">${data.stale ? '⚠️ hors ligne · ' : ''}màj ${hhmm(new Date(data.fetchedAt))}</span>
          <button class="btn small ghost" id="crefresh" aria-label="Actualiser">↻</button>
        </div>
        <div class="met-top">
          <div id="cflag" aria-live="polite"></div>
          <div id="ccam"></div>
        </div>
        <div class="card time-card">
          <div class="tc-head"><h2 class="h3">🗓️ Créneau</h2><button class="btn small" id="cnowbtn">Maintenant</button></div>
          <div class="day-tabs" id="cdays" role="tablist" aria-label="Jour"></div>
          <div class="hour-scroll" id="chours" role="listbox" aria-label="Heure" tabindex="0"></div>
        </div>
        <div class="met-bottom">
          <div id="wmslot"></div>
          <div id="ccontent"></div>
        </div>
        <details class="card met-more-txt met-foot"><summary>⚠️ Avant de partir</summary>
          <p>Ces infos aident à se préparer, ce ne sont pas des prévisions officielles : <a href="https://meteofrance.com/meteo-marine" target="_blank" rel="noopener">météo marine</a>, gilet, et c’est le moniteur qui décide si on sort.</p>
          <p class="muted small-print">Données <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo.com</a> (CC BY 4.0) · Webcam © Skaping.</p>
        </details>
      </div>`;
    const wmap = windMapNode();
    box.querySelector('#wmslot').replaceWith(wmap);
    const show = (o) => {
      offset = o;
      const s = summarize(data, atOffset(o, now), now);
      box.querySelector('#ctitle').textContent = s.live ? '🌊 Météo · maintenant' : `🔭 Météo · ${whenLabel(s.at, now)}`;
      const flag = flagFor(s, boat.id);
      box.querySelector('#cflag').innerHTML = summaryCard(flag, s);
      box.querySelector('#ccontent').innerHTML = details(s);
      updateWindMap(wmap, s, s.live ? 'Maintenant' : whenLabel(s.at, now));
      const g = dayOf(o);
      box.querySelector('#cdays').innerHTML = dayTabs(groups, g.k);
      const hours = box.querySelector('#chours');
      const keep = hours.dataset.k === String(g.k) ? hours.scrollLeft : null;
      hours.innerHTML = hourCards(g, o);
      hours.dataset.k = g.k;
      const card = hours.querySelector('.hour-card.active');
      if (keep != null) hours.scrollLeft = keep;
      if (card) {
        const l = card.offsetLeft - hours.offsetLeft;
        if (l < hours.scrollLeft || l + card.offsetWidth > hours.scrollLeft + hours.clientWidth) hours.scrollLeft = l - hours.clientWidth / 2 + card.offsetWidth / 2;
      }
    };
    box.querySelector('#cdays').onclick = (e) => {
      const t = e.target.closest('.day-tab');
      if (!t) return;
      const g = groups.find((x) => x.k === +t.dataset.k);
      show((g.best || g.hours.find((h) => !h.night) || g.hours[0]).o);
    };
    box.querySelector('#chours').onclick = (e) => {
      const c = e.target.closest('.hour-card');
      if (c) show(+c.dataset.o);
    };
    box.querySelector('#chours').onkeydown = (e) => {
      const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (!d) return;
      e.preventDefault();
      show(Math.max(0, Math.min(HORIZON_H, offset + d)));
      box.querySelector('#chours .hour-card.active')?.focus();
    };
    box.querySelector('#cnowbtn').onclick = () => show(0);
    box.querySelector('#crefresh').onclick = (e) => {
      e.target.disabled = true;
      load(true);
    };
    show(offset);
    box.querySelector('#ccam').innerHTML = camCard();
    findWebcamThumb().then((t) => {
      if (!t || !alive) return;
      thumb = t;
      const c = box.querySelector('#ccam');
      if (c) c.innerHTML = camCard();
    });
  };
  load(false);
  return () => {
    alive = false;
  };
}
