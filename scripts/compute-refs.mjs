// Calcule les temps de référence (pilote auto) pour chaque mission et chaque bateau.
import { writeFileSync } from 'node:fs';
import { MISSIONS } from '../app/js/missions.js';
import { BOAT_LIST } from '../app/js/boats.js';
import { simulateAuto } from '../app/js/race.js';

const out = {};
const write = process.argv.includes('--write');
for (const m of MISSIONS) {
  out[m.id] = {};
  for (const b of BOAT_LIST) {
    const t0 = Date.now();
    const r = await simulateAuto(m, b.id);
    out[m.id][b.id] = Math.round(r.time);
    console.log(m.id.padEnd(14), b.id.padEnd(9), r.done ? 'OK ' : 'KO ', `${(r.time / 60).toFixed(1)} min`, `gr=${r.groundings} cap=${r.capsizes}`, `${Date.now() - t0}ms`);
  }
}
if (write) writeFileSync(new URL('../app/js/refs.js', import.meta.url), `// Généré par scripts/compute-refs.mjs : temps de référence du pilote automatique (secondes).\nexport const REFS = ${JSON.stringify(out, null, 2)};\n`);
