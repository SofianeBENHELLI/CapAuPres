// Géographie de la baie de La Baule. Coordonnées approximatives (à valider par le club).
// Repère local en mètres : origine au CNBPP, x vers l'est, y vers le nord.

export const ORIGIN = { lat: 47.2712, lon: -2.4252 };
const M_PER_DEG_LAT = 110540;
const M_PER_DEG_LON = 111320 * Math.cos((ORIGIN.lat * Math.PI) / 180);

export function toXY(lat, lon) {
  return { x: (lon - ORIGIN.lon) * M_PER_DEG_LON, y: (lat - ORIGIN.lat) * M_PER_DEG_LAT };
}
export function toLatLon(x, y) {
  return { lat: ORIGIN.lat + y / M_PER_DEG_LAT, lon: ORIGIN.lon + x / M_PER_DEG_LON };
}

// Trait de côte, d'ouest (Pointe de Penchâteau) à est (Pointe de Chémoulin), puis fermeture par l'intérieur des terres.
const COAST_LL = [
  [47.2700, -2.5000], [47.2620, -2.4720], [47.2575, -2.4520], [47.2552, -2.4447], // Penchâteau
  [47.2572, -2.4418], [47.2602, -2.4392], [47.2632, -2.4360], [47.2662, -2.4330],
  [47.2690, -2.4302], [47.2702, -2.4288], // jetée du Pouliguen
  [47.2708, -2.4268], [47.2714, -2.4235], [47.2723, -2.4195], [47.2735, -2.4140],
  [47.2748, -2.4070], [47.2759, -2.4000], [47.2767, -2.3930], [47.2770, -2.3860], // La Baule centre
  [47.2766, -2.3790], [47.2753, -2.3720], [47.2733, -2.3660], [47.2706, -2.3610],
  [47.2673, -2.3572], [47.2636, -2.3548], [47.2598, -2.3540], // Pornichet, port d'Armor
  [47.2562, -2.3520], [47.2536, -2.3470], [47.2510, -2.3400], // Pointe du Bec
  [47.2470, -2.3330], [47.2420, -2.3250], [47.2380, -2.3150], [47.2350, -2.3050], // Chémoulin
  [47.2330, -2.2900], [47.3200, -2.2900], [47.3200, -2.5000],
];
export const COAST = COAST_LL.map(([la, lo]) => toXY(la, lo));

// Îlots et roches : r = rayon émergé, shoal = rayon de la zone de hauts-fonds autour.
const ISLETS_LL = [
  { id: 'evens', name: 'Les Évens', lat: 47.2480, lon: -2.4050, r: 110, shoal: 220 },
  { id: 'baguenaude', name: 'La Baguenaude', lat: 47.2512, lon: -2.4190, r: 55, shoal: 130 },
  { id: 'penchateau', name: 'Roches de Penchâteau', lat: 47.2528, lon: -2.4452, r: 70, shoal: 160 },
  { id: 'impairs', name: 'Les Impairs', lat: 47.2300, lon: -2.3950, r: 60, shoal: 180 },
  { id: 'pierre-percee', name: 'Pierre Percée', lat: 47.2565, lon: -2.3625, r: 35, shoal: 90 },
  { id: 'petit-charpentier', name: 'Petit Charpentier', lat: 47.2212, lon: -2.3360, r: 30, shoal: 110 },
  { id: 'grand-charpentier', name: 'Grand Charpentier (phare)', lat: 47.2140, lon: -2.3190, r: 45, shoal: 150 },
];
export const ISLETS = ISLETS_LL.map((i) => ({ ...i, ...toXY(i.lat, i.lon) }));

export const PLACES = {
  club: { name: 'CNBPP, Le Pouliguen', ...toXY(47.2700, -2.4252) },
  jetee: { name: 'Jetée du Pouliguen', ...toXY(47.2680, -2.4282) },
  labaule: { name: 'La Baule centre', ...toXY(47.2752, -2.3900) },
  pornichet: { name: "Port d'Armor, Pornichet", ...toXY(47.2585, -2.3560) },
  benoit: { name: 'Plage Benoît', ...toXY(47.2730, -2.4100) },
};

export const BAND_300 = 300; // zone littorale des 300 m
export const SHOAL_COAST = 60; // bande d'estran où l'on touche le fond

export function pointInPolygon(p, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

function distToSegment(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const l2 = dx * dx + dy * dy || 1;
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

// Distance au trait de côte réel (on ignore les segments de fermeture à l'intérieur des terres).
const REAL_COAST_SEGMENTS = COAST.length - 3;
export function distToCoast(p) {
  let d = Infinity;
  for (let i = 0; i < REAL_COAST_SEGMENTS; i++) d = Math.min(d, distToSegment(p, COAST[i], COAST[i + 1]));
  return d;
}

export function isLand(p) {
  if (pointInPolygon(p, COAST)) return true;
  return ISLETS.some((i) => Math.hypot(p.x - i.x, p.y - i.y) < i.r);
}

// Renvoie null si l'eau est navigable, sinon la cause de l'échouement.
export function groundingAt(p) {
  if (pointInPolygon(p, COAST)) return { type: 'coast', name: 'la côte' };
  if (distToCoast(p) < SHOAL_COAST) return { type: 'coast', name: "l'estran" };
  for (const i of ISLETS) {
    const d = Math.hypot(p.x - i.x, p.y - i.y);
    if (d < i.r + 25) return { type: 'islet', name: i.name };
  }
  return null;
}

// Zone de hauts-fonds : avertissement, pas échouement.
export function shoalWarning(p) {
  for (const i of ISLETS) {
    const d = Math.hypot(p.x - i.x, p.y - i.y);
    if (d < i.shoal && d >= i.r + 25) return i;
  }
  return null;
}

export function inBand300(p) {
  return !pointInPolygon(p, COAST) && distToCoast(p) < BAND_300;
}

// Le segment AB reste-t-il en eau navigable ? (échantillonnage tous les `step` m)
export function segmentClear(a, b, step = 20) {
  const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / step));
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    if (groundingAt({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })) return false;
  }
  return true;
}

// Côté terre : le vent vient-il de la terre en ce point ? (vent de terre)
export function isOffshoreWindAt(p, twdDeg, fetch = 600) {
  const r = (twdDeg * Math.PI) / 180;
  const up = { x: p.x + Math.sin(r) * fetch, y: p.y + Math.cos(r) * fetch };
  return isLand(up);
}

export const BOUNDS = { minX: -5200, maxX: 9600, minY: -7400, maxY: 1200 };

// Grille d'eau navigable pour la recherche d'itinéraire (A*).
export function buildGrid(cell = 80, margin = 0) {
  const cols = Math.ceil((BOUNDS.maxX - BOUNDS.minX) / cell);
  const rows = Math.ceil((BOUNDS.maxY - BOUNDS.minY) / cell);
  const free = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const p = { x: BOUNDS.minX + (c + 0.5) * cell, y: BOUNDS.minY + (r + 0.5) * cell };
    let ok = !groundingAt(p);
    if (ok && margin) ok = distToCoast(p) > SHOAL_COAST + margin && ISLETS.every((i) => Math.hypot(p.x - i.x, p.y - i.y) > i.r + 25 + margin);
    free[r * cols + c] = ok ? 1 : 0;
  }
  return { cell, cols, rows, free };
}

export function findRoute(grid, a, b) {
  const { cell, cols, rows, free } = grid;
  const idx = (p) => {
    const c = Math.floor((p.x - BOUNDS.minX) / cell), r = Math.floor((p.y - BOUNDS.minY) / cell);
    return c < 0 || r < 0 || c >= cols || r >= rows ? -1 : r * cols + c;
  };
  const center = (i) => ({ x: BOUNDS.minX + ((i % cols) + 0.5) * cell, y: BOUNDS.minY + (Math.floor(i / cols) + 0.5) * cell });
  const s = idx(a), g = idx(b);
  if (s < 0 || g < 0) return null;
  const gScore = new Float64Array(cols * rows).fill(Infinity);
  const came = new Int32Array(cols * rows).fill(-1);
  const closed = new Uint8Array(cols * rows);
  const heap = [];
  const push = (i, f) => {
    heap.push([f, i]);
    let k = heap.length - 1;
    while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; }
  };
  const pop = () => {
    const top = heap[0], last = heap.pop();
    if (heap.length) {
      heap[0] = last; let k = 0;
      for (;;) {
        const l = 2 * k + 1, r = l + 1; let m = k;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m;
      }
    }
    return top;
  };
  const gc = center(g);
  const h = (i) => { const c = center(i); return Math.hypot(c.x - gc.x, c.y - gc.y); };
  gScore[s] = 0; push(s, h(s));
  const dirs = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];
  while (heap.length) {
    const [, i] = pop();
    if (closed[i]) continue;
    if (i === g) break;
    closed[i] = 1;
    const c = i % cols, r = Math.floor(i / cols);
    for (const [dc, dr, w] of dirs) {
      const nc = c + dc, nr = r + dr;
      if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
      const j = nr * cols + nc;
      if (!free[j] && j !== g) continue;
      const t = gScore[i] + w * cell;
      if (t < gScore[j]) { gScore[j] = t; came[j] = i; push(j, t + h(j)); }
    }
  }
  if (!isFinite(gScore[g])) return null;
  const path = [];
  for (let i = g; i !== -1; i = came[i]) path.push(center(i));
  path.reverse();
  path[0] = { ...a }; path[path.length - 1] = { ...b };
  // Lissage : on garde un point seulement si le segment direct touche le fond.
  const out = [path[0]];
  let k = 0;
  while (k < path.length - 1) {
    let j = path.length - 1;
    while (j > k + 1 && !segmentClear(path[k], path[j], 25)) j--;
    out.push(path[j]); k = j;
  }
  return out;
}

export function routeLength(route) {
  let d = 0;
  for (let i = 1; i < route.length; i++) d += Math.hypot(route[i].x - route[i - 1].x, route[i].y - route[i - 1].y);
  return d;
}
