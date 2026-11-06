// Déroulé d'une mission : bateau, vent, bouées, chrono, pénalités. Partagé par le jeu et les tests.
import { BOATS } from './boats.js';
import { createWindField, swellAt } from './wind.js';
import { createBoatState, step } from './physics.js';
import { inBand300, shoalWarning, buildGrid, findRoute } from './geo.js';

let gridCache = null;
export function navGrid() {
  return gridCache || (gridCache = buildGrid(80, 70));
}

export function createRace(mission, boatId, opts = {}) {
  const boat = BOATS[boatId];
  const windCfg = { seed: 7, ...mission.wind, ...(opts.wind || {}) };
  const field = createWindField(windCfg);
  const sea = { swellH: 0, swellDir: 250, ...mission.sea, ...(opts.sea || {}) };
  const st = mission.start;
  const s = createBoatState(boat, st, st.heading);
  s.sheet = 0.5;
  const race = {
    mission, boat, field, sea, s, markIdx: 0, time: 0, done: false,
    groundings: 0, capsizes: 0, bandSpeeding: 0, track: [], log: [], warnShoal: null,
  };
  const windAt = (x, y, t) => field.at(x, y, t);
  race.wind = windAt;
  race.target = () => mission.marks[race.markIdx];

  race.step = (dt, controls) => {
    if (race.done) return [];
    const waveH = swellAt(s.x, s.y, sea.swellH, sea.swellDir);
    const ev = step(s, controls, windAt, { waveH }, dt);
    race.time += dt;
    for (const e of ev) {
      if (e.type === 'ground') race.groundings++;
      if (e.type === 'capsize') race.capsizes++;
    }
    s.inBand = inBand300(s);
    if (s.inBand && s.speed > 5.2) race.bandSpeeding += dt;
    race.warnShoal = shoalWarning(s);
    const m = race.target();
    if (m && Math.hypot(s.x - m.x, s.y - m.y) < m.r) {
      ev.push({ type: 'mark', idx: race.markIdx, label: m.label });
      race.markIdx++;
      if (race.markIdx >= mission.marks.length) { race.done = true; ev.push({ type: 'finish', time: race.time }); }
    }
    if (race.track.length === 0 || race.time - race.track[race.track.length - 1].t > 2) race.track.push({ t: race.time, x: s.x, y: s.y });
    return ev;
  };
  return race;
}

// Itinéraire évitant la terre entre la position courante et la prochaine bouée.
export function routeTo(from, to) {
  return findRoute(navGrid(), from, to) || [from, to];
}

// Simule une mission au pilote automatique. Renvoie { done, time, groundings, capsizes, track }.
export async function simulateAuto(mission, boatId, { dt = 0.5, maxTime = 6 * 3600, wind, sea } = {}) {
  const { createAutopilot } = await import('./autopilot.js');
  const race = createRace(mission, boatId, { wind, sea });
  const ap = createAutopilot();
  let route = null, routeFor = -1, wp = 1, replan = 0;
  while (!race.done && race.time < maxTime) {
    const target = race.target();
    if (routeFor !== race.markIdx || race.time > replan) {
      route = routeTo({ x: race.s.x, y: race.s.y }, target); routeFor = race.markIdx; wp = 1; replan = race.time + 120;
    }
    let sub = route[Math.min(wp, route.length - 1)];
    while (wp < route.length - 1 && Math.hypot(race.s.x - sub.x, race.s.y - sub.y) < 120) sub = route[++wp];
    const c = ap(race.s, sub);
    const ev = race.step(dt, c);
    if (ev.some((e) => e.type === 'ground')) replan = 0;
    if (race.s.grounded) {
      // Dégagement : on se met face au large et on borde.
      race.s.heading = (race.s.heading + 25) % 360;
    }
  }
  return { done: race.done, time: race.time, groundings: race.groundings, capsizes: race.capsizes, track: race.track, race };
}
