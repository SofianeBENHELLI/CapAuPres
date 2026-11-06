// Navigation en temps réel : champ de vent (sautes + risées), physique du bateau,
// suivi du parcours et pilotage des concurrents. Indépendant de l'affichage
// (testable sous Node) et déterministe pour une graine donnée.
import { twa, norm180, vec, bearing, dist, lerp, NO_GO } from './angles.js';
import { speedKnTws, KN, WINDS, bestVmgAngles, PINCH } from './polar.js';
import { getBoat } from './boats.js';
import { crossingT, segPointDist, buoys } from './course.js';
import { groundHit } from './land.js';
import { mulberry32 } from './levels.js';
import { judge, conflict, avoidHeading } from './rules.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
// Ouverture idéale de la bôme selon l'angle du vent (même règle que le dessin).
export const idealBoom = (twaAbs) => clamp(0.55 * twaAbs - 12, 4, 85);

// ---------------------------------------------------------------- Vent
export class WindField {
  // box : zone (m) où naissent les risées ; shifts : sautes de vent activées
  constructor(wind, seed, box, { shifts = true } = {}) {
    const rnd = mulberry32(seed);
    this.rnd = rnd;
    this.from = wind.from;
    this.kts = WINDS[wind.level].kts;
    const amp = !shifts ? 0 : wind.level === 'light' ? 12 : wind.level === 'strong' ? 7 : 9;
    this.osc = [
      { amp, period: 240 + rnd() * 200, phase: rnd() * Math.PI * 2 },
      { amp: amp * 0.45, period: 70 + rnd() * 50, phase: rnd() * Math.PI * 2 },
    ];
    this.box = box;
    this.gusts = [];
    const n = shifts ? 9 : 0;
    for (let i = 0; i < n; i++) this.gusts.push(this.spawn(0, true));
  }

  spawn(t, anywhere = false) {
    const r = this.rnd;
    const { minX, maxX, minY, maxY } = this.box;
    const w = maxX - minX;
    const h = maxY - minY;
    // une risée naît au vent de la zone (ou n'importe où au départ) et descend avec le vent
    const up = vec(this.from);
    const c = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
    const span = Math.max(w, h);
    const side = (r() - 0.5) * span;
    const perp = { x: up.y, y: -up.x };
    const back = anywhere ? (r() - 0.5) * span : span * 0.6;
    return {
      x: c.x + up.x * back + perp.x * side,
      y: c.y + up.y * back + perp.y * side,
      r: 120 + r() * 220,
      str: 0.22 + r() * 0.3, // +22 % à +52 % de vent au cœur de la risée
      born: t,
      life: 140 + r() * 160,
    };
  }

  dirAt(t) {
    return this.from + this.osc.reduce((s, o) => s + o.amp * Math.sin((2 * Math.PI * t) / o.period + o.phase), 0);
  }

  // Vent ressenti au point p à l'instant t : direction (d'où il vient) et force (nœuds).
  at(t, p) {
    let f = 1;
    for (const g of this.gusts) {
      const d = Math.hypot(p.x - g.x, p.y - g.y);
      if (d < g.r) {
        const age = (t - g.born) / g.life;
        const fade = Math.sin(Math.PI * clamp(age, 0, 1));
        f += g.str * fade * (1 - (d / g.r) ** 2);
      }
    }
    return { from: this.dirAt(t), kts: this.kts * f };
  }

  update(t, dt) {
    const down = vec(this.dirAt(t) + 180);
    const v = this.kts * KN * 0.7; // les risées avancent un peu moins vite que le vent
    this.gusts = this.gusts.map((g) => {
      if (t - g.born > g.life) return this.spawn(t);
      return { ...g, x: g.x + down.x * v * dt, y: g.y + down.y * v * dt };
    });
  }
}

// ---------------------------------------------------------------- Suivi du parcours
export class Tracker {
  constructor(cps) {
    this.cps = cps;
    this.target = 0;
    this.finished = false;
    this.touched = new Map(); // bouée -> déjà comptée
    this.buoys = buoys(cps);
  }

  // Segment parcouru p→q : passages de marques, retours en arrière, bouées touchées.
  advance(p, q, onEvent) {
    let tmin = -1;
    for (let guard = 0; guard < 10 && !this.finished; guard++) {
      const tc = this.target < this.cps.length ? crossingT(this.cps[this.target], p, q, 1, tmin) : null;
      const prev = this.target > 0 ? this.cps[this.target - 1] : null;
      const tr = prev && prev.type === 'mark' ? crossingT(prev, p, q, -1, tmin) : null;
      if (tc === null && tr === null) break;
      if (tr === null || (tc !== null && tc <= tr)) {
        const cp = this.cps[this.target];
        this.target++;
        tmin = tc;
        if (cp.type === 'finish') this.finished = true;
        onEvent({ type: cp.type === 'finish' ? 'finish' : 'cp', cp: this.target - 1, at: lerp(p, q, tc) });
      } else {
        this.target--;
        tmin = tr;
        onEvent({ type: 'unround', cp: this.target });
      }
    }
    this.buoys.forEach((b, i) => {
      const d = segPointDist(p, q, b);
      if (d < b.r && !this.touched.get(i)) {
        this.touched.set(i, true);
        onEvent({ type: 'touch', buoy: i });
      } else if (d > b.r * 4) this.touched.set(i, false);
    });
  }
}

// ---------------------------------------------------------------- Bateau
export function makeBoat(id, pos, heading, { ai = null, skill = 1, name, color } = {}) {
  const L = getBoat().live;
  return {
    id, name, color, x: pos.x, y: pos.y, heading, speed: 0, rudder: 0,
    auto: true, boom: 20, // réglage automatique de l'écoute (sinon angle de bôme choisi)
    skill, ai, len: L.length, length: L.length, tau: L.tau, turnRate: L.turnRate,
    tracker: null, finished: false, finishTime: null, penaltyLeft: 0, spin: 0,
    aground: 0, tacks: 0, gybes: 0, fouls: 0, lastTwa: null, track: [{ x: pos.x, y: pos.y }],
  };
}

export function trimEfficiency(b, a) {
  if (Math.abs(a) < PINCH) return 0;
  if (b.auto) return 1;
  const err = b.boom - idealBoom(Math.abs(a));
  return Math.max(0.15, 1 - (err / 35) ** 2);
}

// Avance d'un pas de temps. ctx : { race, level, onEvent }
export function stepBoat(b, wind, t, dt, ctx) {
  if (b.finished) {
    b.speed *= Math.exp(-dt / 2);
    return;
  }
  const w = wind.at(t, b);
  // pénalité : le bateau fait ses tours sur place
  if (b.penaltyLeft > 0) {
    const turn = 720 / ctx.penaltyTime;
    b.heading += turn * dt;
    b.spin += turn * dt;
    b.penaltyLeft -= dt;
    b.speed *= Math.exp(-dt / 1.5);
    if (b.penaltyLeft <= 0) {
      b.penaltyLeft = 0;
      ctx.onEvent(b, { type: 'penalty-done' });
    }
  } else if (b.aground > 0) {
    b.aground -= dt;
    b.speed = 0;
  } else {
    const grip = 0.35 + 0.65 * Math.min(1, b.speed / 2.2);
    b.heading += b.turnRate * clamp(b.rudder, -1, 1) * grip * dt;
  }
  const a = twa(b.heading, w.from);
  // virements et empannages : changement de côté du vent
  if (b.lastTwa !== null && Math.sign(a) !== Math.sign(b.lastTwa) && b.penaltyLeft <= 0) {
    if (Math.abs(a) < 90) {
      b.tacks++;
      ctx.onEvent(b, { type: 'tack' });
    } else {
      b.gybes++;
      ctx.onEvent(b, { type: 'gybe' });
    }
  }
  b.lastTwa = a;
  const target = b.aground > 0 ? 0 : speedKnTws(a, w.kts) * KN * trimEfficiency(b, a) * b.skill;
  const tau = target < b.speed ? (Math.abs(a) < NO_GO ? b.tau * 0.45 : b.tau * 0.8) : b.tau;
  b.speed += (target - b.speed) * (1 - Math.exp(-dt / tau));
  b.tacking = Math.abs(a) < NO_GO;

  const p = { x: b.x, y: b.y };
  const u = vec(b.heading);
  const q = { x: p.x + u.x * b.speed * dt, y: p.y + u.y * b.speed * dt };
  if (ctx.level.bay && b.speed > 0.01) {
    const tl = groundHit(p, q, !!getBoat().keel);
    if (tl !== null) {
      // échouage : le bateau s'arrête, recule et repart après un délai
      b.x = p.x - u.x * 12;
      b.y = p.y - u.y * 12;
      b.speed = 0;
      b.aground = ctx.agroundTime;
      ctx.onEvent(b, { type: 'aground', at: lerp(p, q, tl) });
      return;
    }
  }
  b.x = q.x;
  b.y = q.y;
  if (b.tracker) {
    b.tracker.advance(p, q, (ev) => {
      if (ev.type === 'finish') {
        b.finished = true;
        b.finishTime = t;
      }
      ctx.onEvent(b, ev);
    });
  }
  const last = b.track[b.track.length - 1];
  if (dist(last, b) > 15) b.track.push({ x: b.x, y: b.y });
}

// ---------------------------------------------------------------- Pilote automatique (concurrents)
// Le pilote suit une route (sommets de la route optimale) ; s'il ne peut pas la tenir
// à cause d'une saute de vent, il navigue au près sur le bord le plus favorable.
export function autopilot(b, wind, t, others, windFrom) {
  const route = b.ai.route;
  // on passe au point suivant quand la marque associée est validée, ou quand le point
  // de passage libre est atteint / dépassé dans l'axe d'arrivée
  for (let guard = 0; guard < route.length; guard++) {
    const wp = route[b.ai.i];
    if (!wp || b.ai.i >= route.length - 1) break;
    const prev = b.ai.i > 0 ? route[b.ai.i - 1] : b.ai.from;
    const done = wp.cp !== null ? b.tracker.target > wp.cp : dist(b, wp) < 30 || beyond(prev, wp, b);
    if (!done) break;
    b.ai.i++;
  }
  let wp = route[b.ai.i] || route[route.length - 1];
  const prev = b.ai.i > 0 ? route[b.ai.i - 1] : b.ai.from;
  // pour une ligne (porte, arrivée), on vise un peu au-delà pour être sûr de la franchir
  let aim = wp;
  if (wp.cp !== null && b.cps && b.cps[wp.cp].type === 'mark' && b.tracker.target <= wp.cp) {
    // contournement : on vise 40 m au-delà de la bouée sur l'axe de contournement, ce qui
    // oblige à en faire le tour du bon côté ; une fois ce point atteint, on enchaîne
    // deux temps : un point d'entrée du côté d'arrivée, puis un point de sortie de l'autre
    // côté de l'axe de contournement (le franchissement se fait donc dans le bon sens)
    const c = b.cps[wp.cp];
    const R = (c.r || 5) + 35;
    const pos = { x: -c.ray.y * c.sense, y: c.ray.x * c.sense }; // côté « déjà contourné »
    const entry = { x: c.x + c.ray.x * R - pos.x * R, y: c.y + c.ray.y * R - pos.y * R };
    const exit = { x: c.x + c.ray.x * R + pos.x * R, y: c.y + c.ray.y * R + pos.y * R };
    if (b.ai.round !== b.ai.i && dist(b, entry) < 30) b.ai.round = b.ai.i;
    aim = b.ai.round === b.ai.i ? exit : entry;
    if (b.ai.round === b.ai.i && dist(b, exit) < 25) b.ai.latch = b.ai.i;
    if (b.ai.latch === b.ai.i && route[b.ai.i + 1]) aim = route[b.ai.i + 1];
    wp = { ...aim, cp: null };
  }
  const isLine = wp.cp !== null && b.cps && b.cps[wp.cp].type !== 'mark';
  if (isLine && b.tracker.target <= wp.cp && dist(b, wp) < 35) {
    // tout près de la ligne : on la traverse dans le sens du parcours, en visant 40 m au-delà
    const n = b.cps[wp.cp].normal;
    aim = { x: wp.x + n.x * 40, y: wp.y + n.y * 40 };
  }
  const w = wind.at(t, b);
  // surveillance : sans progrès pendant 60 s (embouteillage, cercles), on se dégage au travers
  const pr = b.ai.prog || (b.ai.prog = { t, i: b.ai.i, tg: b.tracker.target, d: dist(b, aim) });
  if (t - pr.t > 60) {
    const stuck = b.ai.i === pr.i && b.tracker.target === pr.tg && dist(b, aim) > pr.d - 15;
    if (stuck && !b.ai.escape) {
      const near = others.filter((o) => o !== b && !o.finished).sort((x, y) => dist(b, x) - dist(b, y))[0];
      const away = near ? bearing(near, b) : b.heading;
      const h1 = w.from + 100;
      const h2 = w.from - 100;
      b.ai.escape = { until: t + 15, h: Math.abs(norm180(h1 - away)) < Math.abs(norm180(h2 - away)) ? h1 : h2 };
    }
    b.ai.prog = { t, i: b.ai.i, tg: b.tracker.target, d: dist(b, aim) };
  }
  if (b.ai.escape && t > b.ai.escape.until) b.ai.escape = null;
  const B = bearing(b, aim);
  let desired = b.ai.escape ? b.ai.escape.h : B;
  const up = b.ai.upAngle;
  if (b.ai.escape) {
    // dégagement en cours
  } else if (Math.abs(twa(B, w.from)) < up) {
    // près : on garde son bord jusqu'à la layline, ou si l'on s'écarte trop de la route directe
    const h1 = w.from + up;
    const h2 = w.from - up;
    if (!b.ai.beat || Math.abs(twa(b.heading, w.from)) > up + 30) b.ai.beat = Math.abs(norm180(h1 - b.heading)) < Math.abs(norm180(h2 - b.heading)) ? 1 : 2;
    const D = dist(b, aim);
    const leg = { x: aim.x - prev.x, y: aim.y - prev.y };
    const L2 = Math.hypot(leg.x, leg.y) || 1;
    const off = Math.abs(((b.x - prev.x) * leg.y - (b.y - prev.y) * leg.x) / L2); // écart à la route directe
    const crowded = others.some((o) => o !== b && !o.finished && dist(b, o) < b.len * 4);
    if (off > Math.max(120, D * 0.45) && t - (b.ai.lastTack || -99) > 20 && !crowded) {
      // trop loin de l'axe : on vire si l'autre bord nous ramène vers l'axe
      const cur = b.ai.beat === 1 ? h1 : h2;
      const oth = b.ai.beat === 1 ? h2 : h1;
      if (Math.abs(norm180(B - oth)) < Math.abs(norm180(B - cur))) {
        b.ai.beat = b.ai.beat === 1 ? 2 : 1;
        b.ai.lastTack = t;
      }
    }
    desired = b.ai.beat === 1 ? h1 : h2;
  } else if (Math.abs(twa(B, w.from)) > b.ai.downAngle) {
    b.ai.beat = 0;
    // vent arrière dans l'axe : on reste sur son empannage à l'angle optimal,
    // et on n'empanne que lorsque la cible est atteignable sur l'autre bord
    const dn = b.ai.downAngle;
    const g1 = w.from + dn;
    const g2 = w.from - dn;
    if (!b.ai.run) b.ai.run = Math.abs(norm180(g1 - b.heading)) < Math.abs(norm180(g2 - b.heading)) ? 1 : 2;
    desired = b.ai.run === 1 ? g1 : g2;
    if (dist(b, aim) < 25) desired = B;
  } else {
    b.ai.beat = 0;
    b.ai.run = 0;
  }
  // règles 13 et 15 : en changeant d'amure (virement ou empannage) on perd souvent la priorité ;
  // on retarde donc la manœuvre tant qu'un bateau est tout proche (au plus 25 s, la terre
  // reste prioritaire juste après) en gardant le même angle au vent sur l'amure actuelle
  const tw = twa(b.heading, w.from);
  const twd = twa(desired, w.from);
  const changesTack = Math.abs(tw) >= NO_GO && Math.sign(twd) !== Math.sign(tw);
  if (changesTack && !b.ai.escape) {
    const busy = others.some((o) => o !== b && !o.finished && dist(b, o) < b.len * 5);
    if (busy) {
      b.ai.holdTack = b.ai.holdTack ?? t;
      if (t - b.ai.holdTack < 25) desired = w.from - Math.sign(tw) * clamp(Math.abs(twd), up, 175);
    } else b.ai.holdTack = null;
  } else b.ai.holdTack = null;
  // terre droit devant : on cherche le cap le plus proche qui passe au large
  if (b.ai.bay) {
    const look = Math.max(70, b.speed * 25);
    const clear = (h) => {
      const u = vec(h);
      return groundHit(b, { x: b.x + u.x * look, y: b.y + u.y * look }, !!getBoat().keel) === null;
    };
    if (!clear(desired)) {
      for (let d = 10; d <= 120; d += 10) {
        const cand = [desired + d, desired - d].find((h) => Math.abs(twa(h, w.from)) >= up && clear(h));
        if (cand !== undefined) {
          desired = cand;
          break;
        }
      }
    }
  }
  // règles de priorité : le bateau qui doit s'écarter évite l'autre (même horizon pour
  // détecter le risque et choisir le cap d'évitement, sinon il croit le risque déjà réglé) ;
  // un bateau en train de faire ses tours de pénalité est évité par tous (règle 21)
  for (const o of others) {
    if (o === b || o.finished || dist(b, o) > Math.max(80, (b.speed + o.speed) * 12)) continue;
    const opts = { horizon: AVOID_HORIZON, minDist: b.len * 2.5 };
    const c = conflict(b, o, windFrom, opts);
    if (!c.risk) continue;
    const r = judge(b, o, windFrom, sharedMark(b, o));
    // on évite aussi un bateau arrêté (échoué, dans le vent) : règle 14, éviter le contact
    if (r.keepClear === 'a' || o.penaltyLeft > 0 || o.aground > 0 || (o.speed < 0.5 && b.speed > o.speed)) {
      desired = avoidHeading(b, o, windFrom, opts);
      break;
    }
  }
  b.rudder = clamp(norm180(desired - b.heading) / 20, -1, 1);
}

// horizon d'anticipation (s) ; marge visée : 2,5 longueurs (le contact a lieu vers 0,85 longueur)
const AVOID_HORIZON = 12;

// Marque que deux bateaux s'apprêtent tous les deux à contourner (règle 18), sinon null.
// On garde aussi la marque qu'un bateau vient de passer tant que l'autre ne l'a pas passée :
// la place à la marque vaut pendant tout le contournement.
export function sharedMark(a, b) {
  if (!a.tracker || !b.tracker) return null;
  const ta = a.tracker.target;
  const tb = b.tracker.target;
  const idx = ta === tb ? ta : Math.abs(ta - tb) === 1 ? Math.min(ta, tb) : -1;
  const cp = a.cps?.[idx];
  return cp && cp.type === 'mark' ? cp : null;
}

function beyond(prev, wp, b) {
  const d1 = { x: wp.x - prev.x, y: wp.y - prev.y };
  const d2 = { x: b.x - wp.x, y: b.y - wp.y };
  return d1.x * d2.x + d1.y * d2.y > 0 && dist(b, wp) < 150;
}

// Route d'un concurrent : sommets de la route optimale, chacun relié à sa marque s'il en est une.
export function buildRoute(sim, cps, rnd = null, lane = 0) {
  // Points de passage tirés de la simulation de la route optimale : sommets libres
  // + points exacts de franchissement de chaque marque (associés à la marque).
  const res = [];
  for (const ph of sim.timeline) {
    if (ph.type !== 'sail') continue;
    sim.events
      .filter((e) => (e.type === 'cp' || e.type === 'finish') && e.t >= ph.t0 - 1e-6 && e.t <= ph.t1 + 1e-6)
      .sort((x, y) => x.t - y.t)
      .forEach((e) => res.push({ x: e.at.x, y: e.at.y, cp: e.cp }));
    if (!res.length || res[res.length - 1].cp === null || Math.hypot(res[res.length - 1].x - ph.p1.x, res[res.length - 1].y - ph.p1.y) > 1) {
      res.push({ x: ph.p1.x, y: ph.p1.y, cp: null });
    }
  }
  // franchissement d'une ligne : on vise l'intérieur de la porte (20 % à 80 % de sa longueur)
  res.forEach((p) => {
    if (p.cp === null || cps[p.cp].type === 'mark') return;
    const c = cps[p.cp];
    const L = Math.hypot(c.b.x - c.a.x, c.b.y - c.a.y) || 1;
    const u = Math.max(0.2, Math.min(0.8, ((p.x - c.a.x) * (c.b.x - c.a.x) + (p.y - c.a.y) * (c.b.y - c.a.y)) / (L * L)));
    p.x = c.a.x + (c.b.x - c.a.x) * u;
    p.y = c.a.y + (c.b.y - c.a.y) * u;
  });
  // un point libre confondu avec un point de franchissement est inutile
  for (let i = res.length - 1; i > 0; i--) {
    if (res[i].cp === null && Math.hypot(res[i].x - res[i - 1].x, res[i].y - res[i - 1].y) < 5) res.splice(i, 1);
    else if (res[i - 1].cp === null && res[i].cp !== null && Math.hypot(res[i].x - res[i - 1].x, res[i].y - res[i - 1].y) < 5) res.splice(i - 1, 1);
  }
  // couloirs : chaque concurrent franchit les lignes à un endroit différent et
  // contourne les bouées plus ou moins large, pour éviter les embouteillages
  if (lane) {
    res.forEach((p) => {
      if (p.cp === null) return;
      const c = cps[p.cp];
      if (c.type === 'mark') {
        p.x += c.ray.x * Math.abs(lane) * 9;
        p.y += c.ray.y * Math.abs(lane) * 9;
      } else {
        const L = Math.hypot(c.b.x - c.a.x, c.b.y - c.a.y) || 1;
        const ux = (c.b.x - c.a.x) / L;
        const uy = (c.b.y - c.a.y) / L;
        const u = ((p.x - c.a.x) * ux + (p.y - c.a.y) * uy + lane * 16);
        const uu = Math.max(L * 0.2, Math.min(L * 0.8, u));
        p.x = c.a.x + ux * uu;
        p.y = c.a.y + uy * uu;
      }
    });
  }
  // petite variation des points libres pour que la flotte ne soit pas en file indienne
  if (rnd) {
    res.forEach((p, k) => {
      if (p.cp === null && k < res.length - 1) {
        p.x += (rnd() - 0.5) * 30;
        p.y += (rnd() - 0.5) * 30;
      }
    });
  }
  return res;
}

export function downwindAngle(level) {
  return Math.min(178, bestVmgAngles(level.wind.level).down.angle);
}

export function upwindAngle(level) {
  return Math.max(NO_GO + 2, bestVmgAngles(level.wind.level).up.angle);
}

// ---------------------------------------------------------------- Course (joueur + flotte)
const NAMES = ['Inès', 'Malo', 'Jade', 'Nolan', 'Lou', 'Gabin', 'Rose'];
const COLORS = ['#e5484d', '#f5a623', '#8e4ec6', '#12a594', '#ffffff', '#3e63dd', '#ff8a3d'];

export class Race {
  // solution : simulation de la route optimale (sol.sim) ; box : zone visible (pour les risées)
  constructor(level, cps, { seed = 1, fleet = 0, shifts = true, solution, box, auto = true } = {}) {
    this.level = level;
    this.cps = cps;
    this.t = 0;
    this.events = [];
    this.wind = new WindField(level.wind, seed, box, { shifts });
    const w = WINDS[level.wind.level];
    this.penaltyTime = 2 * (w.tack + w.gybe); // « deux tours » (règle 44.2)
    this.agroundTime = 15;
    const first = cps[0].type === 'mark' ? cps[0] : lerp(cps[0].a, cps[0].b, 0.5);
    const h0 = bearing(level.start, first);
    const up = vec(level.wind.from);
    const perp = { x: up.y, y: -up.x };
    this.player = makeBoat('me', level.start, h0, { name: 'Toi', color: '#173d61' });
    this.player.auto = auto;
    this.player.tracker = new Tracker(cps);
    this.player.cps = cps;
    this.boats = [this.player];
    const rnd = mulberry32(seed * 31 + 7);
    const upA = upwindAngle(level);
    for (let i = 0; i < fleet; i++) {
      // concurrents alignés de part et d'autre du joueur, un peu sous le vent
      const side = (i % 2 ? 1 : -1) * (Math.floor(i / 2) + 1) * 22;
      const pos = { x: level.start.x + perp.x * side - up.x * 10, y: level.start.y + perp.y * side - up.y * 10 };
      const lane = (i % 2 ? 1 : -1) * (Math.floor(i / 2) + 1);
      const route = buildRoute(solution, cps, rnd, lane);
      const b = makeBoat(`ai${i}`, pos, h0, {
        ai: { route, i: 0, from: pos, upAngle: upA + (rnd() - 0.5) * 4, downAngle: downwindAngle(level), bay: !!level.bay },
        skill: 0.9 + rnd() * 0.08,
        name: NAMES[i % NAMES.length],
        color: COLORS[i % COLORS.length],
      });
      b.tracker = new Tracker(cps);
      b.cps = cps;
      this.boats.push(b);
    }
    this.cooldown = new Map();
    this.aiFouls = 0; // fautes commises par les concurrents (envers le joueur ou entre eux)
    this.aiContacts = 0; // contacts entre concurrents
  }

  emit(b, ev) {
    this.events.push({ t: this.t, boat: b.id, ...ev });
  }

  step(dt) {
    this.t += dt;
    const t = this.t;
    this.wind.update(t, dt);
    const ctx = { level: this.level, penaltyTime: this.penaltyTime, agroundTime: this.agroundTime, onEvent: (b, ev) => this.emit(b, ev) };
    const windFrom = this.wind.dirAt(t);
    for (const b of this.boats) {
      if (b.ai && !b.finished && b.penaltyLeft <= 0) autopilot(b, this.wind, t, this.boats, windFrom);
    }
    for (const b of this.boats) {
      stepBoat(b, this.wind, t, dt, ctx);
      // bouée touchée : pénalité d'un tour en régate, délai fixe sinon
    }
    this.checkFouls(windFrom);
  }

  // Contact entre deux bateaux : celui qui devait s'écarter fait ses deux tours.
  checkFouls(windFrom) {
    const bs = this.boats;
    for (let i = 0; i < bs.length; i++) {
      for (let j = i + 1; j < bs.length; j++) {
        const a = bs[i];
        const b = bs[j];
        if (a.finished || b.finished) continue;
        if (dist(a, b) > (a.len + b.len) * 0.42) continue; // coques qui se touchent
        if (a.penaltyLeft > 0 || b.penaltyLeft > 0) continue; // règle 21 : déjà en pénalité
        if (a.aground > 0 || b.aground > 0) continue; // bateau échoué : pas de jugement de priorité
        const key = `${a.id}|${b.id}`;
        if ((this.cooldown.get(key) || -1e9) > this.t - 20) continue;
        this.cooldown.set(key, this.t);
        const withPlayer = a === this.player || b === this.player;
        if (!withPlayer) this.aiContacts++;
        const r = judge(a, b, windFrom, sharedMark(a, b));
        if (!r.keepClear) continue;
        const guilty = r.keepClear === 'a' ? a : b;
        guilty.fouls++;
        if (guilty !== this.player) this.aiFouls++;
        guilty.penaltyLeft = this.penaltyTime;
        guilty.spin = 0;
        this.emit(guilty, { type: 'foul', rule: r.rule, reason: r.reason, other: (guilty === a ? b : a).id });
      }
    }
  }

  get over() {
    return this.player.finished && this.boats.every((b) => b.finished || this.t > this.player.finishTime + 120);
  }

  ranking() {
    const done = this.boats.filter((b) => b.finished).sort((a, b) => a.finishTime - b.finishTime);
    const rest = this.boats
      .filter((b) => !b.finished)
      .sort((a, b) => b.tracker.target - a.tracker.target);
    return [...done, ...rest];
  }
}
