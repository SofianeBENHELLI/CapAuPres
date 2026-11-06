// Polaire simplifiée du bateau choisi (voir boats.js), vitesses en nœuds.
import { NO_GO, PINCH } from './angles.js';

export { PINCH };
import { getBoat } from './boats.js';

export const KN = 0.514444; // m/s par nœud

const ANGLES = [40, 45, 50, 60, 75, 90, 105, 120, 135, 150, 165, 180];

// Forces de vent. Les performances (speeds, tack, gybe, hint) sont lues
// dans le profil du bateau sélectionné, pour que tout le moteur s'adapte au bateau.
function wind(id, label, kts, beaufort) {
  return {
    id, label, kts, beaufort,
    get speeds() { return getBoat().perf[id].speeds; },
    get tack() { return getBoat().perf[id].tack; },
    get gybe() { return getBoat().perf[id].gybe; },
    get hint() { return getBoat().perf[id].hint; },
  };
}

export const WINDS = {
  light: wind('light', 'Petit temps', 6, 2),
  medium: wind('medium', 'Vent moyen', 12, 4),
  strong: wind('strong', 'Vent fort', 20, 5),
};

// Coût (s) d'un simple changement de cap, par tranche de 90° (dépend du bateau).
export const turnCostPer90 = () => getBoat().turnPer90;

// Sous NO_GO (propre à chaque bateau), le bateau est « pincé » : il avance de moins en moins
// jusqu'à s'arrêter, voiles en drapeau, à PINCH (vent debout).
export function speedKn(twaDeg, windId = 'medium') {
  const a = Math.abs(twaDeg);
  if (a < PINCH) return 0;
  if (a < NO_GO) {
    const f = (a - PINCH) / (NO_GO - PINCH);
    return tableKn(NO_GO, windId) * f * f * 0.8;
  }
  return tableKn(a, windId);
}

// Lecture de la polaire (angles 40° à 180°). Un bateau qui remonte mieux que 40° (J80)
// garde presque sa vitesse de 40° jusqu'à sa limite NO_GO.
function tableKn(a, windId) {
  const s = WINDS[windId].speeds;
  if (a < ANGLES[0]) return s[0] * (0.88 + (0.12 * (a - NO_GO)) / (ANGLES[0] - NO_GO));
  if (a >= 180) return s[s.length - 1];
  for (let i = 0; i < ANGLES.length - 1; i++) {
    if (a <= ANGLES[i + 1]) {
      const t = (a - ANGLES[i]) / (ANGLES[i + 1] - ANGLES[i]);
      return s[i] + (s[i + 1] - s[i]) * t;
    }
  }
  return s[s.length - 1];
}

export const speedMs = (twaDeg, windId) => speedKn(twaDeg, windId) * KN;

// Meilleur angle de remontée / de descente (VMG), utile pour les conseils.
export function bestVmgAngles(windId = 'medium') {
  let up = { angle: 45, vmg: 0 };
  let down = { angle: 180, vmg: 0 };
  for (let a = NO_GO; a <= 180; a += 0.5) {
    const v = speedKn(a, windId);
    const vu = v * Math.cos((a * Math.PI) / 180);
    if (vu > up.vmg) up = { angle: a, vmg: vu };
    if (-vu > down.vmg) down = { angle: a, vmg: -vu };
  }
  return { up, down };
}

// Vitesse pour une force de vent quelconque (en nœuds), par interpolation entre les
// trois polaires du bateau (petit temps 6 nd, vent moyen 12 nd, vent fort 20 nd).
export function speedKnTws(twaDeg, kts) {
  const k = Math.max(0, kts);
  if (k <= WINDS.light.kts) return speedKn(twaDeg, 'light') * (k / WINDS.light.kts);
  if (k <= WINDS.medium.kts) {
    const f = (k - WINDS.light.kts) / (WINDS.medium.kts - WINDS.light.kts);
    return speedKn(twaDeg, 'light') * (1 - f) + speedKn(twaDeg, 'medium') * f;
  }
  if (k <= WINDS.strong.kts) {
    const f = (k - WINDS.medium.kts) / (WINDS.strong.kts - WINDS.medium.kts);
    return speedKn(twaDeg, 'medium') * (1 - f) + speedKn(twaDeg, 'strong') * f;
  }
  return speedKn(twaDeg, 'strong') * (1 + Math.min(0.15, (k - WINDS.strong.kts) * 0.01));
}
