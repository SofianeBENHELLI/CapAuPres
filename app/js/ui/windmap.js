// Carte de la baie vue de dessus, avec le vent et le courant de marée de l'heure choisie :
// flèches de vent et traînées qui défilent dans son sens, chevrons de courant.
// La carte est dessinée une fois ; seuls le vent et le courant changent.
// Une seule prévision pour toute la baie : le vent est uniforme, on le dit sous la carte. Le courant
// vient d'un point au large ; on l'affaiblit en approchant du bord, où la baie est abritée.
import { landLayer, SEA_DEFS, fx, OSM_CREDIT } from './map.js';
import { onLand, distToLand } from '../core/land.js';
import { levelOfKn } from '../core/weather.js';
import { compassLong } from '../core/angles.js';

const BOX = { minX: -900, maxX: 6100, minY: -3000, maxY: 1950 };
const W = BOX.maxX - BOX.minX;
const H = BOX.maxY - BOX.minY;
const K = 1000 / W; // pixels par mètre pour une carte de 1000 px de large
// Zone couverte par les flèches : plus large que la carte, qui s'élargit sur un écran de PC.
const FIELD = { minX: -4600, maxX: 9800, minY: BOX.minY, maxY: BOX.maxY };
const COLORS = { light: '#8fd3f4', medium: '#7ee2a8', strong: '#ff8a3d' };

// Points d'eau libre où poser une flèche (calculés une fois).
const GRID = (() => {
  const pts = [];
  const step = 650;
  for (let y = FIELD.minY + step / 2; y < FIELD.maxY; y += step) {
    for (let x = FIELD.minX + step / 2; x < FIELD.maxX; x += step) {
      const p = { x, y };
      if (!onLand(p) && distToLand(p, 200) >= 200) pts.push(p);
    }
  }
  return pts;
})();

// Points du courant, décalés d'une demi-maille par rapport aux flèches de vent, avec un facteur
// qui affaiblit le courant près du rivage (de 35 % au bord à 100 % à 1,5 km).
const CGRID = (() => {
  const pts = [];
  const step = 650;
  for (let y = FIELD.minY + step; y < FIELD.maxY; y += step) {
    for (let x = FIELD.minX + step; x < FIELD.maxX; x += step) {
      const p = { x, y };
      if (onLand(p)) continue;
      const d = distToLand(p, 1500);
      if (d >= 220) pts.push({ ...p, f: Math.max(0.35, Math.min(1, d / 1500)) });
    }
  }
  return pts;
})();

// Traînées : positions tirées une fois, toujours les mêmes d'une heure à l'autre.
const STREAKS = (() => {
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const R = Math.hypot(FIELD.maxX - FIELD.minX, H) * 0.6;
  return Array.from({ length: 160 }, () => ({ x: -R + rnd() * 2 * R, y: -R + rnd() * 2 * R, delay: rnd() }));
})();
const CX = (BOX.minX + BOX.maxX) / 2;
const CY = -(BOX.minY + BOX.maxY) / 2;

export function windMapNode() {
  const node = document.createElement('div');
  node.className = 'card wm-card';
  node.innerHTML = `
    <div class="wm-head">
      <h2 class="h3" style="margin:0">🧭 Vent et courant sur la baie</h2>
      <div class="chips wm-toggles">
        <button class="chip active" data-layer="wind" aria-pressed="true">💨 Vent</button>
        <button class="chip active" data-layer="current" aria-pressed="true">🌊 Courant</button>
      </div>
      <span class="pill" id="wmWhen"></span>
      <button class="btn small wm-max-btn" id="wmMax" aria-pressed="false" title="Agrandir la carte">⤢ Plein écran</button>
    </div>
    <div class="wm-wrap">
      <svg class="wm-map" viewBox="${BOX.minX} ${-BOX.maxY} ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img">
        ${SEA_DEFS}
        <rect x="${BOX.minX - 20000}" y="${-BOX.maxY - 20000}" width="${W + 40000}" height="${H + 40000}" fill="url(#seaGrad)"/>
        <g id="wmStreaks"></g>
        ${landLayer(K, { marks: false })}
        <g id="wmCurrent"></g>
        <g id="wmField"></g>
        <rect class="wm-night" x="${BOX.minX - 20000}" y="${-BOX.maxY - 20000}" width="${W + 40000}" height="${H + 40000}"/>
      </svg>
      <div class="wm-legend" id="wmLegend"></div>
      <div class="map-credit">${OSM_CREDIT}</div>
    </div>
    <details class="met-more-txt wm-notes"><summary>Lire la carte</summary><p class="muted small-print" id="wmNote"></p></details>`;
  // Plein écran : la carte occupe toute la fenêtre. On en sort par la croix flottante (toujours
  // visible, même sous l'encoche d'un iPhone), le bouton Fermer, Échap ou le bouton retour du téléphone.
  const maxBtn = node.querySelector('#wmMax');
  const closeFab = document.createElement('button');
  closeFab.className = 'wm-close-fab';
  closeFab.type = 'button';
  closeFab.setAttribute('aria-label', 'Réduire la carte');
  closeFab.textContent = '✕';
  node.querySelector('.wm-wrap').appendChild(closeFab);
  const isMax = () => node.classList.contains('wm-max');
  const apply = (on) => {
    node.classList.toggle('wm-max', on);
    document.body.classList.toggle('wm-max-open', on);
    maxBtn.textContent = on ? '✕ Réduire' : '⤢ Plein écran';
    maxBtn.setAttribute('aria-pressed', on);
    maxBtn.title = on ? 'Revenir à la page' : 'Agrandir la carte';
  };
  const open = () => {
    if (isMax()) return;
    apply(true);
    history.pushState({ wmMax: true }, '', location.href);
  };
  const close = () => {
    if (!isMax()) return;
    apply(false);
    if (history.state?.wmMax) history.back();
  };
  maxBtn.onclick = () => (isMax() ? close() : open());
  closeFab.onclick = close;
  const onKey = (e) => {
    if (!node.isConnected) return document.removeEventListener('keydown', onKey);
    if (e.key === 'Escape') close();
  };
  const onPop = () => {
    if (!node.isConnected) return window.removeEventListener('popstate', onPop);
    if (isMax()) apply(false);
  };
  document.addEventListener('keydown', onKey);
  window.addEventListener('popstate', onPop);
  node.querySelector('.wm-toggles').onclick = (e) => {
    const b = e.target.closest('.chip');
    if (!b) return;
    const on = !b.classList.contains('active');
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', on);
    node.classList.toggle(`hide-${b.dataset.layer}`, !on);
  };
  node.destroy = () => {
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('popstate', onPop);
    document.body.classList.remove('wm-max-open');
  };
  return node;
}

// Flèche en pixels, dessinée vers le bas (le sens où va un vent du nord), longueur selon la force.
function arrowGlyph(kn, color) {
  const L = 12 + Math.min(kn, 30) * 0.9;
  const w = 2.2 + Math.min(kn, 30) * 0.08;
  return `<path d="M0,${fx(-L / 2)} L0,${fx(L / 2 - 6)}" stroke="${color}" stroke-width="${fx(w)}" stroke-linecap="round"/>
    <path d="M0,${fx(L / 2 + 2)} L-5.5,${fx(L / 2 - 7)} L5.5,${fx(L / 2 - 7)} Z" fill="${color}"/>`;
}

// Chevrons de courant en pixels, dessinés vers le nord (le sens où il va), taille selon la vitesse.
function currentGlyph(kn) {
  const a = 6 + Math.min(kn, 2) * 6;
  const w = 2.2 + Math.min(kn, 2) * 0.9;
  const chev = (y) => `<path d="M${fx(-a)},${fx(y + a * 0.8)} L0,${fx(y)} L${fx(a)},${fx(y + a * 0.8)}"/>`;
  return `<g class="wm-chev" stroke-width="${fx(w)}">${chev(-a * 0.9)}${chev(a * 0.1)}</g>`;
}

const toDir = (deg) => {
  const d = compassLong(deg);
  return `vers ${/^[EO]/.test(d) ? 'l’' : 'le '}${d}`;
};
const knFr = (kn) => kn.toLocaleString('fr-FR', { maximumFractionDigits: 1, minimumFractionDigits: 1 });

function updateCurrent(node, s) {
  const c = s.current;
  const g = node.querySelector('#wmCurrent');
  if (!c) {
    g.innerHTML = '';
    return '';
  }
  const slack = c.kn < 0.15;
  g.innerHTML = slack
    ? CGRID.map((p) => `<circle class="wm-slack" cx="${p.x}" cy="${-p.y}" r="${fx(3 / K)}"/>`).join('')
    : CGRID.map((p) => `<g transform="translate(${p.x},${-p.y}) scale(${fx(1 / K)}) rotate(${c.to})">${currentGlyph(c.kn * p.f)}</g>`).join('');
  const phase = s.tide ? (s.tide.rising ? 'flot ↗' : 'jusant ↘') : '';
  return slack
    ? `<span class="wm-cur">🌊 Courant : étale${phase ? `, ${phase}` : ''}</span>`
    : `<span class="wm-cur">🌊 Courant ${knFr(c.kn)} nd ${toDir(c.to)}${phase ? ` · ${phase}` : ''}</span>`;
}

export function updateWindMap(node, s, when) {
  const svg = node.querySelector('.wm-map');
  node.classList.toggle('is-night', !!s.night);
  node.querySelector('#wmWhen').textContent = when;
  if (!s.wind) {
    node.querySelector('#wmField').innerHTML = '';
    node.querySelector('#wmStreaks').innerHTML = '';
    node.querySelector('#wmLegend').innerHTML = `<div><b>Vent indisponible</b>${updateCurrent(node, s)}</div>`;
    return;
  }
  const { kn, gust, from } = s.wind;
  const color = COLORS[levelOfKn(kn)];
  const glyph = arrowGlyph(kn, color);
  node.querySelector('#wmField').innerHTML = GRID.map(
    (p) => `<g transform="translate(${p.x},${-p.y}) scale(${fx(1 / K)}) rotate(${from})">${glyph}</g>`,
  ).join('');
  // plus le vent est fort, plus les traînées sont longues et rapides
  const dur = Math.max(1.6, Math.min(9, 60 / Math.max(kn, 2)));
  const len = 90 + Math.min(kn, 30) * 12;
  node.querySelector('#wmStreaks').innerHTML = `<g transform="rotate(${from} ${fx(CX)} ${fx(CY)})" style="--wm-dur:${fx(dur)}s">${STREAKS.map(
    (t) => `<line class="wm-streak" x1="${fx(CX + t.x)}" y1="${fx(CY + t.y)}" x2="${fx(CX + t.x)}" y2="${fx(CY + t.y + len)}" stroke-width="${fx(2 / K)}" style="animation-delay:${fx(-t.delay * dur)}s"/>`,
  ).join('')}</g>`;
  const dir = compassLong(from);
  node.querySelector('#wmLegend').innerHTML = `
    <svg width="44" height="44" viewBox="-22 -22 44 44" aria-hidden="true"><circle r="20" class="wm-rose"/><text y="-11" class="wm-n">N</text>
      <g transform="rotate(${from})">${arrowGlyph(Math.min(kn, 12), color)}</g></svg>
    <div><b>Vent ${/^[EO]/.test(dir) ? 'd’' : 'de '}${dir}</b><span>${kn} nds · rafales ${gust}</span>
    ${updateCurrent(node, s)}
    ${s.sun ? `<span>☀️ ${hm(s.sun.rise)} · 🌙 ${hm(s.sun.set)}</span>` : ''}</div>`;
  svg.setAttribute('aria-label', `Carte de la baie : vent ${/^[EO]/.test(dir) ? 'd’' : 'de '}${dir}, ${kn} nœuds, rafales ${gust}${s.night ? ', de nuit' : ''}`);
  const d = ((from % 360) + 360) % 360;
  const offshore = d >= 300 || d <= 100;
  node.querySelector('#wmNote').innerHTML = [
    s.night ? '🌙 <b>Il fait nuit</b> à cette heure-là : pas de visibilité, on ne sort pas.' : '',
    offshore ? '⚠️ <b>Vent de terre</b> : il souffle de la côte vers le large. Près de la plage la mer est plate et le vent irrégulier, il est un peu plus soutenu au large. La baie est fermée et le club au fond : la rentrée se fait au près, en eau abritée.' : '',
    'Les flèches montrent où va le vent. Une seule prévision pour toute la baie : près de la côte, derrière les pins et les immeubles, le vent est plus faible et tourne.',
    s.current ? 'Les chevrons blancs montrent où va le courant de marée (modèle au large de la baie, indicatif). En général, au flot il porte vers l’est et au jusant vers l’ouest, mais il ne s’inverse pas pile à la pleine ou à la basse mer. Il est faible dans la baie, mais bien plus fort dans le chenal du Pouliguen et entre les cailloux : attention en sortant du port.' : '',
  ].filter(Boolean).join(' ');
}

const hm = (t) => t.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
