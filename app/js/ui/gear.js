import { termById } from '../data/glossary.js';

// Visuels du bateau à quai : vue de profil annotée de chaque bateau, pictogrammes d'accastillage.
// Couleurs de la charte (variables CSS) : coque blanche cerclée de marine, voiles bleu ciel.

// ---------------------------------------------------------------- Pictogrammes (viewBox -24 -24 48 48)
export const GEAR_ICONS = {
  taquet: `<rect x="-5" y="-4" width="10" height="12" rx="2" class="g-metal"/><path d="M-20,-6 Q-20,-12 -12,-11 L12,-11 Q20,-12 20,-6 Q18,-3 12,-4 L-12,-4 Q-18,-3 -20,-6 Z" class="g-metal"/><rect x="-14" y="8" width="28" height="5" rx="2" class="g-dark"/>`,
  coinceur: `<rect x="-18" y="6" width="36" height="7" rx="3" class="g-dark"/><path d="M-12,6 Q-14,-10 -3,-14 L-3,6 Z" class="g-metal"/><path d="M12,6 Q14,-10 3,-14 L3,6 Z" class="g-metal"/><path d="M-2,-12 L-2,4 M2,-12 L2,4" class="g-teeth"/><path d="M0,-22 L0,22" class="g-rope"/>`,
  poulie: `<circle r="13" class="g-metal"/><circle r="7" class="g-dark"/><circle r="2.5" class="g-metal"/><path d="M-6,-22 L-6,-12 A13,13 0 0 0 -13,0" class="g-rope" fill="none"/><path d="M-14,-12 L14,-12 M0,-12 L0,-21" class="g-dark-line"/>`,
  winch: `<path d="M-14,14 L-11,-10 L11,-10 L14,14 Z" class="g-metal"/><rect x="-11" y="-16" width="22" height="7" rx="3" class="g-dark"/><path d="M-12,2 L12,-2 M-13,8 L13,4" class="g-rope"/><path d="M0,-16 L0,-22 L16,-22" class="g-dark-line"/>`,
  manille: `<path d="M-10,8 L-10,-6 A10,10 0 0 1 10,-6 L10,8" class="g-shackle"/><rect x="-15" y="8" width="30" height="6" rx="3" class="g-dark"/>`,
  chariot: `<rect x="-22" y="6" width="44" height="6" rx="3" class="g-dark"/><rect x="-7" y="-2" width="14" height="10" rx="2" class="g-metal"/><circle cy="-8" r="6" class="g-metal"/><path d="M0,-14 L0,-22" class="g-rope"/><path d="M-20,9 L-28,9 M20,9 L28,9" class="g-arrow"/>`,
};

export const gearIcon = (id, size = 44) =>
  GEAR_ICONS[id] ? `<svg class="gear-icon" viewBox="-24 -24 48 48" width="${size}" height="${size}" aria-hidden="true">${GEAR_ICONS[id]}</svg>` : '';

// ---------------------------------------------------------------- Vue de profil (viewBox 0 0 420 330)
// Chaque pièce est dessinée dans un groupe data-part (terme du lexique) pour pouvoir la surligner ;
// spots : position de la pastille numérotée.
const WATER = 240;

const line = (x1, y1, x2, y2, cls = 'p-line') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${cls}"/>`;

const PROFILES = {
  deriveur: {
    parts: {
      coque: `<path d="M90,222 L325,222 Q336,224 330,234 Q300,252 200,254 L95,250 Z" class="p-hull"/>`,
      derive: `<path d="M196,252 L210,252 L203,310 L192,308 Z" class="p-foil"/>`,
      safran: `<path d="M90,226 L98,228 L90,300 L80,296 Z" class="p-foil"/>`,
      barre: line(94, 216, 152, 210, 'p-stick'),
      stick: line(152, 210, 178, 188, 'p-thin'),
      mat: line(215, 222, 215, 28, 'p-spar'),
      haubans: line(215, 44, 200, 222),
      etai: line(215, 44, 326, 222),
      gv: `<path d="M213,32 Q175,95 104,196 L213,192 Z" class="p-sail"/>`,
      lattes: `${line(186, 70, 206, 72, 'p-batten')}${line(160, 110, 200, 112, 'p-batten')}${line(134, 150, 180, 152, 'p-batten')}`,
      foc: `<path d="M216,84 L318,220 L250,192 Z" class="p-sail"/>`,
      penons: `${line(262, 148, 270, 151, 'p-telltale')}${line(272, 168, 280, 171, 'p-telltale')}`,
      bome: line(215, 195, 98, 200, 'p-spar'),
      halebas: line(215, 214, 186, 198),
      cunningham: `<circle cx="209" cy="183" r="3" class="p-ring"/>${line(209, 186, 209, 221, 'p-cunn')}`,
      ecoutegv: `${line(140, 199, 157, 216, 'p-sheet')}${line(147, 199, 163, 216, 'p-sheet')}<circle cx="160" cy="218" r="4" class="p-block"/>`,
      ecoutefoc: `${line(250, 192, 240, 217, 'p-sheet')}${line(250, 192, 262, 217, 'p-sheet p-dash')}<circle cx="240" cy="218" r="3.5" class="p-block"/>`,
      coinceur: `<rect x="224" y="216" width="10" height="5" rx="1.5" class="p-block"/>`,
      drisse: line(219, 30, 219, 215, 'p-thin'),
    },
    spots: { coque: [290, 238], derive: [203, 290], safran: [86, 280], barre: [124, 216], stick: [180, 182], mat: [222, 120], haubans: [204, 180], etai: [292, 170], gv: [168, 140], lattes: [155, 110], foc: [262, 196], penons: [272, 156], bome: [116, 188], halebas: [192, 210], cunningham: [200, 172], ecoutegv: [148, 224], ecoutefoc: [256, 206], coinceur: [226, 232], drisse: [226, 60] },
  },
  optimist: {
    parts: {
      coque: `<path d="M118,222 L300,216 L306,236 Q262,250 200,252 L124,246 Z" class="p-hull"/>`,
      derive: `<path d="M210,251 L222,251 L218,306 L207,305 Z" class="p-foil"/>`,
      safran: `<path d="M120,226 L128,228 L122,300 L112,297 Z" class="p-foil"/>`,
      barre: line(124, 214, 186, 208, 'p-stick'),
      stick: line(186, 208, 208, 188, 'p-thin'),
      mat: line(276, 220, 276, 66, 'p-spar'),
      gv: `<path d="M274,72 L150,40 Q160,120 140,196 L274,202 Z" class="p-sail"/>`,
      livarde: line(276, 178, 152, 44, 'p-spar-thin'),
      bome: line(276, 202, 138, 199, 'p-spar'),
      halebas: line(276, 214, 252, 202),
      ecoutegv: `${line(170, 200, 180, 216, 'p-sheet')}<circle cx="180" cy="218" r="4" class="p-block"/>`,
      penons: `${line(232, 110, 240, 113, 'p-telltale')}${line(226, 150, 234, 153, 'p-telltale')}`,
      drisse: line(280, 70, 280, 214, 'p-thin'),
    },
    spots: { coque: [282, 236], derive: [214, 292], safran: [118, 282], barre: [150, 216], stick: [206, 184], mat: [284, 120], gv: [200, 160], livarde: [196, 92], bome: [146, 190], halebas: [258, 212], ecoutegv: [178, 228], penons: [232, 132], drisse: [287, 180] },
  },
  catamaran: {
    parts: {
      coque: `<path d="M68,208 L338,206 Q350,208 345,220 Q300,240 190,242 Q100,242 70,232 Z" class="p-hull p-ghost"/><path d="M60,214 L340,212 Q352,214 346,226 Q300,246 190,247 Q100,247 64,237 Z" class="p-hull"/>`,
      trampoline: line(108, 209, 300, 208, 'p-tramp'),
      boutdehors: line(338, 210, 388, 206, 'p-spar-thin'),
      spi: `<path d="M208,26 Q322,56 387,205 Q318,170 288,112 Z" class="p-sail p-spi"/>`,
      safran: `<path d="M64,232 L74,234 L66,298 L56,294 Z" class="p-foil"/>`,
      barre: line(70, 206, 132, 202, 'p-stick'),
      stick: line(132, 202, 160, 176, 'p-thin'),
      mat: line(210, 210, 210, 18, 'p-spar'),
      haubans: line(210, 40, 188, 212),
      etai: line(210, 40, 342, 212),
      trapeze: line(210, 58, 172, 196, 'p-thin p-dash'),
      gv: `<path d="M208,22 Q118,92 94,186 L208,181 Z" class="p-sail"/>`,
      lattes: `${line(170, 52, 204, 54, 'p-batten')}${line(146, 84, 204, 86, 'p-batten')}${line(126, 118, 204, 120, 'p-batten')}${line(110, 152, 204, 154, 'p-batten')}`,
      foc: `<path d="M211,78 L330,210 L250,180 Z" class="p-sail"/>`,
      penons: `${line(262, 138, 270, 141, 'p-telltale')}`,
      cunningham: `<circle cx="205" cy="174" r="3" class="p-ring"/>${line(205, 177, 205, 209, 'p-cunn')}`,
      chariot: `<rect x="82" y="205" width="34" height="4" rx="2" class="p-block"/>`,
      ecoutegv: `${line(94, 187, 96, 202, 'p-sheet')}${line(98, 187, 100, 202, 'p-sheet')}<circle cx="98" cy="202" r="4" class="p-block"/>`,
      ecoutefoc: `${line(250, 180, 244, 206, 'p-sheet')}${line(250, 180, 262, 206, 'p-sheet p-dash')}<circle cx="244" cy="206" r="3.5" class="p-block"/>`,
      drisse: line(214, 20, 214, 205, 'p-thin'),
    },
    spots: { coque: [300, 234], trampoline: [236, 216], safran: [60, 280], barre: [118, 214], stick: [158, 172], mat: [218, 110], haubans: [192, 180], etai: [300, 160], trapeze: [182, 160], gv: [160, 140], lattes: [140, 84], foc: [276, 170], penons: [268, 124], cunningham: [218, 196], chariot: [76, 224], ecoutegv: [114, 178], ecoutefoc: [258, 200], boutdehors: [372, 222], spi: [330, 110], drisse: [222, 50] },
  },
  j80: {
    parts: {
      coque: `<path d="M50,212 L345,205 Q358,206 352,220 Q310,248 200,250 Q110,250 58,240 Z" class="p-hull"/>`,
      rouf: `<path d="M150,211 L166,194 L262,194 L278,209 Z" class="p-hull"/>`,
      quille: `<path d="M210,249 L238,249 L232,300 L214,300 Z" class="p-foil"/><ellipse cx="223" cy="304" rx="22" ry="7" class="p-foil"/>`,
      safran: `<path d="M60,238 L70,240 L64,300 L54,297 Z" class="p-foil"/>`,
      barre: line(62, 205, 140, 198, 'p-stick'),
      boutdehors: line(350, 207, 398, 203, 'p-spar-thin'),
      spi: `<path d="M228,24 Q340,60 397,203 Q320,170 292,112 Z" class="p-sail p-spi"/>`,
      mat: line(230, 205, 230, 8, 'p-spar'),
      haubans: line(230, 30, 214, 205),
      etai: line(230, 30, 348, 205),
      gv: `<path d="M228,12 Q160,82 98,178 L228,172 Z" class="p-sail"/>`,
      lattes: `${line(190, 60, 224, 62, 'p-batten')}${line(160, 100, 224, 102, 'p-batten')}${line(130, 140, 224, 142, 'p-batten')}`,
      foc: `<path d="M231,62 L343,203 L274,170 Z" class="p-sail"/>`,
      penons: `${line(285, 130, 293, 133, 'p-telltale')}`,
      bome: line(230, 174, 95, 181, 'p-spar'),
      halebas: line(230, 192, 204, 176),
      cunningham: `<circle cx="225" cy="164" r="3" class="p-ring"/>${line(225, 167, 225, 204, 'p-cunn')}`,
      chariot: `<rect x="96" y="203" width="40" height="4" rx="2" class="p-block"/>`,
      ecoutegv: `${line(113, 180, 113, 201, 'p-sheet')}${line(119, 180, 119, 201, 'p-sheet')}<circle cx="116" cy="200" r="4" class="p-block"/>`,
      ecoutefoc: `${line(274, 170, 266, 199, 'p-sheet')}<circle cx="266" cy="200" r="3.5" class="p-block"/>${line(262, 200, 160, 200, 'p-sheet p-dash')}`,
      winch: `<rect x="148" y="198" width="10" height="9" rx="2" class="p-block"/>`,
      taquet: `<rect x="318" y="202" width="14" height="4" rx="2" class="p-block"/>`,
      drisse: line(234, 12, 234, 196, 'p-thin'),
    },
    spots: { coque: [300, 232], rouf: [250, 202], quille: [223, 280], safran: [58, 280], barre: [80, 214], boutdehors: [378, 214], spi: [350, 120], mat: [238, 104], haubans: [218, 172], etai: [300, 150], gv: [168, 130], lattes: [150, 100], foc: [300, 172], penons: [292, 120], bome: [122, 186], halebas: [206, 186], cunningham: [244, 180], chariot: [112, 222], ecoutegv: [128, 190], ecoutefoc: [262, 186], winch: [156, 222], taquet: [325, 196], drisse: [242, 40] },
  },
};

export const profileParts = (boat) => Object.keys(PROFILES[boat].spots);

// numbers : ordre d'affichage des pastilles (index + 1)
export function profileSVG(boat) {
  const P = PROFILES[boat];
  const ids = profileParts(boat);
  const order = ['spi', 'coque', 'rouf', 'trampoline', 'derive', 'quille', 'safran', 'haubans', 'etai', 'trapeze', 'drisse', 'gv', 'lattes', 'foc', 'penons', 'mat', 'livarde', 'bome', 'boutdehors', 'halebas', 'cunningham', 'chariot', 'ecoutegv', 'ecoutefoc', 'coinceur', 'winch', 'taquet', 'barre', 'stick'];
  const drawn = order.filter((k) => P.parts[k]).map((k) => `<g class="part" data-part="${k}">${P.parts[k]}</g>`).join('');
  const spots = ids
    .map((k, i) => {
      const [x, y] = P.spots[k];
      return `<g class="spot" data-part="${k}" transform="translate(${x},${y})" tabindex="0" role="button" aria-label="${i + 1}. ${termById(k).term}"><circle r="9"/><text dy="3.5">${i + 1}</text></g>`;
    })
    .join('');
  return `<svg class="profile" viewBox="0 0 420 330" role="group" aria-label="Le bateau vu de profil, pièces numérotées">
    <rect x="0" y="${WATER}" width="420" height="${330 - WATER}" class="p-water"/>
    <line x1="0" y1="${WATER}" x2="420" y2="${WATER}" class="p-waterline"/>
    ${drawn}${spots}
  </svg>`;
}
