// Dessin de la carte : bouées, portes, flèches de contournement, grille.
// Monde : y vers le Nord. SVG : y vers le bas => on inverse y.
import { centerOf } from '../core/course.js';
import { bearing } from '../core/angles.js';
import { BAY } from '../data/bay.js';

export const fx = (n) => Math.round(n * 100) / 100;
export const S = (p) => ({ x: p.x, y: -p.y });

// Boîte englobante (en coordonnées monde) du terrain de jeu.
export function fieldBox(level, extra = [], margin = 90, minSize = 520) {
  const pts = [level.start, ...extra];
  level.course.forEach((c) => {
    if (c.type === 'mark') pts.push(c);
    else pts.push(c.a, c.b);
  });
  let minX = Math.min(...pts.map((p) => p.x)) - margin;
  let maxX = Math.max(...pts.map((p) => p.x)) + margin;
  let minY = Math.min(...pts.map((p) => p.y)) - margin;
  let maxY = Math.max(...pts.map((p) => p.y)) + margin;
  const grow = (a, b) => {
    const d = Math.max(0, minSize - (b - a)) / 2;
    return [a - d, b + d];
  };
  [minX, maxX] = grow(minX, maxX);
  [minY, maxY] = grow(minY, maxY);
  return { minX, maxX, minY, maxY, w: maxX - minX, h: maxY - minY };
}

export const viewBoxOf = (b) => `${fx(b.minX)} ${fx(-b.maxY)} ${fx(b.w)} ${fx(b.h)}`;

// Flèche courbe autour d'une bouée indiquant le sens de contournement.
function roundingArrow(cp, R, k) {
  const rho = bearing({ x: 0, y: 0 }, cp.ray);
  const port = cp.side === 'port';
  const span = 125;
  const pts = [];
  const n = 26;
  for (let i = 0; i <= n; i++) {
    const th = port ? rho + span - (2 * span * i) / n : rho - span + (2 * span * i) / n;
    const a = (th * Math.PI) / 180;
    pts.push(`${fx(cp.x + R * Math.sin(a))},${fx(-(cp.y + R * Math.cos(a)))}`);
  }
  const end = port ? rho - span : rho + span;
  const tan = port ? end - 90 : end + 90; // cap de la tangente au bout de l'arc
  const ea = (end * Math.PI) / 180;
  const ex = cp.x + R * Math.sin(ea);
  const ey = -(cp.y + R * Math.cos(ea));
  const hs = 7 / k;
  return `<path class="round-arrow" d="M${pts.join(' L')}" stroke-width="${fx(2.5 / k)}"/>
    <g transform="translate(${fx(ex)},${fx(ey)}) rotate(${fx(tan - 90)})"><path class="round-arrow-head" d="M${fx(-hs)},${fx(-hs * 0.8)} L${fx(hs)},0 L${fx(-hs)},${fx(hs * 0.8)} Z"/></g>`;
}

export function sideLabel(cp) {
  if (cp.type === 'mark') return cp.side === 'port' ? 'à laisser à bâbord ↺' : 'à laisser à tribord ↻';
  return cp.type === 'finish' ? 'franchir la ligne' : 'passer entre les deux bouées';
}

export function cpName(cp, i, total) {
  if (cp.type === 'finish') return 'Arrivée';
  if (cp.type === 'gate') return `${i + 1}. Porte`;
  return `${i + 1}. Bouée`;
}

// Couche du parcours. done = nombre de points de passage validés.
export function courseLayer(cps, k, { done = -1, next = -1, labels = true } = {}) {
  const r = 8 / k;
  let s = '';
  cps.forEach((cp, i) => {
    const isDone = i < done;
    if (cp.type === 'mark') {
      if (labels) s += roundingArrow(cp, 24 / k, k);
      if (i === next) s += `<circle class="next-target" cx="${fx(cp.x)}" cy="${fx(-cp.y)}" r="${fx(16 / k)}" fill="none" stroke="#fff" stroke-width="${fx(2 / k)}"/>`;
      s += `<circle class="buoy mark${isDone ? ' done' : ''}" cx="${fx(cp.x)}" cy="${fx(-cp.y)}" r="${fx(r * 1.2)}" stroke-width="${fx(2 / k)}"/>`;
      s += `<text class="buoy-num" x="${fx(cp.x)}" y="${fx(-cp.y)}" font-size="${fx(11 / k)}" stroke-width="${fx(2 / k)}">${isDone ? '✓' : i + 1}</text>`;
    } else {
      const fin = cp.type === 'finish';
      const c = centerOf(cp);
      if (i === next) s += `<circle class="next-target" cx="${fx(c.x)}" cy="${fx(-c.y)}" r="${fx(16 / k)}" fill="none" stroke="#fff" stroke-width="${fx(2 / k)}"/>`;
      s += `<line class="${fin ? 'finish-line' : 'gate-line'}" x1="${fx(cp.a.x)}" y1="${fx(-cp.a.y)}" x2="${fx(cp.b.x)}" y2="${fx(-cp.b.y)}" stroke-width="${fx(2.5 / k)}" style="stroke-dasharray:${fx(6 / k)} ${fx(6 / k)}"/>`;
      if (fin) {
        // damier d'arrivée le long de la ligne
        const n = 10;
        for (let j = 0; j < n; j++) {
          if (j % 2) continue;
          const t0 = j / n;
          const t1 = (j + 1) / n;
          s += `<line x1="${fx(cp.a.x + (cp.b.x - cp.a.x) * t0)}" y1="${fx(-(cp.a.y + (cp.b.y - cp.a.y) * t0))}" x2="${fx(cp.a.x + (cp.b.x - cp.a.x) * t1)}" y2="${fx(-(cp.a.y + (cp.b.y - cp.a.y) * t1))}" stroke="#0d2536" stroke-width="${fx(2.5 / k)}"/>`;
        }
      }
      for (const p of [cp.a, cp.b]) s += `<circle class="buoy ${fin ? 'finish' : 'gate'}${isDone ? ' done' : ''}" cx="${fx(p.x)}" cy="${fx(-p.y)}" r="${fx(r)}" stroke-width="${fx(2 / k)}"/>`;
      if (labels) {
        const n = cp.normal;
        const off = 18 / k;
        s += `<text class="buoy-num" x="${fx(c.x - n.x * off)}" y="${fx(-(c.y - n.y * off))}" font-size="${fx(11 / k)}" stroke-width="${fx(3 / k)}">${fin ? '🏁' : isDone ? '✓' : i + 1}</text>`;
      }
    }
  });
  return s;
}

// Grille de 100 m et traînées de vent.
export function seaLayer(box, k, windFrom, { streaks = true } = {}) {
  let s = `<rect class="sea-bg" x="${fx(box.minX - 4000)}" y="${fx(-box.maxY - 4000)}" width="${fx(box.w + 8000)}" height="${fx(box.h + 8000)}"/>`;
  const step = 100;
  for (let x = Math.ceil((box.minX - 600) / step) * step; x < box.maxX + 600; x += step) {
    s += `<line class="grid-line" x1="${x}" y1="${fx(-box.maxY - 600)}" x2="${x}" y2="${fx(-box.minY + 600)}" stroke-width="${fx(1 / k)}"/>`;
  }
  for (let y = Math.ceil((box.minY - 600) / step) * step; y < box.maxY + 600; y += step) {
    s += `<line class="grid-line" x1="${fx(box.minX - 600)}" y1="${-y}" x2="${fx(box.maxX + 600)}" y2="${-y}" stroke-width="${fx(1 / k)}"/>`;
  }
  if (streaks) {
    const cx = (box.minX + box.maxX) / 2;
    const cy = -(box.minY + box.maxY) / 2;
    const R = Math.hypot(box.w, box.h) * 0.75;
    let lines = '';
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const n = 70;
    for (let i = 0; i < n; i++) {
      const x = cx - R + rnd() * 2 * R;
      const y = cy - R + rnd() * 2 * R;
      lines += `<line class="streak" x1="${fx(x)}" y1="${fx(y)}" x2="${fx(x)}" y2="${fx(y + 34 / k)}" stroke-width="${fx(1.6 / k)}" style="animation-delay:${fx(-rnd() * 3.2)}s"/>`;
    }
    s += `<g transform="rotate(${windFrom} ${fx(cx)} ${fx(cy)})">${lines}</g>`;
  }
  return s;
}

export const SEA_DEFS = `<defs>
  <linearGradient id="seaGrad" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#1488c9"/><stop offset="1" stop-color="#0a5d90"/>
  </linearGradient>
</defs>`;

// ---------------------------------------------------------------- Baie de La Baule
const polyPts = (pts) => pts.map((p) => `${p[0]},${-p[1]}`).join(' ');
const LAND_SVG = (() => {
  let s = `<polygon class="land" points="${polyPts(BAY.mainland)}"/>`;
  BAY.islets.forEach((i) => (s += `<polygon class="islet" points="${polyPts(i)}"/>`));
  return s;
})();

const HAZ_SVG = (() => {
  let s = '';
  (BAY.shallows || []).forEach((a) => (s += `<polygon class="shallow" points="${polyPts(a.pts)}"/>`));
  (BAY.reefs || []).forEach((a) => (s += `<polygon class="reef" points="${polyPts(a.pts)}"/>`));
  return s;
})();

// Symboles des marques de navigation (système IALA région A), dessinés à ~20 px.
export const MARK_INFO = {
  lateral_port: { label: 'Latérale bâbord', color: '#e5484d', text: 'Marque rouge : en entrant au port, on la laisse à gauche (bâbord).' },
  lateral_starboard: { label: 'Latérale tribord', color: '#1f9d55', text: 'Marque verte : en entrant au port, on la laisse à droite (tribord).' },
  cardinal_N: { label: 'Cardinale Nord', color: '#f5b700', text: 'Les deux cônes pointent vers le haut : passe au NORD de la balise, le danger est au sud.' },
  cardinal_S: { label: 'Cardinale Sud', color: '#f5b700', text: 'Les deux cônes pointent vers le bas : passe au SUD de la balise, le danger est au nord.' },
  cardinal_E: { label: 'Cardinale Est', color: '#f5b700', text: 'Cônes opposés par la base (losange) : passe à l’EST de la balise.' },
  cardinal_W: { label: 'Cardinale Ouest', color: '#f5b700', text: 'Cônes pointe contre pointe (sablier) : passe à l’OUEST de la balise.' },
  isolated_danger: { label: 'Danger isolé', color: '#111', text: 'Noire et rouge, deux boules noires : un danger de petite taille juste dessous, on peut passer tout autour à bonne distance.' },
  special: { label: 'Marque spéciale', color: '#f5b700', text: 'Jaune avec une croix : zone particulière (balisage d’une zone, d’une conduite, d’une ferme marine…).' },
  safe_water: { label: 'Eaux saines', color: '#e5484d', text: 'Rayures rouges et blanches : eau navigable tout autour.' },
  lighthouse: { label: 'Phare', color: '#8e4ec6', text: 'Phare : repère de jour et de nuit, chaque phare a son rythme de feu.' },
  light: { label: 'Feu', color: '#8e4ec6', text: 'Feu de navigation : son rythme (éclats, occultations) permet de le reconnaître la nuit.' },
};

function seamarkGlyph(kind) {
  const c = MARK_INFO[kind]?.color || '#888';
  switch (kind) {
    case 'lateral_port':
      return `<rect x="-5" y="-6" width="10" height="12" fill="${c}" stroke="#fff" stroke-width="1.5"/>`;
    case 'lateral_starboard':
      return `<path d="M0,-8 L6,6 L-6,6 Z" fill="${c}" stroke="#fff" stroke-width="1.5"/>`;
    case 'cardinal_N':
      return `<rect x="-4" y="-2" width="8" height="10" fill="#111"/><rect x="-4" y="3" width="8" height="5" fill="${c}"/><path d="M0,-12 L4,-6 L-4,-6 Z M0,-7 L4,-1 L-4,-1 Z" fill="#111"/>`;
    case 'cardinal_S':
      return `<rect x="-4" y="-2" width="8" height="10" fill="${c}"/><rect x="-4" y="3" width="8" height="5" fill="#111"/><path d="M0,-1 L4,-7 L-4,-7 Z M0,-6 L4,-12 L-4,-12 Z" fill="#111"/>`;
    case 'cardinal_E':
      return `<rect x="-4" y="-2" width="8" height="10" fill="#111"/><rect x="-4" y="1" width="8" height="4" fill="${c}"/><path d="M0,-13 L4,-8 L-4,-8 Z M0,-2 L4,-7 L-4,-7 Z" fill="#111"/>`;
    case 'cardinal_W':
      return `<rect x="-4" y="-2" width="8" height="10" fill="${c}"/><rect x="-4" y="1" width="8" height="4" fill="#111"/><path d="M0,-7 L4,-12 L-4,-12 Z M0,-7 L4,-2 L-4,-2 Z" fill="#111"/>`;
    case 'isolated_danger':
      return `<rect x="-4" y="-2" width="8" height="10" fill="#111"/><rect x="-4" y="1" width="8" height="3" fill="#e5484d"/><circle cy="-6" r="2.4" fill="#111"/><circle cy="-11" r="2.4" fill="#111"/>`;
    case 'special':
      return `<circle r="6" fill="${c}" stroke="#fff" stroke-width="1.5"/><path d="M-3,-3 L3,3 M3,-3 L-3,3" stroke="#111" stroke-width="1.6"/>`;
    case 'lighthouse':
      return `<path d="M0,-9 L2.5,-2.5 L9,0 L2.5,2.5 L0,9 L-2.5,2.5 L-9,0 L-2.5,-2.5 Z" fill="${c}" stroke="#fff" stroke-width="1.2"/>`;
    default:
      return `<path d="M0,-6 L2,-2 L6,0 L2,2 L0,6 L-2,2 L-6,0 L-2,-2 Z" fill="${c}" stroke="#fff" stroke-width="1"/>`;
  }
}

// Terre, dangers, balises, noms de lieux et base du club. k = pixels par mètre.
export function landLayer(k, { labels = true, base = true, marks = true, hazards = true } = {}) {
  let s = '';
  if (hazards) {
    s += `<g class="haz-layer" style="stroke-width:${fx(1.5 / k)}">${HAZ_SVG}</g>`;
    (BAY.rocks || []).forEach(([, x, y]) => {
      s += `<g transform="translate(${x},${-y}) scale(${fx(1 / k)})"><path class="rock" d="M-5,0 H5 M0,-5 V5 M-3.5,-3.5 L3.5,3.5 M3.5,-3.5 L-3.5,3.5"/></g>`;
    });
  }
  s += `<g class="land-layer" style="stroke-width:${fx(2 / k)}">${LAND_SVG}</g>`;
  if (hazards && labels) {
    const named = new Map();
    (BAY.reefs || []).forEach((a) => {
      if (!a.name || named.has(a.name)) return;
      const cx = a.pts.reduce((t, p) => t + p[0], 0) / a.pts.length;
      const cy = a.pts.reduce((t, p) => t + p[1], 0) / a.pts.length;
      named.set(a.name, [cx, cy]);
    });
    (BAY.rocks || []).forEach(([n, x, y]) => n && !named.has(n) && named.set(n, [x, y]));
    named.forEach(([x, y], n) => {
      s += `<text class="place place-reef" x="${fx(x)}" y="${fx(-y + 16 / k)}" font-size="${fx(10 / k)}" stroke-width="${fx(3 / k)}">⚠ ${n}</text>`;
    });
  }
  if (marks) {
    (BAY.marks || []).forEach(([n, x, y, kind], i) => {
      s += `<g class="seamark" data-mark="${i}" transform="translate(${x},${-y}) scale(${fx(1 / k)})"><circle r="11" fill="transparent"/>${seamarkGlyph(kind)}</g>`;
    });
  }
  if (labels) {
    const fs = 12 / k;
    BAY.labels.forEach(([t, x, y, kind]) => {
      const size = kind === 'town' ? fs * 1.25 : fs;
      s += `<text class="place place-${kind}" x="${x}" y="${-y}" font-size="${fx(size)}" stroke-width="${fx(3 / k)}">${t}</text>`;
    });
  }
  if (base) {
    s += `<g class="club-base" transform="translate(0,0) scale(${fx(1 / k)})">
      <circle r="9"/><path d="M-1,-6 L-1,5 L6,5 Z" fill="#fff"/><path d="M-3,-3 L-3,5 L-7,5 Z" fill="#64c5f1"/>
      <text x="14" y="5">CNBPP</text></g>`;
  }
  return s;
}

export const OSM_CREDIT = '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a>';

// Fiche d'une marque de navigation (pour une bulle d'information).
export function markCard(i) {
  const m = BAY.marks[i];
  if (!m) return '';
  const [name, x, y, kind, light] = m;
  const info = MARK_INFO[kind] || { label: 'Marque', text: '' };
  const dist = Math.round(Math.hypot(x, y));
  const brg = Math.round((((Math.atan2(x, y) * 180) / Math.PI) + 360) % 360);
  return `<b>${info.label}${name ? ` · ${name}` : ''}</b><span>${info.text}</span>${light ? `<small>Feu : ${light}</small>` : ''}<small>À ${dist >= 1000 ? `${(dist / 1000).toFixed(1)} km` : `${dist} m`} du club, au ${brg}°</small>`;
}

// Bulle d'information au toucher d'une balise dans une carte (wrap : conteneur positionné).
export function bindMarkPopovers(wrap) {
  let pop = null;
  wrap.addEventListener('click', (e) => {
    const g = e.target.closest('.seamark');
    if (pop) {
      pop.remove();
      pop = null;
    }
    if (!g) return;
    e.stopPropagation();
    const r = wrap.getBoundingClientRect();
    pop = document.createElement('div');
    pop.className = 'mark-pop';
    pop.innerHTML = markCard(+g.dataset.mark);
    wrap.appendChild(pop);
    const x = Math.min(r.width - pop.offsetWidth - 8, Math.max(8, e.clientX - r.left - pop.offsetWidth / 2));
    const y = e.clientY - r.top + 14 + pop.offsetHeight > r.height ? e.clientY - r.top - pop.offsetHeight - 14 : e.clientY - r.top + 14;
    pop.style.left = `${x}px`;
    pop.style.top = `${y}px`;
  });
}

// Icône d'une marque de navigation (pour les légendes).
export const markIcon = (kind, size = 28) => `<svg width="${size}" height="${size}" viewBox="-14 -15 28 28" aria-hidden="true">${seamarkGlyph(kind)}</svg>`;
