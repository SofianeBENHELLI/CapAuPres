// Préparation du parcours et détection du passage des balises / portes.
import { sub, unit, cross, dot, lerp, add, mul, dist } from './angles.js';

export const MARK_RADIUS = 5; // m : toucher la bouée = pénalité
const RAY_LEN = 4000;

export const centerOf = (cp) => (cp.type === 'mark' ? { x: cp.x, y: cp.y } : lerp(cp.a, cp.b, 0.5));

// Ajoute à chaque point de passage sa géométrie de validation.
// - balise : une demi-droite partant de la bouée, vers l'extérieur du virage.
//   La franchir dans le bon sens = avoir contourné la bouée du bon côté.
// - porte / arrivée : le segment entre les deux bouées, franchi dans le sens du parcours.
export function prepareCourse(level) {
  const cps = level.course.map((c) => ({ ...c }));
  cps.forEach((cp, i) => {
    const prev = i === 0 ? level.start : centerOf(cps[i - 1]);
    const next = i < cps.length - 1 ? centerOf(cps[i + 1]) : null;
    cp.index = i;
    if (cp.type === 'mark') {
      const m = { x: cp.x, y: cp.y };
      const dIn = unit(sub(m, prev));
      const dOut = next ? unit(sub(next, m)) : dIn;
      let r = sub(dIn, dOut);
      if (Math.hypot(r.x, r.y) < 0.15) {
        r = cp.side === 'port' ? { x: dIn.y, y: -dIn.x } : { x: -dIn.y, y: dIn.x };
      }
      cp.ray = unit(r);
      cp.sense = cp.side === 'port' ? 1 : -1; // +1 : sens anti-horaire (bouée à bâbord)
    } else {
      const g = sub(cp.b, cp.a);
      let n = unit({ x: -g.y, y: g.x });
      if (dot(n, sub(prev, cp.a)) > 0) n = mul(n, -1);
      cp.normal = n;
    }
  });
  return cps;
}

// Côté d'un point par rapport à la géométrie (règle semi-ouverte : 0 compte comme positif).
function sideMark(cp, p) {
  return cross(cp.ray, sub(p, cp)) * cp.sense;
}
function sideGate(cp, p) {
  return dot(cp.normal, sub(p, cp.a));
}

// Paramètre t ∈ (tmin, 1] où le segment p→q franchit cp.
// wanted = +1 : franchissement dans le bon sens ; -1 : dans le mauvais sens.
export function crossingT(cp, p, q, wanted = 1, tmin = -1) {
  const sideFn = cp.type === 'mark' ? sideMark : sideGate;
  const sp = sideFn(cp, p);
  const sq = sideFn(cp, q);
  const pos = (s) => s >= -1e-9;
  // Bon sens : du côté négatif vers le côté positif (0 compte comme positif).
  const ok = wanted > 0 ? !pos(sp) && pos(sq) : pos(sp) && !pos(sq);
  if (!ok) return null;
  const t = sp / (sp - sq);
  if (!(t > tmin + 1e-9)) return null;
  const x = lerp(p, q, t);
  if (cp.type === 'mark') {
    const along = dot(sub(x, cp), cp.ray);
    if (along < -1e-6 || along > RAY_LEN) return null;
  } else {
    const g = sub(cp.b, cp.a);
    const u = dot(sub(x, cp.a), g) / dot(g, g);
    if (u < -1e-6 || u > 1 + 1e-6) return null;
  }
  return t;
}

// Le cap u (vecteur unitaire) arrive-t-il du bon côté du point de passage ?
export function approachOk(cp, u) {
  if (cp.type === 'mark') return cross(cp.ray, u) * cp.sense > 1e-6;
  return dot(cp.normal, u) > 1e-6;
}
// Le cap u repart-il du bon côté (balise réellement contournée) ?
export function departOk(cp, u) {
  if (cp.type === 'mark') return cross(cp.ray, u) * cp.sense > 1e-6;
  return true;
}

// Distance d'un segment à un point.
export function segPointDist(p, q, c) {
  const d = sub(q, p);
  const l2 = dot(d, d);
  const t = l2 ? Math.max(0, Math.min(1, dot(sub(c, p), d) / l2)) : 0;
  return dist(add(p, mul(d, t)), c);
}

// Toutes les bouées physiques du parcours (pour les collisions).
export function buoys(cps) {
  const out = [];
  cps.forEach((cp) => {
    if (cp.type === 'mark') {
      // un îlot (ex. Les Évens) est géré par la détection d'échouage, pas comme une bouée
      if (!cp.islet) out.push({ x: cp.x, y: cp.y, cp: cp.index, r: cp.r || MARK_RADIUS });
    } else {
      out.push({ ...cp.a, cp: cp.index, r: MARK_RADIUS });
      out.push({ ...cp.b, cp: cp.index, r: MARK_RADIUS });
    }
  });
  return out;
}
