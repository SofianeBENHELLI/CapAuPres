// Analyse d'un virage entre deux caps : virements, empannages, coût en temps.
import { norm360, norm180 } from './angles.js';
import { WINDS, turnCostPer90 } from './polar.js';

// Compte les entiers k tels que c = base + 360k soit dans l'intervalle (lo, hi) avec bornes choisies.
function countCrossings(base, lo, hi, inclLo, inclHi) {
  let n = 0;
  for (let k = -3; k <= 3; k++) {
    const c = base + 360 * k;
    const okLo = inclLo ? c >= lo - 1e-9 : c > lo + 1e-9;
    const okHi = inclHi ? c <= hi + 1e-9 : c < hi - 1e-9;
    if (okLo && okHi) n++;
  }
  return n;
}

// dir : 'L' (bâbord, le cap diminue) ou 'R' (tribord, le cap augmente).
export function turnInfo(h1, h2, windFrom, dir) {
  const deg = dir === 'L' ? norm360(h1 - h2) : norm360(h2 - h1);
  const a0 = norm180(windFrom - h1); // twa de départ dans (-180,180]
  let tacks;
  let gybes;
  if (dir === 'L') {
    // le twa augmente de deg
    tacks = countCrossings(0, a0, a0 + deg, false, true);
    gybes = countCrossings(180, a0, a0 + deg, true, false);
  } else {
    tacks = countCrossings(0, a0 - deg, a0, true, false);
    gybes = countCrossings(-180, a0 - deg, a0, true, false);
  }
  return { dir, deg, tacks, gybes };
}

export function turnCost(info, windId) {
  const w = WINDS[windId];
  return info.tacks * w.tack + info.gybes * w.gybe + (info.deg / 90) * turnCostPer90();
}

export const shortestDir = (h1, h2) => (norm360(h1 - h2) <= 180 ? 'L' : 'R');

// mode : 'auto' (sens le plus court) | 'alt' (l'autre sens) | 'best' (le moins coûteux)
export function resolveTurn(h1, h2, windFrom, windId, mode = 'auto') {
  const short = shortestDir(h1, h2);
  const other = short === 'L' ? 'R' : 'L';
  const a = turnInfo(h1, h2, windFrom, short);
  a.cost = turnCost(a, windId);
  if (mode === 'auto') return a;
  const b = turnInfo(h1, h2, windFrom, other);
  b.cost = turnCost(b, windId);
  if (mode === 'alt') return b;
  // à coût presque égal, on tourne naturellement par le plus court
  return b.cost < a.cost - 0.5 ? b : a;
}

export function turnLabel(info) {
  if (info.tacks && info.gybes) return 'Tour complet';
  if (info.tacks > 1 || info.gybes > 1) return 'Tour complet';
  if (info.tacks) return 'Virement';
  if (info.gybes) return 'Empannage';
  return null;
}
