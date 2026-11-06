// Pilote automatique : sert à la démo « Montre-moi » et aux tests de faisabilité des missions.
import { bestVmgAngles, optimalSheet } from './boats.js';
import { bearing, twaOf, wrap180, wrap360, D2R } from './physics.js';
import { groundingAt } from './geo.js';

function headingClear(s, hdg, dist = 140) {
  for (let d = 30; d <= dist; d += 30) {
    if (groundingAt({ x: s.x + Math.sin(hdg * D2R) * d, y: s.y + Math.cos(hdg * D2R) * d })) return false;
  }
  return true;
}

export function createAutopilot() {
  let tack = 0; // +1 tribord, -1 bâbord
  let lastSwitch = -99;
  return function control(s, target) {
    const b = s.boat;
    const twd = s.twd;
    const brg = bearing(s, target);
    const want = twaOf(brg, twd);
    const { up, down } = bestVmgAngles(b, s.tws || 10);
    let hdg = brg;
    const absW = Math.abs(want);
    const dist = Math.hypot(target.x - s.x, target.y - s.y);
    if (absW < up + 2 || absW > down - 2) {
      const beating = absW < up + 2;
      const ang = beating ? up + 2 : down - 2;
      if (!tack) tack = want >= 0 ? 1 : -1;
      // Changement de bord quand l'autre bord pointe mieux vers la cible, ou si la côte arrive.
      const hFor = (k) => wrap360(twd - k * ang);
      const gain = (k) => Math.cos(wrap180(hFor(k) - brg) * D2R);
      const hyst = dist > 600 ? 0.18 : 0.05;
      if (s.t - lastSwitch > 12 && gain(-tack) > gain(tack) + hyst) { tack = -tack; lastSwitch = s.t; }
      if (!headingClear(s, hFor(tack)) && headingClear(s, hFor(-tack)) && s.t - lastSwitch > 4) { tack = -tack; lastSwitch = s.t; }
      hdg = hFor(tack);
    } else {
      tack = want >= 0 ? 1 : -1;
    }
    const err = wrap180(hdg - s.heading);
    const rudder = Math.max(-1, Math.min(1, err / 25));
    const ta = Math.abs(twaOf(s.heading, twd));
    let sheet = optimalSheet(b, ta);
    if (s.power > 1.1) sheet = Math.max(0, sheet - 0.25 * (s.power - 1.1) - 0.1); // choquer dans la rafale
    return {
      rudder, sheet, hike: s.power > 0.7, board: true,
      spi: b.hasSpi && ta > 120, heading: hdg,
    };
  };
}
