// Simulation d'un plan de navigation : temps, manœuvres, passages de balises.
import { bearing, dist, twa, allureOf, tackOf, lerp } from './angles.js';
import { speedMs, speedKn, WINDS } from './polar.js';
import { resolveTurn, turnLabel } from './maneuver.js';
import { crossingT, segPointDist, buoys } from './course.js';
import { groundHit } from './land.js';
import { getBoat } from './boats.js';

export const PENALTY_EXTRA = 4; // s en plus d'un tour complet si on touche une bouée

// plan : { points: [{x,y}...] (points[0] = départ), turns: { [indexSommet]: 'alt' } }
export function simulate(level, cps, plan) {
  const W = level.wind.from;
  const wid = level.wind.level;
  const wind = WINDS[wid];
  const raw = plan.points;
  const turnsMode = plan.turns || {};

  // Retire les points confondus en gardant la correspondance des indices.
  const pts = [];
  const srcIndex = [];
  raw.forEach((p, i) => {
    if (!pts.length || dist(pts[pts.length - 1], p) > 0.5) {
      pts.push(p);
      srcIndex.push(i);
    }
  });

  const res = {
    ok: false, time: 0, reason: null, events: [], timeline: [], legs: [], turns: [],
    completed: 0, total: cps.length, penalties: 0, path: [pts[0]],
  };
  if (pts.length < 2) {
    res.reason = 'empty';
    return res;
  }

  const allBuoys = buoys(cps);
  let t = 0;
  let target = 0;
  let prevH = null;

  for (let i = 0; i < pts.length - 1; i++) {
    const p = pts[i];
    const q = pts[i + 1];
    const len = dist(p, q);
    const h = bearing(p, q);

    if (prevH !== null) {
      const mode = turnsMode[srcIndex[i]] === 'alt' ? 'alt' : 'auto';
      const info = resolveTurn(prevH, h, W, wid, mode);
      const label = turnLabel(info);
      res.turns.push({ vertex: srcIndex[i], at: p, from: prevH, to: h, ...info, label, mode });
      res.timeline.push({ type: 'turn', t0: t, t1: t + info.cost, at: p, h0: prevH, h1: h, dir: info.dir, deg: info.deg });
      if (label) res.events.push({ t, type: info.tacks ? 'tack' : 'gybe', label, at: p });
      t += info.cost;
    }

    const a = twa(h, W);
    const v = speedMs(a, wid);
    const leg = {
      index: i, from: p, to: q, heading: h, twa: a, allure: allureOf(a), tack: tackOf(h, W),
      speedKn: speedKn(a, wid), length: len, time: 0,
    };
    res.legs.push(leg);

    if (v === 0) {
      res.reason = 'irons';
      res.failLeg = i;
      res.events.push({ t, type: 'irons', label: 'Vent debout !', at: p });
      res.timeline.push({ type: 'stall', t0: t, t1: t + 3, at: p, h });
      res.time = t;
      res.completed = target;
      return res;
    }

    // Échouage : le segment coupe la côte ou un rocher (parcours dans la baie).
    const tl = level.bay ? groundHit(p, q, !!getBoat().keel) : null;
    const before = (x) => (x !== null && (tl === null || x < tl) ? x : null);

    // Passages de balises le long du segment (dans l'ordre).
    let tmin = -1;
    let endT = 1;
    let finished = false;
    for (let guard = 0; guard < 50; guard++) {
      const tc = target < cps.length ? before(crossingT(cps[target], p, q, 1, tmin)) : null;
      const prevCp = target > 0 ? cps[target - 1] : null;
      const tr = prevCp && prevCp.type === 'mark' ? before(crossingT(prevCp, p, q, -1, tmin)) : null;
      if (tc === null && tr === null) break;
      if (tr === null || (tc !== null && tc <= tr)) {
        const cp = cps[target];
        res.events.push({ t: t + (tc * len) / v, type: cp.type === 'finish' ? 'finish' : 'cp', cp: target, at: lerp(p, q, tc) });
        target++;
        tmin = tc;
        if (cp.type === 'finish') {
          finished = true;
          endT = tc;
          break;
        }
      } else {
        target--;
        res.events.push({ t: t + (tr * len) / v, type: 'unround', cp: target, at: lerp(p, q, tr) });
        tmin = tr;
      }
    }

    const aground = !finished && tl !== null;
    if (aground) endT = Math.max(0, tl - 2 / Math.max(len, 1)); // on s'arrête juste avant les rochers
    const end = lerp(p, q, endT);
    const segTime = (endT * len) / v;
    leg.time = segTime;
    res.timeline.push({ type: 'sail', t0: t, t1: t + segTime, p0: p, p1: end, h, kn: leg.speedKn, legIndex: i });
    t += segTime;
    res.path.push(end);
    if (aground) {
      res.reason = 'aground';
      res.failLeg = i;
      res.events.push({ t, type: 'aground', label: 'Échouage !', at: end });
      res.timeline.push({ type: 'stall', t0: t, t1: t + 3, at: end, h });
      res.time = t;
      res.completed = target;
      return res;
    }

    // Bouée touchée : pénalité d'un tour complet (360°).
    for (const b of allBuoys) {
      if (segPointDist(p, end, b) < b.r) {
        const cost = wind.tack + wind.gybe + PENALTY_EXTRA;
        res.penalties++;
        res.events.push({ t, type: 'touch', label: 'Bouée touchée : pénalité !', at: end });
        res.timeline.push({ type: 'turn', t0: t, t1: t + cost, at: end, h0: h, h1: h, dir: 'R', deg: 360 });
        t += cost;
        break;
      }
    }

    prevH = h;
    if (finished) {
      res.ok = true;
      res.time = t;
      res.completed = target;
      return res;
    }
  }

  res.time = t;
  res.completed = target;
  res.reason = 'incomplete';
  return res;
}

// État du bateau à l'instant t (pour l'animation).
export function stateAt(sim, time) {
  const tl = sim.timeline;
  if (!tl.length) return null;
  let ph = tl[tl.length - 1];
  for (const x of tl) {
    if (time <= x.t1) {
      ph = x;
      break;
    }
  }
  const k = ph.t1 > ph.t0 ? Math.max(0, Math.min(1, (time - ph.t0) / (ph.t1 - ph.t0))) : 1;
  if (ph.type === 'sail') return { pos: lerp(ph.p0, ph.p1, k), heading: ph.h, kn: ph.kn, phase: ph };
  if (ph.type === 'stall') return { pos: ph.at, heading: ph.h, kn: 0, phase: ph, stalled: true };
  const sign = ph.dir === 'L' ? -1 : 1;
  return { pos: ph.at, heading: ph.h0 + sign * ph.deg * k, kn: 1, phase: ph, turning: true };
}
