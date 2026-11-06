// Équilibre d'un dériveur vu de l'arrière : la voile fait gîter, l'écoute et la barre redressent.
// L'équipage se place tout seul au rappel, du côté du vent (il change de bord à chaque virement).
// Modèle de jeu, volontairement simple : la gîte tend vers un équilibre
//   gîte visée = puissance de la voile − poids de l'équipage au rappel
// et on dessale si elle dépasse la limite.
// Conventions : heel > 0 = le bateau penche sous le vent, < 0 contre-gîte ; crew = position de
// l'équipage (1 = tout au rappel) ; sheet = 1 voile bordée, 0 choquée en grand ; side = +1 vent venant de la droite.

export const HEEL = {
  lee: 55, // au-delà : dessalage sous le vent
  flat: 12, // bateau à plat : jusqu'à 12° de gîte
  flapAt: 0.25, // écoute plus choquée : la voile faseye et ne porte plus
  ironsAfter: 2.5, // lofer plus longtemps : le bateau s'arrête face au vent
  baseWind: 0.75,
  crew: 0.7, // équipage au rappel, toujours côté vent
};

export const knotsOf = (w) => Math.round(w * 16);

export function createHeel(rnd = Math.random) {
  return {
    t: 0,
    wind: HEEL.baseWind,
    side: rnd() < 0.5 ? 1 : -1,
    sheet: 0.75,
    crew: HEEL.crew,
    heel: 8,
    luff: false,
    luffTime: 0,
    dist: 0,
    flatTime: 0,
    speed: 0,
    capsizes: 0,
    gusts: [],
    nextGust: 5,
    nextTack: 16,
    tackWarned: false,
  };
}

// Puissance de la voile (0..~2) : le vent au carré, réduite si on choque ou si on lofe.
export function sailPower(s) {
  if (s.sheet < HEEL.flapAt) return 0;
  return s.wind * s.wind * s.sheet * (s.luff ? 0.35 : 1);
}

export const targetHeel = (s) => 70 * sailPower(s) - 32 * s.crew;

// Vitesse (m/s) : il faut de la voile bordée, un bateau à plat, et ne pas rester face au vent.
export function boatSpeed(s) {
  if (s.sheet < HEEL.flapAt || s.luffTime > HEEL.ironsAfter) return 0;
  const drive = s.wind * s.sheet * (s.luff ? 0.3 : 1);
  const tilt = Math.abs(s.heel);
  const penalty = tilt <= HEEL.flat ? 1 : Math.max(0, 1 - (tilt - HEEL.flat) / 35);
  return 7 * drive * penalty;
}

const windAt = (s) => s.gusts.reduce((w, g) => {
  if (s.t < g.at || s.t > g.at + g.dur) return w;
  const k = Math.sin(((s.t - g.at) / g.dur) * Math.PI); // la risée monte puis retombe
  return w + g.amp * Math.min(1, k * 1.6);
}, HEEL.baseWind);

// Avance de dt secondes. Renvoie les événements : 'gust' (annonce), 'tackSoon', 'tack', 'capsize'.
export function stepHeel(s, dt, rnd = Math.random) {
  const events = [];
  s.t += dt;
  // risées (et molles) annoncées 2 s à l'avance : on les voit arriver sur l'eau
  if (s.t >= s.nextGust) {
    const lull = rnd() < 0.3;
    const g = { at: s.t + 2, dur: 2.5 + rnd() * 2.5, amp: lull ? -(0.3 + rnd() * 0.15) : 0.35 + rnd() * 0.25 + Math.min(0.15, s.t / 400) };
    s.gusts.push(g);
    s.nextGust = g.at + g.dur + 0.5 + rnd() * 2.5;
    events.push({ type: 'gust', gust: g });
  }
  s.gusts = s.gusts.filter((g) => s.t <= g.at + g.dur);
  if (!s.tackWarned && s.t >= s.nextTack - 2) {
    s.tackWarned = true;
    events.push({ type: 'tackSoon' });
  }
  if (s.t >= s.nextTack) {
    // virement : le vent passe de l'autre côté, la voile et l'équipage aussi
    s.side = -s.side;
    s.heel = -s.heel * 0.3;
    s.nextTack = s.t + 14 + rnd() * 6;
    s.tackWarned = false;
    events.push({ type: 'tack' });
  }
  s.wind = windAt(s);
  s.luffTime = s.luff ? s.luffTime + dt : 0;
  s.heel += (targetHeel(s) - s.heel) * Math.min(1, dt * 1.6);
  s.speed = boatSpeed(s);
  s.dist += s.speed * dt;
  if (Math.abs(s.heel) <= HEEL.flat && s.speed > 0) s.flatTime += dt;
  if (s.heel > HEEL.lee) {
    s.capsizes++;
    events.push({ type: 'capsize' });
  }
  return events;
}

// Après un dessalage : on redresse le bateau, voile choquée.
export function rightBoat(s) {
  s.heel = 0;
  s.sheet = 0.5;
  s.luff = false;
  s.luffTime = 0;
}

// Conseil du moment, pour aider les plus jeunes.
export function heelHint(s) {
  if (s.sheet < HEEL.flapAt) return 'La voile faseye : borde l’écoute pour avancer.';
  if (s.luffTime > HEEL.ironsAfter) return 'Face au vent, tu n’avances plus : arrête de lofer, relâche la barre.';
  if (s.heel > 30) return 'Ça gîte fort ! Choque l’écoute ou lofe (pousse la barre), vite !';
  if (s.heel > HEEL.flat) return 'Ça gîte : choque un peu l’écoute, ou lofe (pousse la barre).';
  if (s.heel < -12) return 'Contre-gîte : le vent a molli, borde l’écoute.';
  if (s.sheet < 0.6 && s.wind < 0.9) return 'Le vent est calme : borde pour aller plus vite.';
  return 'Bateau à plat, voile bordée : parfait !';
}
