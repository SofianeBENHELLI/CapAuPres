// Vent réaliste pour la baie : climatologie (ERA5 2014-2025) et prévision du jour (Open-Meteo).
import { CLIMATE } from '../data/climate.js';

const SECTOR = 22.5;
const CLASSES = ['light', 'medium', 'strong'];

// Classe de vent du jeu selon la force (nœuds).
export const levelOfKn = (kn) => (kn < 8 ? 'light' : kn <= 15 ? 'medium' : 'strong');

// Tire un vent (direction d'où il vient, classe) selon la rose du mois.
// allowed : classes autorisées (niveau de difficulté).
export function sampleClimateWind(rnd, month = new Date().getMonth() + 1, allowed = CLASSES) {
  const rose = CLIMATE.months[month - 1].rose;
  const cells = [];
  let total = 0;
  rose.forEach((probs, s) => probs.forEach((p, c) => {
    if (!allowed.includes(CLASSES[c]) || p <= 0) return;
    total += p;
    cells.push({ s, c, cum: total });
  }));
  const r = rnd() * total;
  const cell = cells.find((x) => x.cum >= r) || cells[cells.length - 1];
  const from = Math.round((cell.s * SECTOR + (rnd() - 0.5) * SECTOR) / 5) * 5;
  return { from: ((from % 360) + 360) % 360, level: CLASSES[cell.c] };
}

// Nom d'un vent de la baie selon sa direction.
export function windName(from) {
  const d = ((from % 360) + 360) % 360;
  if (d >= 200 && d < 260) return 'Vent de sud-ouest (brise de mer)';
  if (d >= 260 && d < 290) return 'Vent d’ouest';
  if (d >= 290 && d < 335) return 'Noroît (nord-ouest)';
  if (d >= 335 || d < 20) return 'Vent de nord (vent de terre)';
  if (d >= 20 && d < 80) return 'Vent de nord-est (vent de terre)';
  if (d >= 80 && d < 150) return 'Vent d’est / sud-est';
  return 'Vent de sud';
}

// Prévision du jour à 15 h devant La Baule (Open-Meteo, sans clé, CORS autorisé).
// Résultat mis en cache pour la journée ; null si hors ligne.
const FORECAST_URL =
  'https://api.open-meteo.com/v1/forecast?latitude=47.25&longitude=-2.40&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m&wind_speed_unit=kn&timezone=Europe%2FParis&forecast_days=1';

// Date locale (comme la graine du défi du jour), pas UTC : sinon, après minuit à Paris,
// on resservirait la prévision de la veille.
export function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function todayWind({ timeoutMs = 3500 } = {}) {
  const day = dayKey();
  const key = `capaupres.forecast.${day}`;
  try {
    const cached = JSON.parse(localStorage.getItem(key));
    if (cached) return cached;
  } catch {
    /* pas de cache */
  }
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(FORECAST_URL, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const j = await res.json();
    const i = j.hourly.time.findIndex((t) => t.endsWith('T15:00'));
    if (i < 0) return null;
    const kn = j.hourly.wind_speed_10m[i];
    const from = Math.round(j.hourly.wind_direction_10m[i] / 5) * 5 % 360;
    const out = { from, kn: Math.round(kn), gust: Math.round(j.hourly.wind_gusts_10m[i]), level: levelOfKn(kn), day };
    try {
      localStorage.setItem(key, JSON.stringify(out));
    } catch {
      /* stockage indisponible */
    }
    return out;
  } catch {
    return null;
  }
}
