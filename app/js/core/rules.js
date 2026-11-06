// Règles de course à la voile (RCV), Partie 2, sections A, B et C (règle 18) — version simplifiée.
// Bateaux modélisés par un segment de longueur L : étrave = position + vec(cap)·L/2,
// arrière = position − vec(cap)·L/2. Conventions de angles.js (x Est, y Nord, cap horaire).

import { NO_GO, norm180, norm360, vec, twa, tackOf, dot, cross, sub, add, mul, bearing, dist } from './angles.js';

export const RULE_TEXT = {
  '10': 'Amures opposées : le bateau bâbord amure s’écarte du bateau tribord amure (tribord est prioritaire).',
  '11': 'Même amure, engagés : le bateau au vent s’écarte du bateau sous le vent.',
  '12': 'Même amure, non engagés : le bateau en route libre derrière s’écarte du bateau en route libre devant.',
  '13': 'Pendant le virement : le bateau qui vire de bord s’écarte des autres jusqu’à être au près.',
  '18': 'À la marque : quand deux bateaux engagés arrivent dans la zone (3 longueurs autour de la bouée), celui de l’extérieur laisse la place de contourner à celui de l’intérieur.',
};

const TACK_LABEL = { tribord: 'tribord amure', babord: 'bâbord amure' };

const nameOf = (boat, fallback) => (boat.id != null ? String(boat.id) : fallback);

// Extrémités du segment-coque.
export function hullPoints(boat) {
  const half = mul(vec(boat.heading), (boat.length ?? 0) / 2);
  const c = { x: boat.x, y: boat.y };
  return { bow: add(c, half), stern: sub(c, half) };
}

// Un bateau « vire de bord » s’il porte le drapeau tacking ET se trouve encore
// dans la zone vent debout (|twa| < NO_GO) : il n’a pas encore atteint le près.
export function isTacking(boat, windFrom) {
  return !!boat.tacking && Math.abs(twa(boat.heading, windFrom)) < NO_GO;
}

// Distance signée (le long du cap de b) de la partie la plus avant de a par rapport
// à la ligne perpendiculaire passant par l’arrière de b. < 0 : a entièrement derrière.
function aheadOfAbeam(a, b) {
  const { stern } = hullPoints(b);
  const u = vec(b.heading);
  const pa = hullPoints(a);
  return Math.max(dot(sub(pa.bow, stern), u), dot(sub(pa.stern, stern), u));
}

// a est « en route libre derrière » b : toute sa coque est derrière la ligne
// perpendiculaire au cap de b passant par le point le plus arrière de b.
export function clearAstern(a, b) {
  return aheadOfAbeam(a, b) < 0;
}

// Engagés : aucun des deux n’est en route libre derrière l’autre.
export function overlapped(a, b) {
  return !clearAstern(a, b) && !clearAstern(b, a);
}

// Projection sur l’axe du vent (vers l’endroit d’où il vient) : plus grand = plus au vent.
const upwind = (boat, windFrom) => dot({ x: boat.x, y: boat.y }, vec(windFrom));

// a est-il sur le côté bâbord (gauche) de b ?
const onPortSideOf = (a, b) => cross(vec(b.heading), sub(a, b)) > 0;

function verdict(keepClear, rule, reason) {
  return { keepClear, rule, reason };
}

export function rightOfWay(a, b, windFrom) {
  const na = nameOf(a, 'A');
  const nb = nameOf(b, 'B');
  const ta = isTacking(a, windFrom);
  const tb = isTacking(b, windFrom);

  // Règle 13 : le bateau qui vire s’écarte.
  if (ta && !tb) return verdict('a', '13', `${na} vire de bord : il s’écarte de ${nb}.`);
  if (tb && !ta) return verdict('b', '13', `${nb} vire de bord : il s’écarte de ${na}.`);
  if (ta && tb) {
    if (onPortSideOf(a, b)) return verdict('a', '13', `Les deux virent : ${na}, à bâbord de ${nb}, s’écarte.`);
    if (onPortSideOf(b, a)) return verdict('b', '13', `Les deux virent : ${nb}, à bâbord de ${na}, s’écarte.`);
    return verdict(null, '13', 'Les deux virent de bord : situation indéterminée.');
  }

  const tackA = tackOf(a.heading, windFrom);
  const tackB = tackOf(b.heading, windFrom);

  // Règle 10 : amures opposées.
  if (tackA !== tackB) {
    const port = tackA === 'babord' ? 'a' : 'b';
    const [p, s] = port === 'a' ? [na, nb] : [nb, na];
    return verdict(port, '10', `${p} (bâbord amure) s’écarte de ${s} (tribord amure).`);
  }

  const amure = TACK_LABEL[tackA];

  // Règle 11 : même amure, engagés.
  if (overlapped(a, b)) {
    const ua = upwind(a, windFrom);
    const ub = upwind(b, windFrom);
    if (ua === ub) return verdict(null, '11', `Engagés, ${amure}, exactement à la même hauteur : indéterminé.`);
    const ww = ua > ub ? 'a' : 'b';
    const [w, l] = ww === 'a' ? [na, nb] : [nb, na];
    return verdict(ww, '11', `Engagés ${amure} : ${w}, au vent, s’écarte de ${l}, sous le vent.`);
  }

  // Règle 12 : même amure, non engagés. Si les deux sont « derrière » l’un de l’autre
  // (caps très différents), celui qui est le plus en arrière s’écarte.
  const ca = clearAstern(a, b);
  const cb = clearAstern(b, a);
  let astern;
  if (ca && !cb) astern = 'a';
  else if (cb && !ca) astern = 'b';
  else astern = aheadOfAbeam(a, b) <= aheadOfAbeam(b, a) ? 'a' : 'b';
  const [r, f] = astern === 'a' ? [na, nb] : [nb, na];
  return verdict(astern, '12', `${amure} : ${r}, en route libre derrière, s’écarte de ${f}.`);
}

// Rapprochement maximal en trajectoire rectiligne à vitesse constante (speed en m/s).
export function conflict(a, b, windFrom, { horizon = 8, minDist } = {}) {
  const va = mul(vec(a.heading), a.speed ?? 0);
  const vb = mul(vec(b.heading), b.speed ?? 0);
  const p = sub(b, a);
  const v = sub(vb, va);
  const vv = dot(v, v);
  let t = vv > 1e-12 ? -dot(p, v) / vv : 0;
  t = Math.min(Math.max(t, 0), horizon);
  const d = Math.hypot(p.x + v.x * t, p.y + v.y * t);
  const limit = minDist ?? Math.max(a.length ?? 0, b.length ?? 0) * 1.5;
  return { t, d, risk: d < limit };
}

// Nouveau cap pour le bateau non prioritaire : on vise un point situé derrière l’arrière
// du prioritaire, puis on balaie les caps de 5° en 5° (sens préféré d’abord) en restant
// hors de la zone vent debout. On garde le premier cap sans risque, sinon celui qui
// maximise la distance de rapprochement. Déterministe.
export function avoidHeading(giveWay, standOn, windFrom, { horizon = 8, minDist } = {}) {
  const gw = { ...giveWay, speed: giveWay.speed ?? 1 };
  const margin = Math.max(gw.length ?? 0, standOn.length ?? 0) * 1.5;
  const opts = { horizon, minDist: minDist ?? margin };
  const aim = sub(hullPoints(standOn).stern, mul(vec(standOn.heading), margin));
  const turn = norm180(bearing(gw, aim) - gw.heading);
  const pref = turn >= 0 ? 1 : -1;
  const allowed = (h) => Math.abs(twa(h, windFrom)) >= NO_GO;

  let best = null;
  for (let off = 0; off <= 180; off += 5) {
    for (const sign of off === 0 ? [1] : [pref, -pref]) {
      const h = norm360(gw.heading + sign * off);
      if (!allowed(h)) continue;
      const c = conflict({ ...gw, heading: h }, standOn, windFrom, opts);
      if (!c.risk) return h;
      if (!best || c.d > best.d) best = { h, d: c.d };
    }
  }
  return best ? best.h : norm360(gw.heading);
}

// Règle 18 (simplifiée) : place à la marque. Elle s'applique quand les deux bateaux vont contourner
// la même marque, que l'un d'eux est dans la zone (3 longueurs de coque autour de la marque)
// et qu'ils sont engagés : le bateau à l'extérieur laisse la place à celui de l'intérieur
// (le plus proche de la marque), même s'il est prioritaire selon les règles 10 à 12.
// Elle ne s'applique pas entre deux bateaux d'amures opposées qui remontent au vent (18.1a)
// ni à un bateau qui vire de bord (règle 13).
export const ZONE_LENGTHS = 3;

export function markRoom(a, b, windFrom, mark) {
  if (!mark) return null;
  const zone = ZONE_LENGTHS * Math.max(a.length ?? 0, b.length ?? 0);
  const da = dist(a, mark);
  const db = dist(b, mark);
  if (Math.min(da, db) > zone) return null;
  if (isTacking(a, windFrom) || isTacking(b, windFrom)) return null;
  const beating = (h) => Math.abs(twa(h, windFrom)) < 90;
  if (tackOf(a.heading, windFrom) !== tackOf(b.heading, windFrom) && beating(a.heading) && beating(b.heading)) return null;
  if (!overlapped(a, b) || da === db) return null;
  const outside = da > db ? 'a' : 'b';
  const [o, i] = outside === 'a' ? [nameOf(a, 'A'), nameOf(b, 'B')] : [nameOf(b, 'B'), nameOf(a, 'A')];
  return verdict(outside, '18', `${o}, à l’extérieur dans la zone, laisse à ${i} la place de contourner la marque.`);
}

// Arbitrage complet : la règle 18 prime près d'une marque commune, sinon règles 10 à 13.
export function judge(a, b, windFrom, mark = null) {
  return markRoom(a, b, windFrom, mark) || rightOfWay(a, b, windFrom);
}
