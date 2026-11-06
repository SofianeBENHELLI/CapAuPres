// Petits schémas SVG pour les leçons et les quiz.
const D2R = Math.PI / 180;

export function boatPath(scale = 1) {
  const s = scale;
  return `M0 ${-22 * s} C ${9 * s} ${-12 * s} ${10 * s} ${8 * s} ${7 * s} ${20 * s} L ${-7 * s} ${20 * s} C ${-10 * s} ${8 * s} ${-9 * s} ${-12 * s} 0 ${-22 * s} Z`;
}

// Bateau vu de dessus, cap `hdg`, vent venant de `twd`, avec voile bordée selon l'allure.
export function boatSvg(hdg, twd, { color = '#243150', sail = true, label = '', sheet = null, x = 0, y = 0, scale = 1 } = {}) {
  const twa = ((((twd - hdg) + 180) % 360) + 360) % 360 - 180;
  const ta = Math.abs(twa);
  const sh = sheet ?? Math.max(0.05, Math.min(1, 1 - (ta - 42) / 138));
  const boom = ta < 40 ? 0 : (1 - sh) * 85 + 5;
  const side = twa > 0 ? -1 : 1; // la bôme part sous le vent
  const sailEl = sail ? `<path d="M0 ${-8 * scale} Q ${side * 6 * scale} ${4 * scale} 0 ${18 * scale}" transform="rotate(${side * boom} 0 ${-8 * scale})" stroke="#64C5F1" stroke-width="${3 * scale}" fill="none" stroke-linecap="round"/>` : '';
  return `<g transform="translate(${x} ${y}) rotate(${hdg})"><path d="${boatPath(scale)}" fill="#fff" stroke="${color}" stroke-width="2"/>${sailEl}</g>${label ? `<text x="${x}" y="${y + 38 * scale}" text-anchor="middle" font-size="12" fill="currentColor">${label}</text>` : ''}`;
}

export function windArrow(twd, cx, cy, len = 46) {
  const r = (twd + 180) * D2R; // le vent souffle vers twd+180
  const x1 = cx - Math.sin(r) * len / 2, y1 = cy + Math.cos(r) * len / 2;
  const x2 = cx + Math.sin(r) * len / 2, y2 = cy - Math.cos(r) * len / 2;
  return `<g class="wind"><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#e5484d" stroke-width="3"/><circle cx="${x2}" cy="${y2}" r="0"/><path d="M ${x2} ${y2} l ${-Math.sin(r - 0.45) * 12} ${Math.cos(r - 0.45) * 12} M ${x2} ${y2} l ${-Math.sin(r + 0.45) * 12} ${Math.cos(r + 0.45) * 12}" stroke="#e5484d" stroke-width="3" fill="none"/><text x="${x1}" y="${y1 - 6}" text-anchor="middle" font-size="11" fill="#e5484d">vent</text></g>`;
}

export function scene(inner, w = 220, h = 180) {
  return `<svg viewBox="0 0 ${w} ${h}" class="diagram" role="img" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
}

// Rose des allures autour d'un vent du nord.
export function allureRose() {
  const items = [[0, 'Vent debout'], [45, 'Près'], [70, 'Bon plein'], [95, 'Travers'], [130, 'Largue'], [155, 'Grand largue'], [180, 'Vent arrière']];
  let g = '';
  for (const side of [1, -1]) for (const [a, name] of items) {
    if (side < 0 && (a === 0 || a === 180)) continue;
    const ang = a * side;
    const x = 160 + Math.sin(ang * D2R) * 95, y = 150 - Math.cos(ang * D2R) * 95;
    g += boatSvg(ang, 0, { x, y, scale: 0.7 });
    if (side > 0) g += `<text x="${160 + Math.sin(ang * D2R) * 130}" y="${150 - Math.cos(ang * D2R) * 122 + 4}" text-anchor="middle" font-size="11" fill="currentColor">${name}</text>`;
  }
  g += `<path d="M160 150 L ${160 - Math.sin(42 * D2R) * 80} ${150 - Math.cos(42 * D2R) * 80} A 80 80 0 0 1 ${160 + Math.sin(42 * D2R) * 80} ${150 - Math.cos(42 * D2R) * 80} Z" fill="#e5484d" opacity=".12"/>`;
  return scene(windArrow(0, 160, 18, 30) + g, 320, 300);
}

// Penons : trois états de réglage.
export function telltales(state) {
  const wave = (y, flutter) => flutter
    ? `<path d="M120 ${y} q 8 -6 16 0 q 8 6 16 -4" stroke="#e5484d" stroke-width="3" fill="none"/>`
    : `<line x1="120" y1="${y}" x2="152" y2="${y}" stroke="#e5484d" stroke-width="3"/>`;
  const wl = state === 'border' ? wave(60, true) + wave(90, false) : state === 'choquer' ? wave(60, false) + wave(90, true) : wave(60, false) + wave(90, false);
  return scene(`<path d="M40 20 Q 150 70 40 160" fill="#f4f8fb" stroke="#243150" stroke-width="2"/>${wl}<text x="160" y="64" font-size="11" fill="currentColor">au vent</text><text x="160" y="94" font-size="11" fill="currentColor">sous le vent</text>`, 230, 180);
}
