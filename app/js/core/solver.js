// Calcul de la trajectoire la plus rapide pour un parcours donné.
// 1) Programmation dynamique : entre deux points de passage, la route optimale
//    utilise au plus deux caps (ex. un bord tribord puis un bord bâbord).
//    L'état est (point de passage, point choisi, cap d'arrivée).
// 2) Affinage continu des sommets pour éliminer les effets de grille.
import { vec, add, mul, lerp, twa } from './angles.js';
import { speedMs, WINDS } from './polar.js';
import { resolveTurn, shortestDir } from './maneuver.js';
import { prepareCourse, approachOk, departOk, buoys, segPointDist, MARK_RADIUS } from './course.js';
import { simulate, PENALTY_EXTRA } from './sim.js';
import { clearOf } from './land.js';
import { getBoat } from './boats.js';

const MARK_OFFSET = 10;
// m : marge de sécurité de la route optimale avec les dangers ; réduite si une marque
// est elle-même proche des roches (îlot des Évens…)
const MARGINS = [10, 0];
let SAFE = 30; // marge au-delà du rayon de la marque ; l'affinage rapproche ensuite le passage

function candidates(cp) {
  if (cp.type === 'mark') return [add(cp, mul(cp.ray, (cp.r || MARK_RADIUS) + MARK_OFFSET))];
  const out = [];
  const n = 9;
  for (let i = 1; i <= n; i++) out.push(lerp(cp.a, cp.b, i / (n + 1)));
  return out;
}

export function solve(level, opts = {}) {
  for (const m of level.bay ? MARGINS : [0]) {
    SAFE = m;
    const r = solveWith(level, opts);
    if (r && r.sim.ok) return { ...r, margin: m };
  }
  return null;
}

// limits : { minTwa, maxTwa } pour simuler un barreur qui ne serre pas le vent ou ne lofe pas au portant
function solveWith(level, { step = 2, refine = true, limits = null } = {}) {
  const cps = prepareCourse(level);
  const W = level.wind.from;
  const wid = level.wind.level;
  const N = Math.round(360 / step);
  const H = new Float64Array(N);
  const VX = new Float64Array(N);
  const VY = new Float64Array(N);
  const U = [];
  const valid = [];
  for (let i = 0; i < N; i++) {
    const h = i * step;
    H[i] = h;
    const v = speedMs(twa(h, W), wid);
    const u = vec(h);
    U.push(u);
    VX[i] = u.x * v;
    VY[i] = u.y * v;
    const at = Math.abs(twa(h, W));
    if (v > 0 && (!limits || (at >= limits.minTwa && at <= limits.maxTwa))) valid.push(i);
  }
  // Coût de virage minimal (meilleur sens) entre deux caps de la grille.
  const trans = new Float64Array(N * N);
  const transAlt = new Uint8Array(N * N);
  for (const a of valid) {
    for (const b of valid) {
      if (a === b) continue;
      const best = resolveTurn(H[a], H[b], W, wid, 'best');
      trans[a * N + b] = best.cost;
      transAlt[a * N + b] = best.dir !== shortestDir(H[a], H[b]) ? 1 : 0;
    }
  }

  const keel = !!getBoat().keel;
  const allBuoys = buoys(cps);
  // Pénalité volontairement forte : la route optimale ne doit jamais toucher une bouée.
  const penalty = 3 * (WINDS[wid].tack + WINDS[wid].gybe + PENALTY_EXTRA);
  const hits = (A, B) => {
    if (Math.abs(A.x - B.x) + Math.abs(A.y - B.y) < 1e-9) return false;
    for (const b of allBuoys) if (segPointDist(A, B, b) < b.r + 0.5) return true;
    return false;
  };

  const stages = [{ pts: [level.start], cp: null }, ...cps.map((cp) => ({ pts: candidates(cp), cp }))];
  // T[s][j] : Float64Array(N) temps minimal en arrivant au point j de l'étape s avec le cap a.
  const T = stages.map((st) => st.pts.map(() => new Float64Array(N).fill(Infinity)));
  const back = stages.map((st) => st.pts.map(() => new Array(N).fill(null)));

  for (let s = 0; s < stages.length - 1; s++) {
    const st = stages[s];
    const nx = stages[s + 1];
    for (let j = 0; j < st.pts.length; j++) {
      // G[dep] : meilleur temps pour repartir de ce point avec le cap dep.
      const G = new Float64Array(N).fill(Infinity);
      const Garg = new Int32Array(N).fill(-1);
      if (s === 0) {
        for (const d of valid) G[d] = 0;
      } else {
        const Tj = T[s][j];
        for (const d of valid) {
          if (!departOk(st.cp, U[d])) continue;
          let best = Infinity;
          let arg = -1;
          for (const a of valid) {
            const ta = Tj[a];
            if (ta === Infinity) continue;
            const c = ta + (a === d ? 0 : trans[a * N + d]);
            if (c < best) {
              best = c;
              arg = a;
            }
          }
          G[d] = best;
          Garg[d] = arg;
        }
      }
      const P = st.pts[j];
      for (let k = 0; k < nx.pts.length; k++) {
        const Q = nx.pts[k];
        const dx = Q.x - P.x;
        const dy = Q.y - P.y;
        const Tk = T[s + 1][k];
        const Bk = back[s + 1][k];
        for (const h1 of valid) {
          for (const h2 of valid) {
            if (h1 === h2) continue;
            const det = VX[h1] * VY[h2] - VY[h1] * VX[h2];
            if (Math.abs(det) < 1e-9) continue;
            let t1 = (dx * VY[h2] - dy * VX[h2]) / det;
            let t2 = (VX[h1] * dy - VY[h1] * dx) / det;
            if (t1 < -1e-6 || t2 < -1e-6) continue;
            t1 = Math.max(0, t1);
            t2 = Math.max(0, t2);
            const dep = t1 > 1e-6 ? h1 : h2;
            const arr = t2 > 1e-6 ? h2 : h1;
            const g = G[dep];
            if (g === Infinity) continue;
            if (!approachOk(nx.cp, U[arr])) continue;
            const mid = t1 > 1e-6 && t2 > 1e-6 ? trans[h1 * N + h2] : 0;
            let c = g + t1 + t2 + mid;
            if (c < Tk[arr]) {
              const C = { x: P.x + VX[h1] * t1, y: P.y + VY[h1] * t1 };
              // la route de référence garde une marge de sécurité de 30 m avec la côte et les roches
              if (level.bay && (!clearOf(P, C, SAFE, keel) || !clearOf(C, Q, SAFE, keel))) continue;
              if (hits(P, C)) c += penalty;
              if (hits(C, Q)) c += penalty;
            }
            if (c < Tk[arr]) {
              Tk[arr] = c;
              Bk[arr] = { j, h1, h2, t1, t2, prevArr: s === 0 ? -1 : Garg[dep], dep };
            }
          }
        }
      }
    }
  }

  // Meilleure arrivée.
  const last = stages.length - 1;
  let best = { c: Infinity, k: -1, a: -1 };
  T[last].forEach((Tk, k) => {
    for (const a of valid) if (Tk[a] < best.c) best = { c: Tk[a], k, a };
  });
  if (best.k < 0) return null;

  // Reconstruction du chemin.
  const rev = [];
  let k = best.k;
  let a = best.a;
  for (let s = last; s > 0; s--) {
    const b = back[s][k][a];
    const P = stages[s - 1].pts[b.j];
    const Q = stages[s].pts[k];
    const corner = { x: P.x + VX[b.h1] * b.t1, y: P.y + VY[b.h1] * b.t1 };
    rev.push({ p: Q, alt: 0 });
    if (b.t1 > 1e-6 && b.t2 > 1e-6) rev.push({ p: corner, alt: transAlt[b.h1 * N + b.h2] });
    // sens du virage au sommet P (entre le cap d'arrivée précédent et le cap de départ)
    rev.push({ p: P, alt: s > 1 && b.prevArr >= 0 && b.prevArr !== b.dep ? transAlt[b.prevArr * N + b.dep] : 0, anchor: true });
    k = b.j;
    a = b.prevArr;
  }
  // rev contient chaque point d'étape deux fois (fin d'une jambe, début de la suivante) : fusion.
  const seq = rev.reverse();
  const points = [];
  const turns = {};
  seq.forEach((n) => {
    const lastP = points[points.length - 1];
    if (lastP && Math.hypot(lastP.x - n.p.x, lastP.y - n.p.y) < 1e-6) {
      if (n.alt) turns[points.length - 1] = 'alt';
      return;
    }
    if (n.alt) turns[points.length] = 'alt';
    points.push({ x: n.p.x, y: n.p.y });
  });

  let plan = simplify(level, cps, { points, turns });
  let sim = simulate(level, cps, plan);
  if (refine && sim.ok) {
    let r = refinePlan(level, cps, plan, sim.time + 1000 * sim.penalties);
    // Passe supplémentaire : on essaie d'ajouter un sommet au milieu de chaque segment.
    for (let i = 1; i < r.plan.points.length; i++) {
      const pts = r.plan.points;
      const mid = lerp(pts[i - 1], pts[i], 0.5);
      const cand = { points: [...pts.slice(0, i), mid, ...pts.slice(i)], turns: shiftTurns(r.plan.turns, i) };
      const s0 = simulate(level, cps, cand);
      if (!s0.ok) continue;
      const r2 = refinePlan(level, cps, cand, s0.time + 1000 * s0.penalties, 8);
      if (r2.time < r.time - 0.05) {
        r = r2;
        i++;
      }
    }
    plan = simplify(level, cps, r.plan);
    sim = simulate(level, cps, plan);
    // dernier recours si la route touche encore une bouée : on écarte les sommets voisins
    for (let tries = 0; tries < 3 && sim.ok && sim.penalties > 0; tries++) {
      const bs = buoys(cps);
      const pts = plan.points.map((p, i) => {
        if (i === 0) return p;
        const b = bs.find((q) => Math.hypot(q.x - p.x, q.y - p.y) < (q.r || 5) + 40);
        if (!b) return p;
        const d = Math.hypot(p.x - b.x, p.y - b.y) || 1;
        return { x: b.x + ((p.x - b.x) / d) * (d + 30), y: b.y + ((p.y - b.y) / d) * (d + 30) };
      });
      const cand = { points: pts, turns: plan.turns };
      const s0 = simulate(level, cps, cand);
      if (!s0.ok) break;
      const r3 = refinePlan(level, cps, cand, s0.time + 1000 * s0.penalties, 16);
      const s1 = simulate(level, cps, r3.plan);
      if (s1.ok && s1.penalties < sim.penalties) {
        plan = r3.plan;
        sim = s1;
      } else break;
    }
  }
  return { plan, sim, cps, dpTime: best.c };
}

// Retire les sommets inutiles (petits coudes dus à la grille).
function simplify(level, cps, plan) {
  let cur = plan;
  let curSim = simulate(level, cps, cur);
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 1; i < cur.points.length - 1; i++) {
      const pts = cur.points.filter((_, j) => j !== i);
      const turns = {};
      Object.entries(cur.turns).forEach(([k, v]) => {
        const n = +k;
        if (n < i) turns[n] = v;
        else if (n > i) turns[n - 1] = v;
      });
      const cand = { points: pts, turns };
      if (level.bay && !cand.points.every((p, j) => j === 0 || clearOf(cand.points[j - 1], p, SAFE, !!getBoat().keel))) continue;
      const s = simulate(level, cps, cand);
      if (s.ok && s.penalties <= curSim.penalties && s.time <= curSim.time + 1e-6) {
        cur = cand;
        curSim = s;
        changed = true;
        break;
      }
    }
  }
  return cur;
}

// Descente par coordonnées sur la position des sommets (le départ reste fixe).
function shiftTurns(turns, at) {
  const out = {};
  Object.entries(turns).forEach(([k, v]) => {
    out[+k >= at ? +k + 1 : +k] = v;
  });
  return out;
}

function refinePlan(level, cps, plan, time, startStep = 16) {
  let best = { points: plan.points.map((p) => ({ ...p })), turns: { ...plan.turns } };
  let bestT = time;
  // la route de référence ne doit jamais toucher une bouée
  const keel = !!getBoat().keel;
  const safe = (cand) => !level.bay || cand.points.every((p, i) => i === 0 || clearOf(cand.points[i - 1], p, SAFE, keel));
  const tryPlan = (cand) => {
    if (!safe(cand)) return Infinity;
    const s = simulate(level, cps, cand);
    return s.ok ? s.time + 1000 * s.penalties : Infinity;
  };
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]];
  for (let stepLen = startStep; stepLen >= 0.25; stepLen /= 2) {
    let improved = true;
    let guard = 0;
    while (improved && guard++ < 40) {
      improved = false;
      for (let i = 1; i < best.points.length; i++) {
        for (const [ux, uy] of dirs) {
          const pts = best.points.map((p, j) => (j === i ? { x: p.x + ux * stepLen, y: p.y + uy * stepLen } : p));
          const cand = { points: pts, turns: best.turns };
          const tt = tryPlan(cand);
          if (tt < bestT - 1e-6) {
            best = cand;
            bestT = tt;
            improved = true;
          }
        }
      }
      // Essaie l'autre sens de virage à chaque sommet.
      for (let i = 1; i < best.points.length - 1; i++) {
        const turns = { ...best.turns };
        if (turns[i] === 'alt') delete turns[i];
        else turns[i] = 'alt';
        const cand = { points: best.points, turns };
        const tt = tryPlan(cand);
        // on ne tourne « par le grand côté » que pour un vrai gain
        if (tt < bestT - 0.5) {
          best = cand;
          bestT = tt;
          improved = true;
        }
      }
    }
  }
  return { plan: best, time: bestT };
}

export { prepareCourse };
