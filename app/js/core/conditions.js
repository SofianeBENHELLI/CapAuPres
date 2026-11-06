// Conditions en temps réel devant La Baule : météo, vent, vagues, marée (Open-Meteo, sans clé,
// CORS autorisé). Mises en cache 20 minutes ; hors ligne, on ressert la dernière lecture.
// La marée vient d'un modèle océanique : indicative, l'annuaire du SHOM fait foi.

const LAT = 47.25;
const LON = -2.4;
const TZ = 'Europe%2FParis';
const FORECAST_URL =
  `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
  '&current=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m' +
  '&hourly=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m' +
  `&daily=sunrise,sunset&wind_speed_unit=kn&timezone=${TZ}&forecast_days=3`;
const MARINE_URL =
  `https://marine-api.open-meteo.com/v1/marine?latitude=${LAT}&longitude=${LON}` +
  '&hourly=wave_height,wave_direction,wave_period,sea_level_height_msl,sea_surface_temperature,ocean_current_velocity,ocean_current_direction' +
  `&timezone=${TZ}&forecast_days=3&cell_selection=sea`;
const KEY = 'capaupres.conditions.v3';
export const HORIZON_H = 48;
const FRESH_MS = 20 * 60 * 1000;

export const WEBCAM_URL = 'https://www.skaping.com/la-baule/plage/video';

// Miniature de la webcam : l'image d'aperçu que Skaping publie pour le partage de lien
// (balise og:image), rangée par heure de Paris : …/LaBaule/1/video/AAAA/MM/JJ/HH-MM.jpg.
// Toutes les images ne sont pas publiées : on essaie les quarts d'heure récents, du plus
// récent au plus ancien, et on garde le premier qui se charge. © Skaping, un clic ouvre leur site.
const THUMB_BASE = 'https://skaping.s3.gra.io.cloud.ovh.net/LaBaule/1/video';
const PARIS = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

export function thumbCandidates(now = new Date(), hours = 4) {
  const out = [];
  const t0 = Math.floor(now.getTime() / 900e3) * 900e3;
  for (let t = t0; t > t0 - hours * 3600e3; t -= 900e3) {
    const p = Object.fromEntries(PARIS.formatToParts(new Date(t)).map((x) => [x.type, x.value]));
    out.push({ time: new Date(t), url: `${THUMB_BASE}/${p.year}/${p.month}/${p.day}/${p.hour}-${p.minute}.jpg` });
  }
  return out;
}

let thumbPromise = null;
export function findWebcamThumb() {
  if (thumbPromise) return thumbPromise;
  const tryOne = (c) =>
    new Promise((resolve) => {
      const img = new Image();
      const timer = setTimeout(() => resolve(null), 4000);
      img.onload = () => (clearTimeout(timer), resolve(c));
      img.onerror = () => (clearTimeout(timer), resolve(null));
      img.src = c.url;
    });
  thumbPromise = (async () => {
    for (const c of thumbCandidates()) {
      const ok = await tryOne(c);
      if (ok) return ok;
    }
    return null;
  })();
  return thumbPromise;
}

// Codes météo WMO → libellé et icône.
export function sky(code) {
  if (code === 0) return { icon: '☀️', label: 'Ciel dégagé' };
  if (code <= 2) return { icon: '🌤️', label: 'Peu nuageux' };
  if (code === 3) return { icon: '☁️', label: 'Couvert' };
  if (code === 45 || code === 48) return { icon: '🌫️', label: 'Brouillard' };
  if (code >= 51 && code <= 57) return { icon: '🌦️', label: 'Bruine' };
  if (code >= 61 && code <= 67) return { icon: '🌧️', label: 'Pluie' };
  if (code >= 71 && code <= 77) return { icon: '🌨️', label: 'Neige' };
  if (code >= 80 && code <= 82) return { icon: '🌦️', label: 'Averses' };
  if (code >= 85 && code <= 86) return { icon: '🌨️', label: 'Averses de neige' };
  if (code >= 95) return { icon: '⛈️', label: 'Orage' };
  return { icon: '🌥️', label: 'Variable' };
}

// Force Beaufort d'un vent en nœuds.
const BEAUFORT = [1, 4, 7, 11, 17, 22, 28, 34, 41, 48, 56, 64];
export const beaufort = (kn) => {
  const i = BEAUFORT.findIndex((b) => kn < b);
  return i < 0 ? 12 : i;
};

// Pleines et basses mers d'une série horaire de hauteurs : extremums locaux, affinés par une
// parabole sur les trois heures autour (l'heure trouvée tombe ainsi entre deux pas horaires).
export function tideExtremes(times, levels) {
  const out = [];
  for (let i = 1; i < levels.length - 1; i++) {
    const [a, b, c] = [levels[i - 1], levels[i], levels[i + 1]];
    if (a == null || b == null || c == null) continue;
    const high = b >= a && b > c;
    const low = b <= a && b < c;
    if (!high && !low) continue;
    const den = a - 2 * b + c;
    const off = den ? (a - c) / (2 * den) : 0;
    const t = new Date(new Date(times[i]).getTime() + off * 3600e3);
    out.push({ type: high ? 'PM' : 'BM', time: t, level: b - ((a - c) * off) / 4 });
  }
  return out;
}

// Index de l'heure courante dans une série horaire (heure locale « AAAA-MM-JJTHH:00 »).
export function hourIndex(times, now = new Date()) {
  const h = new Date(now);
  h.setMinutes(0, 0, 0);
  const i = times.findIndex((t) => new Date(t).getTime() >= h.getTime());
  return i < 0 ? times.length - 1 : i;
}

async function getJSON(url, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function readCache() {
  try {
    return JSON.parse(localStorage.getItem(KEY));
  } catch {
    return null;
  }
}

// { forecast, marine, fetchedAt, stale } ; null si jamais chargé et hors ligne.
// Les deux sources sont indépendantes : si l'une tombe, l'autre s'affiche quand même.
export async function loadConditions({ force = false, timeoutMs = 6000 } = {}) {
  const cached = readCache();
  if (!force && cached && Date.now() - cached.fetchedAt < FRESH_MS) return { ...cached, stale: false };
  const [f, m] = await Promise.allSettled([getJSON(FORECAST_URL, timeoutMs), getJSON(MARINE_URL, timeoutMs)]);
  const forecast = f.status === 'fulfilled' ? f.value : cached?.forecast;
  const marine = m.status === 'fulfilled' ? m.value : cached?.marine;
  if (!forecast && !marine) return null;
  const fresh = f.status === 'fulfilled' || m.status === 'fulfilled';
  const out = { forecast, marine, fetchedAt: fresh ? Date.now() : cached.fetchedAt };
  if (fresh) {
    try {
      localStorage.setItem(KEY, JSON.stringify(out));
    } catch {
      /* stockage indisponible */
    }
  }
  return { ...out, stale: f.status !== 'fulfilled' || m.status !== 'fulfilled' };
}

// Résumé prêt à afficher pour l'instant `at` (maintenant, ou une heure des prochaines 48 h) :
// les mesures « current » pour maintenant, la prévision horaire sinon.
export function summarize(data, at = new Date(), now = new Date()) {
  const live = Math.abs(at - now) < 30 * 60e3;
  const s = { fetchedAt: new Date(data.fetchedAt), stale: data.stale, at, live };
  const f = data.forecast;
  if (f) {
    const h = f.hourly;
    const i0 = hourIndex(h.time, at);
    const c = live && f.current
      ? f.current
      : { temperature_2m: h.temperature_2m[i0], weather_code: h.weather_code[i0], wind_speed_10m: h.wind_speed_10m[i0], wind_gusts_10m: h.wind_gusts_10m[i0], wind_direction_10m: h.wind_direction_10m[i0] };
    s.temp = Math.round(c.temperature_2m);
    s.sky = sky(c.weather_code);
    s.wind = { kn: Math.round(c.wind_speed_10m), gust: Math.round(c.wind_gusts_10m), from: Math.round(c.wind_direction_10m) };
    s.wind.bf = beaufort(s.wind.kn);
    s.hours = h.time.slice(i0, i0 + 12).map((t, k) => ({
      time: new Date(t),
      kn: Math.round(h.wind_speed_10m[i0 + k]),
      gust: Math.round(h.wind_gusts_10m[i0 + k]),
      from: Math.round(h.wind_direction_10m[i0 + k]),
      temp: Math.round(h.temperature_2m[i0 + k]),
      sky: sky(h.weather_code[i0 + k]),
    }));
    const d = Math.max(0, f.daily.time.findIndex((t) => t === h.time[i0].slice(0, 10)));
    s.sun = { rise: new Date(f.daily.sunrise[d]), set: new Date(f.daily.sunset[d]) };
    s.night = at < s.sun.rise || at > s.sun.set;
  }
  const m = data.marine;
  if (m) {
    const h = m.hourly;
    const i = hourIndex(h.time, at);
    s.waves = { height: h.wave_height[i], period: h.wave_period[i], from: h.wave_direction[i] };
    s.water = h.sea_surface_temperature[i];
    // courant au large de la baie (modèle océanique, km/h → nœuds) ; la direction est celle où il va
    if (h.ocean_current_velocity?.[i] != null) {
      s.current = { kn: h.ocean_current_velocity[i] / 1.852, to: h.ocean_current_direction[i] };
    }
    const ext = tideExtremes(h.time, h.sea_level_height_msl);
    s.tide = {
      times: h.time.map((t) => new Date(t)),
      levels: h.sea_level_height_msl,
      extremes: ext,
      next: ext.filter((e) => e.time > at).slice(0, 2),
      rising: h.sea_level_height_msl[Math.min(i + 1, h.time.length - 1)] > h.sea_level_height_msl[i],
    };
  }
  return s;
}

// Drapeau « d'un coup d'œil », le même pour tout le club quel que soit le bateau : seuls le vent
// (moyen / rafales, en nœuds) et la mer font monter le niveau. Le reste (vent de terre, brouillard)
// donne des avertissements. Seuils indicatifs : ce n'est pas le drapeau officiel, le moniteur décide.
export const FLAG_LIMITS = { green: [16, 22], yellow: [21, 27], red: [27, 34] };
export const WAVE_LIMITS = { yellow: 2, red: 3 };
export const FLAGS = {
  green: { label: 'Drapeau vert', text: 'Conditions favorables' },
  yellow: { label: 'Drapeau jaune', text: 'Prudence, on reste groupés' },
  red: { label: 'Drapeau rouge', text: 'Avec un moniteur seulement' },
  black: { label: 'Drapeau noir', text: 'On reste à terre' },
  night: { label: 'Nuit', text: 'On reste à terre : pas de visibilité' },
};
const ORDER = ['green', 'yellow', 'red', 'black'];

// Vent de terre vu du club : la baie s'ouvre au sud-sud-ouest, la côte va du nord-ouest à l'est.
export const isOffshore = (from) => {
  const d = ((from % 360) + 360) % 360;
  return d >= 300 || d <= 100;
};

// `boatId` est accepté pour compatibilité mais n'influe pas sur le drapeau.
export function flagFor(s, _boatId) {
  let level = 0;
  const why = [];
  const warnings = [];
  const raise = (l, reason) => {
    if (l > level) level = l;
    if (l > 0) why.push(reason);
  };
  if (s.wind) {
    const { kn, gust } = s.wind;
    const over = (pair) => kn > pair[0] || gust > pair[1];
    if (over(FLAG_LIMITS.red)) raise(3, `vent ${kn} nds, rafales ${gust}`);
    else if (over(FLAG_LIMITS.yellow)) raise(2, `vent ${kn} nds, rafales ${gust}`);
    else if (over(FLAG_LIMITS.green)) raise(1, `vent ${kn} nds, rafales ${gust}`);
    if (isOffshore(s.wind.from) && kn >= 6) {
      warnings.push('vent de terre : mer plate au bord, vent irrégulier sous la côte et un peu plus soutenu au large. La baie est fermée et le club au fond : la rentrée se fait au près, en eau abritée');
    }
    if (gust - kn >= 10) warnings.push(`rafales marquées (+${gust - kn} nds) : on choque dans les risées`);
  }
  if (s.waves) {
    const h = s.waves.height.toFixed(1).replace('.', ',');
    if (s.waves.height > WAVE_LIMITS.red) raise(2, `vagues de ${h} m au large`);
    else if (s.waves.height > WAVE_LIMITS.yellow) raise(1, `vagues de ${h} m au large`);
    else if (s.waves.height >= 1 && s.wind && !isOffshore(s.wind.from)) warnings.push(`houle de ${h} m par vent de mer : soigner la mise à l'eau et le retour sur la plage`);
  }
  if (s.sky?.label === 'Orage') raise(3, 'orage');
  else if (s.sky?.label === 'Brouillard') warnings.push('brouillard : garder les repères en vue');
  if (!s.wind) return null;
  // de nuit (avant le lever, après le coucher du soleil) : on ne voit ni les vagues, ni les
  // cailloux, ni les autres bateaux. Code à part (gris rayé), quel que soit le vent.
  if (s.night) return { color: 'night', ...FLAGS.night, why: ['il fait nuit : pas de visibilité, pas de voile sportive', ...why], warnings };
  const color = ORDER[level];
  return { color, ...FLAGS[color], why, warnings };
}
