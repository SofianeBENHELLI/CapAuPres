// Conventions (monde) : x vers l'Est, y vers le Nord (mètres).
// Cap en degrés : 0 = Nord, sens horaire. Vent : direction D'OÙ il vient.

export const DEG = Math.PI / 180;
// Limites au près du bateau choisi (voir boats.js, champ upwind), mises à jour par setBoat.
// Ce sont des liaisons vivantes : tous les modules qui importent NO_GO / PINCH voient la valeur du bateau.
export let NO_GO = 40; // en dessous, le bateau est « pincé » : il ralentit fortement
export let PINCH = 32; // en dessous, vent debout : voiles en drapeau, le bateau s'arrête
export function setUpwindLimits(noGo, pinch) {
  NO_GO = noGo;
  PINCH = pinch;
}

export const norm360 = (a) => ((a % 360) + 360) % 360;
export const norm180 = (a) => {
  const x = norm360(a);
  return x > 180 ? x - 360 : x;
};

export const vec = (h) => ({ x: Math.sin(h * DEG), y: Math.cos(h * DEG) });
export const bearing = (p, q) => norm360(Math.atan2(q.x - p.x, q.y - p.y) / DEG);
export const dist = (p, q) => Math.hypot(q.x - p.x, q.y - p.y);
export const cross = (a, b) => a.x * b.y - a.y * b.x;
export const dot = (a, b) => a.x * b.x + a.y * b.y;
export const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
export const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
export const mul = (a, k) => ({ x: a.x * k, y: a.y * k });
export const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
export const unit = (a) => {
  const l = Math.hypot(a.x, a.y) || 1;
  return { x: a.x / l, y: a.y / l };
};

// Angle du vent par rapport au bateau, dans (-180, 180].
// > 0 : vent reçu par tribord (droite) => tribord amure.
export const twa = (heading, windFrom) => norm180(windFrom - heading);

export const tackOf = (heading, windFrom) => (twa(heading, windFrom) > 0 ? 'tribord' : 'babord');

export const TACKS = {
  tribord: { id: 'tribord', label: 'Tribord amure', short: 'Tribord', color: 'var(--starboard)' },
  babord: { id: 'babord', label: 'Bâbord amure', short: 'Bâbord', color: 'var(--port)' },
};

export const ALLURES = [
  { id: 'debout', min: 0, get max() { return NO_GO; }, label: 'Vent debout', short: 'Interdit', color: '#e5484d' },
  { id: 'pres', get min() { return NO_GO; }, max: 55, label: 'Près serré', short: 'Près serré', color: '#8e4ec6' },
  { id: 'bonplein', min: 55, max: 75, label: 'Près (bon plein)', short: 'Près', color: '#3e63dd' },
  { id: 'travers', min: 75, max: 105, label: 'Vent de travers', short: 'Travers', color: '#0090ff' },
  { id: 'petitlargue', min: 105, max: 135, label: 'Largue', short: 'Largue', color: '#12a594' },
  { id: 'grandlargue', min: 135, max: 165, label: 'Grand largue', short: 'Gd largue', color: '#46a758' },
  { id: 'arriere', min: 165, max: 180.001, label: 'Vent arrière', short: 'V. arrière', color: '#f5a623' },
];

export const allureOf = (twaDeg) => {
  const a = Math.abs(twaDeg);
  return ALLURES.find((x) => a >= x.min && a < x.max) || ALLURES[ALLURES.length - 1];
};

export const allureById = (id) => ALLURES.find((a) => a.id === id);

const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'];
const COMPASS_LONG = {
  N: 'Nord', NNE: 'Nord-Nord-Est', NE: 'Nord-Est', ENE: 'Est-Nord-Est', E: 'Est', ESE: 'Est-Sud-Est',
  SE: 'Sud-Est', SSE: 'Sud-Sud-Est', S: 'Sud', SSO: 'Sud-Sud-Ouest', SO: 'Sud-Ouest', OSO: 'Ouest-Sud-Ouest',
  O: 'Ouest', ONO: 'Ouest-Nord-Ouest', NO: 'Nord-Ouest', NNO: 'Nord-Nord-Ouest',
};
export const compass = (deg) => COMPASS[Math.round(norm360(deg) / 22.5) % 16];
export const compassLong = (deg) => COMPASS_LONG[compass(deg)];

// Rotation horaire d'un point (repère y vers le haut) de `deg` degrés.
export const rotate = (p, deg) => {
  const c = Math.cos(deg * DEG);
  const s = Math.sin(deg * DEG);
  return { x: p.x * c + p.y * s, y: -p.x * s + p.y * c };
};
