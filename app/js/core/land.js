// Terre et rochers de la baie : détection d'échouage (segment qui coupe la côte)
// et test « point à terre ». Index spatial par grille pour rester rapide.
import { BAY } from '../data/bay.js';

const CELL = 200; // m

// Une roche isolée devient un petit octogone de 15 m de rayon.
const rockPoly = ([, x, y]) => Array.from({ length: 8 }, (_, i) => [x + 15 * Math.cos((i * Math.PI) / 4), y + 15 * Math.sin((i * Math.PI) / 4)]);

// Index spatial (grille numérique) d'un ensemble de polygones, avec test de segment rapide.
function makeIndex(polys) {
  const edges = [];
  let X0 = Infinity;
  let Y0 = Infinity;
  let X1 = -Infinity;
  let Y1 = -Infinity;
  polys.forEach((pts) => pts.forEach(([x, y]) => {
    X0 = Math.min(X0, x); Y0 = Math.min(Y0, y); X1 = Math.max(X1, x); Y1 = Math.max(Y1, y);
  }));
  X0 -= CELL;
  Y0 -= CELL;
  const COLS = Math.ceil((X1 - X0) / CELL) + 2;
  const ROWS = Math.ceil((Y1 - Y0) / CELL) + 2;
  const cells = new Array(COLS * ROWS);
  const cellOf = (gx, gy) => (gx < 0 || gy < 0 || gx >= COLS || gy >= ROWS ? -1 : gx * ROWS + gy);
  polys.forEach((pts) => {
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      const id = edges.length;
      edges.push([a[0], a[1], b[0], b[1]]);
      const x0 = Math.floor((Math.min(a[0], b[0]) - X0) / CELL);
      const x1 = Math.floor((Math.max(a[0], b[0]) - X0) / CELL);
      const y0 = Math.floor((Math.min(a[1], b[1]) - Y0) / CELL);
      const y1 = Math.floor((Math.max(a[1], b[1]) - Y0) / CELL);
      for (let gx = x0; gx <= x1; gx++) {
        for (let gy = y0; gy <= y1; gy++) {
          const k = cellOf(gx, gy);
          if (k >= 0) (cells[k] || (cells[k] = [])).push(id);
        }
      }
    }
  });
  const stamp = new Int32Array(edges.length);
  let query = 0;

  // Paramètre t ∈ [0, 1] du premier contact du segment p→q, ou null.
  // Parcours des seules cases traversées par le segment (algorithme d'Amanatides & Woo).
  function hit(p, q) {
    if (!edges.length) return null;
    query++;
    const dx = q.x - p.x;
    const dy = q.y - p.y;
    let gx = Math.floor((p.x - X0) / CELL);
    let gy = Math.floor((p.y - Y0) / CELL);
    const ex = Math.floor((q.x - X0) / CELL);
    const ey = Math.floor((q.y - Y0) / CELL);
    const sx = dx > 0 ? 1 : -1;
    const sy = dy > 0 ? 1 : -1;
    const tdx = dx !== 0 ? Math.abs(CELL / dx) : Infinity;
    const tdy = dy !== 0 ? Math.abs(CELL / dy) : Infinity;
    let tmx = dx !== 0 ? ((dx > 0 ? X0 + (gx + 1) * CELL : X0 + gx * CELL) - p.x) / dx : Infinity;
    let tmy = dy !== 0 ? ((dy > 0 ? Y0 + (gy + 1) * CELL : Y0 + gy * CELL) - p.y) / dy : Infinity;
    let best = null;
    for (let guard = 0; guard < 10000; guard++) {
      const k = cellOf(gx, gy);
      const ids = k >= 0 ? cells[k] : null;
      if (ids) {
        for (const id of ids) {
          if (stamp[id] === query) continue;
          stamp[id] = query;
          const [ax, ay, bx, by] = edges[id];
          const fx = bx - ax;
          const fy = by - ay;
          const den = dx * fy - dy * fx;
          if (Math.abs(den) < 1e-12) continue;
          const t = ((ax - p.x) * fy - (ay - p.y) * fx) / den;
          const u = ((ax - p.x) * dy - (ay - p.y) * dx) / den;
          if (t >= 0 && t <= 1 && u >= 0 && u <= 1 && (best === null || t < best)) best = t;
        }
      }
      // le premier contact trouvé dans une case déjà dépassée est forcément le bon
      if (best !== null && best <= Math.min(tmx, tmy)) return best;
      if (gx === ex && gy === ey) break;
      if (tmx < tmy) {
        tmx += tdx;
        gx += sx;
      } else {
        tmy += tdy;
        gy += sy;
      }
    }
    return best;
  }

  function near(p, max) {
    let best = max;
    const r = Math.ceil(max / CELL);
    const cx = Math.floor((p.x - X0) / CELL);
    const cy = Math.floor((p.y - Y0) / CELL);
    for (let gx = cx - r; gx <= cx + r; gx++) {
      for (let gy = cy - r; gy <= cy + r; gy++) {
        const k = cellOf(gx, gy);
        const ids = k >= 0 ? cells[k] : null;
        if (!ids) continue;
        for (const id of ids) {
          const [ax, ay, bx, by] = edges[id];
          const ex = bx - ax;
          const ey = by - ay;
          const l2 = ex * ex + ey * ey || 1;
          const t = Math.max(0, Math.min(1, ((p.x - ax) * ex + (p.y - ay) * ey) / l2));
          const d = Math.hypot(ax + ex * t - p.x, ay + ey * t - p.y);
          if (d < best) best = d;
        }
      }
    }
    return best;
  }
  return { hit, near };
}

// Dangers pour tous : côte, îlots, récifs (les Impairs…), roches isolées (Basse Saint-François…).
const polys = [BAY.mainland, ...BAY.islets, ...(BAY.reefs || []).map((r) => r.pts), ...(BAY.rocks || []).map(rockPoly)];
const HARD = makeIndex(polys);
// Hauts-fonds et bancs de sable : seuls les bateaux à quille (J80) s'y échouent.
const SHALLOW = makeIndex((BAY.shallows || []).map((s) => s.pts));

export const landHit = HARD.hit;
export const shallowHit = SHALLOW.hit;
// Échouage selon le bateau : un quillard touche aussi les hauts-fonds.
export const groundHit = (p, q, keel = false) => {
  const a = HARD.hit(p, q);
  if (!keel) return a;
  const b = SHALLOW.hit(p, q);
  return a === null ? b : b === null ? a : Math.min(a, b);
};

function inPoly(pts, x, y) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export const onLand = (p) => polys.some((pts) => inPoly(pts, p.x, p.y));

// Distance approximative au rivage (pour placer des bouées en eau libre).
// Le segment p→q reste-t-il à au moins `margin` mètres de tout danger ?
// (segment central + deux segments parallèles décalés + extrémités)
export function clearOf(p, q, margin = 30, keel = false) {
  if (groundHit(p, q, keel) !== null) return false;
  const L = Math.hypot(q.x - p.x, q.y - p.y) || 1;
  const nx = (-(q.y - p.y) / L) * margin;
  const ny = ((q.x - p.x) / L) * margin;
  for (const s of [1, -1]) {
    if (groundHit({ x: p.x + nx * s, y: p.y + ny * s }, { x: q.x + nx * s, y: q.y + ny * s }, keel) !== null) return false;
  }
  return HARD.near(q, margin) >= margin;
}

// Distance approximative au danger le plus proche (pour placer des bouées en eau libre).
export const distToLand = (p, max = 600) => HARD.near(p, max);
