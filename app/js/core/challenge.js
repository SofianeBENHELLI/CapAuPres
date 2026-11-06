// Défis aléatoires garantis jouables : on vérifie que le solveur trouve une route valide.
import { randomLevel } from './levels.js';
import { solve } from './solver.js';

export function playableRandomLevel(seed, difficulty, opts = {}) {
  for (let k = 0; k < 30; k++) {
    const level = randomLevel(seed + k * 7919, difficulty, opts);
    if (level.valid === false) continue;
    const sol = solve(level);
    if (sol && sol.sim.ok && sol.sim.penalties === 0) return { level, sol };
  }
  return null;
}
