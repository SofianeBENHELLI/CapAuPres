// Lecture des conditions : un seul verdict pour tout le club, fondé sur le vent et la houle.
// Le type de bateau ne change pas le verdict. Le reste (vent de terre, rafales, marée) donne des avertissements.

export const LEVELS = [
  { id: 'calme', label: 'Petit temps', color: '#8fb8d0', advice: 'Peu de vent : idéal pour les débutants et le travail des réglages fins.' },
  { id: 'bon', label: 'Bonnes conditions', color: '#2fb36d', advice: 'Conditions idéales pour naviguer dans la baie.' },
  { id: 'vigilance', label: 'Vigilance', color: '#f2b705', advice: 'Navigable avec un peu d\'attention : on reste groupés et on prend des ris ou on choque.' },
  { id: 'engage', label: 'Engagé', color: '#f07c1e', advice: 'Pour équipages confirmés, avec encadrement sur l\'eau.' },
  { id: 'tres-engage', label: 'Très engagé', color: '#e5484d', advice: 'Hors programme école : décision du chef de base.' },
];
const L = Object.fromEntries(LEVELS.map((l, i) => [l.id, i]));

export const BEAUFORT = [1, 3, 6, 10, 16, 21, 27, 33, 40, 47, 55, 63];
export function beaufort(kn) {
  const i = BEAUFORT.findIndex((v) => kn <= v);
  return i < 0 ? 12 : i;
}

export function cardinal(deg) {
  const n = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'];
  return n[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16];
}

// Secteurs vus depuis le club : la baie s'ouvre vers le sud-sud-ouest.
export function windSector(twd) {
  const d = ((twd % 360) + 360) % 360;
  if (d >= 300 || d <= 100) return 'terre';
  if (d > 100 && d < 160) return 'travers-est';
  if (d >= 160 && d <= 260) return 'mer';
  return 'travers-ouest';
}

function windLevel(tws, gust) {
  const eff = Math.max(tws, (gust ?? tws) * 0.82);
  if (eff < 6) return 'calme';
  if (eff < 17) return 'bon';
  if (eff < 22) return 'vigilance';
  if (eff < 28) return 'engage';
  return 'tres-engage';
}

function swellLevel(h, period) {
  if (h == null) return 'calme';
  const steep = period && period < 7 ? 1.25 : 1; // houle courte = mer hachée
  const e = h * steep;
  if (e < 1) return 'calme'; // houle faible : n'aggrave rien
  if (e < 1.6) return 'vigilance';
  if (e < 2.5) return 'engage';
  return 'tres-engage';
}

// c = { tws, gust, twd, swellH, swellT, swellDir, waveH }
export function evaluate(c) {
  const wl = windLevel(c.tws, c.gust);
  const sea = Math.max(c.swellH ?? 0, c.waveH ?? 0);
  const sl = swellLevel(sea, c.swellT);
  const idx = Math.max(L[wl], L[sl]);
  const level = LEVELS[idx];
  const warnings = [];
  const sector = windSector(c.twd);

  if (sector === 'terre') {
    warnings.push({
      kind: 'info', id: 'vent-terre', title: 'Vent de terre',
      text: 'Plan d\'eau plat près du bord, vent plus irrégulier sous la côte et un peu plus soutenu au large. La configuration de la baie et la position du club rendent la rentrée facile : on revient au près, dans une eau abritée.',
    });
  }
  if (sector === 'mer' && sea >= 0.6) {
    warnings.push({
      kind: 'warn', id: 'shore-break', title: 'Houle sur la plage',
      text: 'Vent de mer : la houle rentre dans la baie. Soigner la mise à l\'eau et le retour sur la plage (shore-break), bateau face aux vagues.',
    });
  }
  const gustDelta = (c.gust ?? c.tws) - c.tws;
  if (gustDelta >= 9 || (c.tws > 4 && (c.gust ?? c.tws) / c.tws >= 1.6)) {
    warnings.push({ kind: 'warn', id: 'rafales', title: 'Rafales marquées', text: `Écart vent moyen / rafales de ${Math.round(gustDelta)} nœuds : anticiper en choquant, regarder les risées arriver sur l'eau.` });
  }
  if (c.swellT && c.swellT < 7 && sea >= 0.8) {
    warnings.push({ kind: 'warn', id: 'clapot', title: 'Mer hachée', text: 'Houle courte : ça tape au près, on abat un peu pour garder de la vitesse.' });
  }
  if (sea >= 1 && sector !== 'mer') {
    warnings.push({ kind: 'info', id: 'abri', title: 'Abri de Penchâteau', text: 'L\'ouest de la baie, côté Pouliguen, est abrité de la houle d\'ouest par la pointe de Penchâteau et Les Évens.' });
  }
  if (wl === 'calme') {
    warnings.push({ kind: 'info', id: 'petit-temps', title: 'Petit temps', text: 'Penser au courant de marée qui peut devenir plus fort que le vent : prévoir la rentrée.' });
  }

  return {
    level: level.id, label: level.label, color: level.color, advice: level.advice, index: idx,
    wind: wl, sea: sl, sector, beaufort: beaufort(c.tws), warnings,
    summary: `${Math.round(c.tws)} nds (rafales ${Math.round(c.gust ?? c.tws)}) de ${cardinal(c.twd)}, mer ${sea.toFixed(1)} m`,
  };
}

// Prévision réelle Open-Meteo (gratuite, sans clé). Appelée depuis le navigateur.
export const SPOT = { lat: 47.262, lon: -2.405 };
export async function fetchForecast(fetchImpl = fetch) {
  const base = `latitude=${SPOT.lat}&longitude=${SPOT.lon}&timezone=Europe%2FParis&forecast_days=3`;
  const [w, m] = await Promise.all([
    fetchImpl(`https://api.open-meteo.com/v1/forecast?${base}&hourly=wind_speed_10m,wind_gusts_10m,wind_direction_10m,temperature_2m&wind_speed_unit=kn`).then((r) => r.json()),
    fetchImpl(`https://marine-api.open-meteo.com/v1/marine?${base}&hourly=wave_height,swell_wave_height,swell_wave_period,swell_wave_direction`).then((r) => r.json()).catch(() => null),
  ]);
  return mergeForecast(w, m);
}

export function mergeForecast(w, m) {
  const h = w.hourly;
  const mh = m?.hourly;
  const midx = new Map((mh?.time || []).map((t, i) => [t, i]));
  return h.time.map((time, i) => {
    const j = midx.get(time);
    const c = {
      time, tws: h.wind_speed_10m[i], gust: h.wind_gusts_10m[i], twd: h.wind_direction_10m[i], temp: h.temperature_2m?.[i],
      swellH: j != null ? mh.swell_wave_height[j] : null, swellT: j != null ? mh.swell_wave_period[j] : null,
      swellDir: j != null ? mh.swell_wave_direction[j] : null, waveH: j != null ? mh.wave_height[j] : null,
    };
    return { ...c, eval: evaluate(c) };
  });
}
