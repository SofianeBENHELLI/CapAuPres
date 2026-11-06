import { isOffshoreWindAt, distToCoast, BOUNDS } from './geo.js';

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Champ de vent : direction moyenne, rafales mobiles, oscillations, effets de côte.
// cfg = { twd, tws, gust, shift (°), period (s), seed }
export function createWindField(cfg) {
  const r = rng(cfg.seed ?? 1);
  const tws = cfg.tws, gust = Math.max(cfg.gust ?? tws * 1.25, tws);
  const shift = cfg.shift ?? 6, period = cfg.period ?? 180;
  const W = BOUNDS.maxX - BOUNDS.minX, H = BOUNDS.maxY - BOUNDS.minY;
  const patches = Array.from({ length: 34 }, () => ({
    x: BOUNDS.minX + r() * W, y: BOUNDS.minY + r() * H,
    rad: 220 + r() * 380, k: 0.4 + r() * 0.6, rot: (r() - 0.5) * 10,
  }));
  const phase = r() * Math.PI * 2;
  const offCache = new Map();

  function offshore(x, y, dir) {
    const key = `${Math.round(x / 150)},${Math.round(y / 150)},${Math.round(dir / 10)}`;
    let v = offCache.get(key);
    if (v === undefined) {
      v = isOffshoreWindAt({ x, y }, dir) ? distToCoast({ x, y }) : -1;
      if (offCache.size > 20000) offCache.clear();
      offCache.set(key, v);
    }
    return v;
  }

  function at(x, y, t) {
    let dir = cfg.twd + shift * Math.sin((2 * Math.PI * t) / period + phase + x / 4000);
    const rad = ((cfg.twd + 180) * Math.PI) / 180;
    const drift = tws * 0.514 * 0.6 * t;
    let g = 0, rot = 0;
    for (const p of patches) {
      let px = p.x + Math.sin(rad) * drift, py = p.y + Math.cos(rad) * drift;
      px = BOUNDS.minX + ((((px - BOUNDS.minX) % W) + W) % W);
      py = BOUNDS.minY + ((((py - BOUNDS.minY) % H) + H) % H);
      const d2 = ((x - px) ** 2 + (y - py) ** 2) / (p.rad * p.rad);
      if (d2 < 1) { const f = (1 - d2) * p.k; if (f > g) { g = f; rot = p.rot; } }
    }
    let speed = tws + (gust - tws) * g;
    dir += rot * g;
    // Vent de terre : déventé et irrégulier près du bord, établi au large.
    const dc = offshore(x, y, cfg.twd);
    if (dc >= 0 && dc < 700) {
      const k = dc / 700;
      speed *= 0.72 + 0.28 * k;
      dir += (1 - k) * 12 * Math.sin(t / 23 + x / 300);
    }
    return { twd: ((dir % 360) + 360) % 360, tws: Math.max(0, speed), gust: g };
  }

  return { cfg, at, patches };
}

// Houle atténuée dans l'ouest de la baie, abrité par Penchâteau et Les Évens.
export function swellAt(x, y, swellH, swellDir = 250) {
  if (!swellH) return 0;
  const shelter = swellDir > 200 && swellDir < 320 && x < 1500 && y > -1800 ? 0.6 + 0.4 * Math.min(1, (x + 500) / 2000) : 1;
  return swellH * Math.max(0.3, Math.min(1, shelter));
}
