// Dessin SVG du bateau vu de dessus (dériveur, catamaran ou Optimist), orienté selon le cap.
// Repère local : étrave vers le haut, longueur ≈ 100 unités.
import { NO_GO, norm180 } from '../core/angles.js';
import { boatId } from '../core/boats.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// Angle d'ouverture conseillé (bôme / axe du bateau) selon l'angle du vent.
export function idealBoom(twaAbs) {
  return clamp(0.55 * twaAbs - 12, 4, 85);
}

function sailPath(start, len, angle, leeSign, flow, depth) {
  const r = (angle * Math.PI) / 180;
  const end = { x: start.x + leeSign * len * Math.sin(r), y: start.y + len * Math.cos(r) };
  const c = { x: end.x - start.x, y: end.y - start.y };
  const l = Math.hypot(c.x, c.y);
  let n = { x: -c.y / l, y: c.x / l };
  if (n.x * flow.x + n.y * flow.y < 0) n = { x: -n.x, y: -n.y };
  const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  const k = depth * l * 3.2; // creux exagéré pour la lisibilité
  const ctrl = { x: mid.x + n.x * k, y: mid.y + n.y * k };
  return { d: `M${f(start.x)},${f(start.y)} Q${f(ctrl.x)},${f(ctrl.y)} ${f(end.x)},${f(end.y)} Z`, end, ctrl, n };
}

const f = (x) => Math.round(x * 10) / 10;

// Couleurs et numéro du bateau du joueur (voir core/look.js), appliqués quand on ne force pas la coque.
let mine = null;
export function setMyLook(look) {
  mine = look;
}

// Numéro de voile peint sur l'arrière du pont, dans le sens de la longueur, lisible sur la coque choisie.
// Dessiné par-dessus la bôme pour rester lisible.
const NUM_AT = { deriveur: 30, catamaran: 18, j80: 34, optimist: 22 };
function hullNumber(type, hull, number) {
  const n = parseInt(hull.slice(1), 16);
  const lum = 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  const y = NUM_AT[type] ?? 20;
  return `<text class="hull-num" x="0" y="${y}" fill="${lum > 150 ? '#173d61' : '#ffffff'}" transform="rotate(-90 0 ${y})">${number}</text>`;
}

function flappingPath(start, len, angle, leeSign) {
  const r = (angle * Math.PI) / 180;
  const end = { x: start.x + leeSign * len * Math.sin(r), y: start.y + len * Math.cos(r) };
  const c = { x: end.x - start.x, y: end.y - start.y };
  const n = { x: -c.y / len, y: c.x / len };
  const frames = [1, -1, 0.6, -0.6, 1].map((s) => {
    const p1 = { x: start.x + c.x * 0.33 + n.x * 7 * s, y: start.y + c.y * 0.33 + n.y * 7 * s };
    const p2 = { x: start.x + c.x * 0.66 - n.x * 7 * s, y: start.y + c.y * 0.66 - n.y * 7 * s };
    return `M${f(start.x)},${f(start.y)} C${f(p1.x)},${f(p1.y)} ${f(p2.x)},${f(p2.y)} ${f(end.x)},${f(end.y)}`;
  });
  return { frames, end };
}

// Géométrie propre à chaque bateau (repère local : étrave vers le haut).
const GEOM = {
  deriveur: {
    mast: { x: 0, y: -14 }, boomLen: 52, tack: { x: 0, y: -47 }, jibLen: 32,
    body: (hull) => `
      <path class="hull" d="M0,-54 C10,-40 17,-14 17,14 L15,44 L-15,44 L-17,14 C-17,-14 -10,-40 0,-54 Z" fill="${hull}"/>
      <path class="deck" d="M0,-44 C7,-32 10,-12 10,8 L-10,8 C-10,-12 -7,-32 0,-44 Z"/>
      <line class="rudder" x1="0" y1="44" x2="0" y2="54"/>`,
    wake: 'M-13,46 L-30,96 M13,46 L30,96 M0,48 L0,84',
  },
  catamaran: {
    // catamaran du club, sans bôme : boomLen = longueur de la bordure de grand-voile
    mast: { x: 0, y: -22 }, boomLen: 54, tack: { x: 0, y: -50 }, jibLen: 30, noBoom: true,
    body: (hull) => {
      const h = (x) => `M${x},-58 C${x + 6},-44 ${x + 7},-14 ${x + 7},18 L${x + 5},48 L${x - 5},48 L${x - 7},18 C${x - 7},-14 ${x - 6},-44 ${x},-58 Z`;
      return `
      <path class="trampoline" d="M-17,-22 L17,-22 L17,34 L-17,34 Z"/>
      <line class="beam" x1="-22" y1="-22" x2="22" y2="-22"/>
      <line class="beam" x1="-22" y1="34" x2="22" y2="34"/>
      <path class="bridle" d="M-22,-56 L0,-50 L22,-56"/>
      <path class="hull" d="${h(-22)}" fill="${hull}"/>
      <path class="hull" d="${h(22)}" fill="${hull}"/>
      <line class="rudder" x1="-22" y1="48" x2="-22" y2="57"/>
      <line class="rudder" x1="22" y1="48" x2="22" y2="57"/>`;
    },
    wake: 'M-27,50 L-38,96 M-17,50 L-10,90 M17,50 L10,90 M27,50 L38,96',
  },
  j80: {
    mast: { x: 0, y: -10 }, boomLen: 50, tack: { x: 0, y: -52 }, jibLen: 34, sprit: { x: 0, y: -72 },
    body: (hull) => `
      <path class="hull" d="M0,-60 C9,-46 14,-20 14,8 L12,48 L-12,48 L-14,8 C-14,-20 -9,-46 0,-60 Z" fill="${hull}"/>
      <path class="deck" d="M-8,14 L8,14 L9,42 L-9,42 Z"/>
      <line class="bowsprit" x1="0" y1="-60" x2="0" y2="-72"/>
      <line class="rudder" x1="0" y1="48" x2="0" y2="58"/>`,
    wake: 'M-11,50 L-30,104 M11,50 L30,104 M0,52 L0,92',
  },
  optimist: {
    mast: { x: 0, y: -26 }, boomLen: 46, tack: null, jibLen: 0,
    body: (hull) => `
      <path class="hull" d="M-12,-42 L12,-42 C17,-36 19,-22 19,0 L18,36 L-18,36 L-19,0 C-19,-22 -17,-36 -12,-42 Z" fill="${hull}"/>
      <path class="deck" d="M-9,-20 L9,-20 L11,26 L-11,26 Z"/>
      <line class="rudder" x1="0" y1="36" x2="0" y2="48"/>`,
    wake: 'M-14,38 L-28,86 M14,38 L28,86 M0,40 L0,76',
  },
};

/**
 * opts: heading, windFrom, boom (angle forcé), depth (creux 0..0.25), jib (bool),
 *       telltales ('ok' | 'windward' | 'leeward' | null), hull (couleur), ghost (bool),
 *       type ('deriveur' | 'catamaran' | 'optimist', par défaut le bateau choisi)
 */
export function boatSVG(opts) {
  const { heading = 0, windFrom = 0, depth = 0.12, telltales = null, ghost = false } = opts;
  const look = !ghost && opts.hull === undefined && opts.mine !== false ? mine : null;
  const hull = opts.hull ?? look?.hull ?? '#173d61';
  const type = opts.type || boatId();
  const G = GEOM[type] || GEOM.deriveur;
  const jib = (opts.jib ?? true) && !!G.tack;
  const t = norm180(windFrom - heading);
  const a = Math.abs(t);
  const luffing = a < NO_GO;
  const leeSign = t > 0 ? -1 : 1;
  const boom = opts.boom ?? (luffing ? 2 : idealBoom(a));
  const jibAngle = opts.jibAngle ?? (luffing ? 2 : clamp(boom * 0.85 + 2, 6, 75));
  const flow = { x: -Math.sin((t * Math.PI) / 180), y: Math.cos((t * Math.PI) / 180) };
  const { mast, tack } = G;

  let sails = '';
  const sailCls = 'sail';
  if (luffing || opts.flap) {
    const m = flappingPath(mast, G.boomLen, boom, leeSign);
    sails += `<path class="${sailCls} flap" d="${m.frames[0]}"><animate attributeName="d" dur="0.35s" repeatCount="indefinite" values="${m.frames.join(';')}"/></path>`;
    if (!G.noBoom) sails += `<line class="boom" x1="${mast.x}" y1="${mast.y}" x2="${f(m.end.x)}" y2="${f(m.end.y)}"/>`;
    if (jib) {
      const j = flappingPath(tack, G.jibLen, jibAngle, leeSign);
      sails += `<path class="${sailCls} flap" d="${j.frames[1]}"><animate attributeName="d" dur="0.3s" repeatCount="indefinite" values="${j.frames.join(';')}"/></path>`;
    }
  } else {
    const m = sailPath(mast, G.boomLen, boom, leeSign, flow, depth);
    sails += `<path class="${sailCls} main" d="${m.d}"/>`;
    if (!G.noBoom) sails += `<line class="boom" x1="${mast.x}" y1="${mast.y}" x2="${f(m.end.x)}" y2="${f(m.end.y)}"/>`;
    if (type === 'optimist') {
      // la livarde : vergue en diagonale qui tend la voile
      const pk = { x: m.end.x * 0.55 + m.ctrl.x * 0.25, y: m.end.y * 0.55 + m.ctrl.y * 0.25 + mast.y * 0.2 };
      sails += `<line class="sprit" x1="${mast.x}" y1="${mast.y}" x2="${f(pk.x)}" y2="${f(pk.y)}"/>`;
    }
    // penons : sur le foc s'il y en a un, sinon sur la grand-voile
    let tt = null;
    const spiUp = !!G.sprit && a >= 100 && opts.spi !== false;
    if (spiUp) {
      // spi asymétrique amuré au bout-dehors, gonflé sous le vent
      // le point d'écoute est ramené vers l'arrière du bateau, le spi gonfle sous le vent
      const spiAngle = clamp(a * 0.45 - 12, 28, 72);
      const sp = sailPath(G.sprit, 68, spiAngle, leeSign, flow, 0.22);
      sails = `<path class="${sailCls} spi" d="${sp.d}"/>` + sails;
      tt = { from: mast, sail: sailPath(mast, G.boomLen, boom, leeSign, flow, depth), angle: boom };
    } else if (jib) {
      const j = sailPath(tack, G.jibLen, jibAngle, leeSign, flow, depth * 0.9);
      sails += `<path class="${sailCls} jib" d="${j.d}"/>`;
      tt = { from: tack, sail: j, angle: jibAngle };
    } else {
      tt = { from: mast, sail: m, angle: boom };
    }
    if (telltales) {
      const { from, sail: j, angle } = tt;
      const p = { x: from.x + (j.ctrl.x - from.x) * 0.35, y: from.y + (j.ctrl.y - from.y) * 0.35 };
      const back = { x: Math.sin((angle * Math.PI) / 180) * leeSign, y: Math.cos((angle * Math.PI) / 180) };
      const wiggle = (cls, side, bad) => {
        const o = { x: p.x + j.n.x * side * 2.2, y: p.y + j.n.y * side * 2.2 };
        const e = { x: o.x + back.x * 9, y: o.y + back.y * 9 };
        if (!bad) return `<line class="telltale ${cls}" x1="${f(o.x)}" y1="${f(o.y)}" x2="${f(e.x)}" y2="${f(e.y)}"/>`;
        const e1 = { x: o.x + back.x * 5 + j.n.x * side * 5, y: o.y + back.y * 5 + j.n.y * side * 5 };
        const e2 = { x: o.x + back.x * 5 - j.n.x * side * 2, y: o.y + back.y * 5 - j.n.y * side * 2 };
        return `<path class="telltale ${cls} bad" d="M${f(o.x)},${f(o.y)} L${f(e1.x)},${f(e1.y)}"><animate attributeName="d" dur="0.25s" repeatCount="indefinite" values="M${f(o.x)},${f(o.y)} L${f(e1.x)},${f(e1.y)};M${f(o.x)},${f(o.y)} L${f(e2.x)},${f(e2.y)};M${f(o.x)},${f(o.y)} L${f(e1.x)},${f(e1.y)}"/></path>`;
      };
      sails += wiggle('windward', -1, telltales === 'windward');
      sails += wiggle('leeward', 1, telltales === 'leeward');
    }
  }

  // sillage en V derrière la poupe : indique le sens de marche
  const wake = opts.wake === false || luffing ? '' : `<path class="boat-wake" d="${G.wake}"/>`;
  return `<g class="boat boat-${type}${ghost ? ' ghost' : ''}" transform="rotate(${f(heading)})"${look ? ` style="--sail:${look.sail}"` : ''}>
    ${wake}
    ${G.body(hull)}
    <circle class="mast" cx="${mast.x}" cy="${mast.y}" r="3"/>
    ${sails}
    ${look?.number ? hullNumber(type, type === 'catamaran' ? '#173d61' : hull, look.number) : ''}
  </g>`;
}

// Petite icône du bateau (vue de dessus), pour les boutons et pastilles.
// `mine` : avec les couleurs du joueur (barre du haut, sa flotte), sinon aux couleurs d'origine.
export function boatIcon(type = boatId(), size = 22, mine = false) {
  return `<svg class="boat-icon" width="${size}" height="${size}" viewBox="-62 -66 124 124" aria-hidden="true">${boatSVG({ heading: 0, windFrom: 300, type, wake: false, mine })}</svg>`;
}

// Flèche de vent (pointe dans le sens où va le vent).
export function windArrowSVG(windFrom, size = 40, cls = 'wind-arrow') {
  return `<g class="${cls}" transform="rotate(${f(windFrom)})">
    <line x1="0" y1="${-size}" x2="0" y2="${size * 0.55}"/>
    <path d="M${-size * 0.35},${size * 0.25} L0,${size} L${size * 0.35},${size * 0.25} Z"/>
  </g>`;
}
