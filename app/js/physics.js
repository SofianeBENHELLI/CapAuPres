import { angleFactor, windFactor, optimalSheet } from './boats.js';
import { groundingAt } from './geo.js';

export const KN = 0.514444; // m/s par nœud
export const D2R = Math.PI / 180;

export const wrap180 = (a) => ((((a + 180) % 360) + 360) % 360) - 180;
export const wrap360 = (a) => ((a % 360) + 360) % 360;
export const bearing = (a, b) => wrap360(Math.atan2(b.x - a.x, b.y - a.y) / D2R);

// TWA signé : > 0 vent venant de tribord (tribord amure), < 0 bâbord amure.
export const twaOf = (heading, twd) => wrap180(twd - heading);

export function allureName(twaAbs, boat) {
  const t = Math.abs(twaAbs);
  if (t < (boat ? boat.noGo : 42)) return 'Vent debout';
  if (t < 60) return 'Près';
  if (t < 80) return 'Bon plein';
  if (t < 105) return 'Travers';
  if (t < 150) return 'Largue';
  if (t < 168) return 'Grand largue';
  return 'Vent arrière';
}

export function createBoatState(boat, at, heading = 180) {
  return {
    boat, x: at.x, y: at.y, heading, speed: 0, heel: 0, sheet: 0.6,
    hike: false, board: true, spi: false,
    capsized: 0, overpower: 0, grounded: null, distance: 0, t: 0,
    trim: 1, trimHint: 'ok', twa: 0, tws: 0, twd: 0, vmg: 0, power: 0, inBand: false,
  };
}

// Un pas de simulation. `wind(x, y, t)` renvoie { twd, tws }. `sea` = { waveH } en mètres.
// Renvoie la liste des événements survenus pendant le pas.
export function step(s, controls, wind, sea, dt) {
  const b = s.boat;
  const ev = [];
  s.t += dt;
  const w = wind(s.x, s.y, s.t);
  s.twd = w.twd; s.tws = w.tws;
  s.hike = !!controls.hike; s.spi = !!(controls.spi && b.hasSpi);
  s.board = b.hasBoard ? controls.board !== false : true;

  if (s.capsized > 0) {
    s.capsized -= dt;
    s.speed *= Math.exp(-dt / 1.2);
    s.heel = 90;
    if (s.capsized <= 0) { s.capsized = 0; s.heel = 20; s.sheet = Math.min(s.sheet, 0.3); ev.push({ type: 'righted' }); }
    advance(s, w, dt, ev);
    return ev;
  }

  // Barre : efficacité réduite à faible vitesse.
  const steer = Math.max(0.3, Math.min(1, s.speed / 1.8));
  s.heading = wrap360(s.heading + (controls.rudder || 0) * b.turnRate * steer * dt);
  if (typeof controls.sheet === 'number') s.sheet = Math.max(0, Math.min(1, controls.sheet));

  const twa = twaOf(s.heading, w.twd);
  const ta = Math.abs(twa);
  s.twa = twa;

  // Réglage de voile : écart à l'optimum.
  const opt = optimalSheet(b, ta);
  const d = s.sheet - opt;
  let trim;
  if (ta < b.noGo) { trim = 0.2; s.trimHint = 'irons'; }
  else if (d < -0.1) { trim = Math.max(0.05, 1 - 3.2 * d * d - 0.25 * (-d - 0.1)); s.trimHint = 'border'; }
  else if (d > 0.1) { trim = Math.max(0.35, 1 - 2.2 * d * d); s.trimHint = 'choquer'; }
  else { trim = 1 - 0.6 * d * d; s.trimHint = 'ok'; }
  s.trim = trim;

  // Puissance et gîte : trop de vent sans choquer ni faire le rappel.
  const load = Math.sin(Math.min(ta, 100) * D2R) * (0.4 + 0.6 * Math.min(1, s.sheet / Math.max(opt, 0.05)));
  const pw = b.powerWind * (s.hike ? 1.3 : 1);
  s.power = (w.tws / pw) ** 2 * load * (ta < b.noGo ? 0.3 : 1);
  s.heel = Math.min(85, s.power * 32);

  let factor = angleFactor(b, ta) * trim;
  if (s.power > 1) factor *= Math.max(0.55, 1 - 0.45 * (s.power - 1)); // bateau trop gîté
  if (s.spi && ta > 110) factor *= 1 + b.spiBonus;
  else if (s.spi && ta < 95) factor *= 0.6; // spi envoyé au près : ça n'avance pas
  if (b.hasBoard && !s.board) factor *= ta < 100 ? 0.55 : 1.06;
  // Houle : freine au près, aide au portant.
  const h = sea?.waveH || 0;
  factor *= ta < 90 ? 1 - 0.1 * h * Math.cos(ta * D2R) : 1 + 0.04 * h * (ta / 180);

  const target = Math.min(windFactor(b, w.tws) * factor, b.vmax * 1.2);
  const tau = target < s.speed ? b.inertia * (ta < b.noGo ? 1.6 : 1.2) : b.inertia;
  s.speed += (target - s.speed) * (1 - Math.exp(-dt / tau));

  // Chavirage (dériveurs, catamaran) ou départ au lof (quillard).
  if (s.power > 1.35) s.overpower += dt; else s.overpower = Math.max(0, s.overpower - dt * 2);
  if (s.overpower > 1.6) {
    s.overpower = 0;
    if (b.capsizes) { s.capsized = 9; ev.push({ type: 'capsize' }); }
    else { s.heading = wrap360(s.heading + (twa > 0 ? 35 : -35)); s.speed *= 0.5; ev.push({ type: 'broach' }); }
  }

  s.vmg = s.speed * Math.cos(ta * D2R);
  advance(s, w, dt, ev);
  return ev;
}

function advance(s, w, dt, ev) {
  const b = s.boat;
  const ta = Math.abs(s.twa);
  const v = s.speed * KN;
  // Dérive sous le vent, forte si dérive relevée au près.
  const leeway = (b.hasBoard && !s.board ? 0.25 : 0.05) * Math.sin(Math.min(ta, 90) * D2R) * v + (ta < b.noGo || s.capsized ? 0.12 : 0);
  const dwn = (w.twd + 180) * D2R;
  const nx = s.x + Math.sin(s.heading * D2R) * v * dt + Math.sin(dwn) * leeway * dt;
  const ny = s.y + Math.cos(s.heading * D2R) * v * dt + Math.cos(dwn) * leeway * dt;
  const g = groundingAt({ x: nx, y: ny });
  if (g) {
    if (!s.grounded) ev.push({ type: 'ground', where: g.name });
    s.grounded = g;
    s.speed = 0;
    return;
  }
  s.grounded = null;
  s.distance += Math.hypot(nx - s.x, ny - s.y);
  s.x = nx; s.y = ny;
}
