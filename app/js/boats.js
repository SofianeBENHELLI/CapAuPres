// Les quatre bateaux de l'école. Vitesses en nœuds, angles en degrés.

export const BOATS = {
  optimist: {
    id: 'optimist', name: 'Optimist', crew: 'Solitaire, 7 à 12 ans', length: 2.31,
    noGo: 45, peak: 100, closeFactor: 0.72, runFactor: 0.84,
    a: 0.62, p: 0.75, vmax: 5.2, inertia: 2.5, turnRate: 55,
    powerWind: 11, capsizes: true, hasBoard: true, hasSpi: false, hike: 'rappel',
    colors: { hull: '#ffffff', deck: '#f4f4f4', sail: '#fdfdfd', trim: '#e5484d' },
    pitch: 'La boîte à savon qui forme tous les champions : lent, stable, parfait pour apprendre les bases.',
  },
  '420': {
    id: '420', name: '420', crew: 'Double, barreur et équipier', length: 4.2,
    noGo: 40, peak: 100, closeFactor: 0.74, runFactor: 0.8,
    a: 0.95, p: 0.72, vmax: 11, inertia: 3.5, turnRate: 48,
    powerWind: 13, capsizes: true, hasBoard: true, hasSpi: true, spiBonus: 0.18, hike: 'trapèze',
    colors: { hull: '#ffffff', deck: '#dfe8f0', sail: '#ffffff', trim: '#243150', spi: '#64C5F1' },
    pitch: 'Le dériveur école-régate : spi, trapèze, il récompense les bons réglages.',
  },
  hobie16: {
    id: 'hobie16', name: 'Hobie Cat 16', crew: 'Double, catamaran de sport', length: 5.04,
    noGo: 46, peak: 115, closeFactor: 0.66, runFactor: 0.55,
    a: 1.55, p: 0.7, vmax: 18, inertia: 4.5, turnRate: 36,
    powerWind: 14, capsizes: true, hasBoard: false, hasSpi: false, hike: 'trapèze',
    colors: { hull: '#f2f2f2', deck: '#64C5F1', sail: '#ffd23f', trim: '#e5484d' },
    pitch: 'Le catamaran qui vole sur une coque : très rapide au travers, il faut empanner au portant.',
  },
  j80: {
    id: 'j80', name: 'J/80', crew: 'Quillard de sport, 3 à 5 équipiers', length: 8,
    noGo: 38, peak: 105, closeFactor: 0.76, runFactor: 0.78,
    a: 0.98, p: 0.68, vmax: 11, inertia: 7, turnRate: 28,
    powerWind: 16, capsizes: false, hasBoard: false, hasSpi: true, spiBonus: 0.2, hike: 'rappel',
    colors: { hull: '#ffffff', deck: '#c9d3dc', sail: '#f7f7f7', trim: '#243150', spi: '#e5484d' },
    pitch: 'Le quillard qui ne chavire pas : spi asymétrique, équipage, sensations de régate.',
  },
};

export const BOAT_LIST = Object.values(BOATS);

const smooth = (t) => 0.5 - 0.5 * Math.cos(Math.PI * Math.max(0, Math.min(1, t)));

// Facteur d'allure (0..1) en fonction de l'angle au vent réel |TWA|.
export function angleFactor(boat, twaAbs) {
  const t = Math.abs(twaAbs);
  if (t < boat.noGo) return 0.18 * (t / boat.noGo) ** 3; // vent debout : le bateau s'arrête
  if (t <= boat.peak) return boat.closeFactor + (1 - boat.closeFactor) * smooth((t - boat.noGo) / (boat.peak - boat.noGo));
  return 1 + (boat.runFactor - 1) * smooth((t - boat.peak) / (180 - boat.peak));
}

export function windFactor(boat, tws) {
  if (tws <= 0) return 0;
  return Math.min(boat.vmax, boat.a * tws ** boat.p);
}

// Vitesse polaire (réglages parfaits, spi si dispo au portant).
export function polarSpeed(boat, twa, tws, { spi = true } = {}) {
  let v = windFactor(boat, tws) * angleFactor(boat, twa);
  if (spi && boat.hasSpi && Math.abs(twa) > 110) v *= 1 + boat.spiBonus;
  return Math.min(v, boat.vmax * 1.15);
}

// Meilleurs angles de VMG (près et portant) pour une force de vent donnée.
export function bestVmgAngles(boat, tws) {
  let up = { a: boat.noGo, vmg: 0 }, down = { a: 180, vmg: 0 };
  for (let a = boat.noGo; a <= 180; a += 1) {
    const v = polarSpeed(boat, a, tws);
    const vmg = v * Math.cos((a * Math.PI) / 180);
    if (vmg > up.vmg) up = { a, vmg };
    if (-vmg > down.vmg) down = { a, vmg: -vmg };
  }
  return { up: up.a, down: down.a, vmgUp: up.vmg, vmgDown: down.vmg };
}

export function optimalSheet(boat, twaAbs) {
  const t = Math.abs(twaAbs);
  if (t <= boat.noGo) return 1;
  return Math.max(0.05, Math.min(1, 1 - (t - boat.noGo) / (180 - boat.noGo)));
}
