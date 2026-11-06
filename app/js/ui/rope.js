// Dessin animé d'un nœud. La corde est une courbe lisse passant par knot.points (ordre de la corde,
// du dormant vers le courant). Les croisements sont trouvés dans le navigateur ; à chaque croisement,
// le brin listé dans knot.over (index du segment Pi→Pi+1) passe dessus, sinon le plus tardif.
// knot.front : plages [i, j] de points redessinées par-dessus le décor (ex. la corde sur le taquet).

const fx = (n) => Math.round(n * 10) / 10;

// Catmull-Rom → Bézier cubiques
export function smoothPath(pts) {
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${fx(c1[0])},${fx(c1[1])} ${fx(c2[0])},${fx(c2[1])} ${p2[0]},${p2[1]}`;
  }
  return d;
}

const ropeStrokes = (d, extra = '') =>
  `<path d="${d}" class="rope-out" ${extra}/><path d="${d}" class="rope-in" ${extra}/><path d="${d}" class="rope-twist" ${extra}/>`;

// Monte le nœud dans el ; renvoie { show(step) }.
export function mountKnot(el, knot) {
  const d = smoothPath(knot.points);
  el.innerHTML = `<svg class="knot-svg" viewBox="${knot.viewBox}" role="img" aria-label="${knot.name}, étape par étape">
    <g class="rope-base">${ropeStrokes(d)}</g>
    <g class="rope-over rope-over-back"></g>
    <g class="knot-decor">${knot.decor || ''}</g>
    <g class="rope-front"></g>
    <g class="rope-over rope-over-top"></g>
    <circle class="rope-tip" r="7"/>
  </svg>`;
  const svg = el.querySelector('svg');
  const probe = svg.querySelector('.rope-base path');
  const L = probe.getTotalLength();
  const STEP = 2;
  const S = [];
  for (let s = 0; s <= L; s += STEP) {
    const p = probe.getPointAtLength(s);
    S.push({ x: p.x, y: p.y, s });
  }
  // abscisse curviligne des points de passage. La courbe passe exactement par chaque point, dans
  // l'ordre : on cherche donc vers l'avant (deux points proches, aller et retour sous une même
  // corne, ne doivent pas être confondus)
  let from = 0;
  const sOf = knot.points.map(([x, y]) => {
    let best = from;
    for (let i = from; i < S.length; i++) {
      const d = Math.hypot(S[i].x - x, S[i].y - y);
      if (d < Math.hypot(S[best].x - x, S[best].y - y)) best = i;
      if (d < STEP) break; // premier passage sur ce point
    }
    from = best;
    return S[best].s;
  });
  const segOf = (s) => {
    let i = 0;
    while (i < sOf.length - 2 && s > sOf[i + 1]) i++;
    return i;
  };
  // croisements : segments d'échantillonnage non voisins qui se coupent
  const inter = (a, b, c, e) => {
    const den = (b.x - a.x) * (e.y - c.y) - (b.y - a.y) * (e.x - c.x);
    if (Math.abs(den) < 1e-9) return false;
    const t = ((c.x - a.x) * (e.y - c.y) - (c.y - a.y) * (e.x - c.x)) / den;
    const u = ((c.x - a.x) * (b.y - a.y) - (c.y - a.y) * (b.x - a.x)) / den;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
  };
  const crossings = [];
  for (let i = 0; i < S.length - 1; i++) {
    for (let j = i + 12; j < S.length - 1; j++) {
      if (!inter(S[i], S[i + 1], S[j], S[j + 1])) continue;
      if (crossings.some((c) => Math.abs(c.s1 - S[i].s) < 12 && Math.abs(c.s2 - S[j].s) < 12)) continue;
      crossings.push({ s1: S[i].s, s2: S[j].s });
    }
  }
  const overSet = new Set(knot.over || []);
  crossings.forEach((c) => {
    const o1 = overSet.has(segOf(c.s1));
    const o2 = overSet.has(segOf(c.s2));
    c.over = o1 && !o2 ? c.s1 : c.s2; // par défaut, le brin le plus tardif passe dessus
    c.under = c.over === c.s1 ? c.s2 : c.s1;
  });
  const dash = (a, b) => `stroke-dasharray="0 ${fx(Math.max(0, a))} ${fx(b - a)} ${fx(L + 10)}"`;
  const fronts = (knot.front || []).map(([i, j]) => [sOf[i], sOf[j]]);
  const base = svg.querySelectorAll('.rope-base path');
  const tip = svg.querySelector('.rope-tip');
  const show = (step) => {
    const upto = step >= knot.steps.length - 1 ? L : sOf[knot.steps[step].upto];
    base.forEach((p) => p.setAttribute('stroke-dasharray', `${fx(upto)} ${fx(L + 10)}`));
    svg.querySelector('.rope-front').innerHTML = fronts
      .filter(([a]) => a < upto)
      .map(([a, b]) => ropeStrokes(d, dash(a, Math.min(b, upto))))
      .join('');
    // un croisement dont le brin du dessus est devant le décor (corde sur le taquet) est
    // redessiné au-dessus du décor ; les autres (sous une corne) restent dessous
    const inFront = (x) => !fronts.length || fronts.some(([a, b]) => x >= a && x <= b);
    const snip = (list) => list.map((c) => ropeStrokes(d, dash(c.over - 9, Math.min(c.over + 9, upto)))).join('');
    const shown = crossings.filter((c) => Math.max(c.s1, c.s2) <= upto);
    svg.querySelector('.rope-over-back').innerHTML = snip(shown.filter((c) => !inFront(c.over)));
    svg.querySelector('.rope-over-top').innerHTML = snip(shown.filter((c) => inFront(c.over)));
    const p = probe.getPointAtLength(Math.max(0, upto - 0.5));
    tip.setAttribute('cx', fx(p.x));
    tip.setAttribute('cy', fx(p.y));
    tip.style.display = step >= knot.steps.length - 1 ? 'none' : '';
  };
  return { show, crossings: crossings.length };
}
