// Réglages par bateau, par allure et par force de vent. Valeurs de 1 à 5 sur l'échelle de chaque réglage.
import { boatId } from '../core/boats.js';
import { bestVmgAngles } from '../core/polar.js';

// ---------------------------------------------------------------- Dériveur (420, Laser…)

const DERIVEUR_CONTROLS = [
  {
    id: 'ecoute', name: 'Écoute de GV', what: 'Ouvre ou ferme la grand-voile',
    scale: ['Choquée', 'Mi-bordée', 'Bordée'],
    rule: 'Plus on s’éloigne du vent, plus on choque. Règle d’or : choquer jusqu’à ce que le guindant faseye, puis border juste assez pour qu’il s’arrête.',
  },
  {
    id: 'chariot', name: 'Chariot / barre d’écoute', what: 'Déplace le point d’écoute vers le bord',
    scale: ['Sous le vent', 'Centré', 'Au vent'],
    rule: 'Au vent par petit temps pour garder la bôme dans l’axe, sous le vent par vent fort pour déventer sans ouvrir le haut de la voile. Au portant, il n’a presque plus d’effet.',
  },
  {
    id: 'halebas', name: 'Hale-bas', what: 'Retient la bôme vers le bas',
    scale: ['Mou', 'Moyen', 'Très tendu'],
    rule: 'Mou par petit temps (la voile respire et vrille), tendu quand le vent forcit : la voile s’aplatit et la bôme ne monte pas quand on choque.',
  },
  {
    id: 'cunningham', name: 'Cunningham', what: 'Tension du guindant (bord avant)',
    scale: ['Relâché', 'Moyen', 'Étarqué'],
    rule: 'Tirer sur le Cunningham avance le creux et aplatit le haut de la voile. Par vent fort, on l’étarque à bloc ; par petit temps on le relâche (quelques plis sont acceptés).',
  },
  {
    id: 'bordure', name: 'Bordure', what: 'Tension du bas de la voile',
    scale: ['Relâchée', 'Moyenne', 'Tendue'],
    rule: 'Bordure relâchée = du creux en bas = de la puissance (petit temps, portant). Bordure tendue = voile plate = moins de gîte (vent fort au près).',
  },
  {
    id: 'foc', name: 'Écoute de foc', what: 'Ouvre ou ferme le foc',
    scale: ['Choquée', 'Mi-bordée', 'Bordée'],
    rule: 'Même logique que la grand-voile. Les penons du foc doivent filer droit des deux côtés.',
  },
  {
    id: 'derive', name: 'Dérive', what: 'Empêche le bateau de déraper',
    scale: ['Haute', 'Mi-hauteur', 'Basse'],
    rule: 'Basse au près (elle empêche de déraper), remontée progressivement en s’éloignant du vent. Au vent arrière presque haute (moins de frottement), mais garde un peu de dérive pour la stabilité.',
  },
];

export const TRIM_ALLURES = [
  // au près, le bateau se place à son meilleur angle de remontée (propre à chaque bateau)
  { id: 'pres', label: 'Près', get heading() { return Math.round(bestVmgAngles('medium').up.angle); }, sub: 'Près serré / bon plein' },
  { id: 'travers', label: 'Travers', heading: 90, sub: 'Vent à 90°' },
  { id: 'largue', label: 'Largue', heading: 120, sub: 'Vent à 120°' },
  { id: 'portant', label: 'Portant', heading: 160, sub: 'Grand largue / vent arrière' },
];

export const TRIM_WINDS = [
  { id: 'light', label: 'Petit temps', sub: '< 8 nœuds', emoji: '🍃' },
  { id: 'medium', label: 'Vent moyen', sub: '8 – 15 nœuds', emoji: '🌬️' },
  { id: 'strong', label: 'Vent fort', sub: '> 15 nœuds', emoji: '💨' },
];

const DERIVEUR_TRIM = {
  pres: {
    light: {
      v: { ecoute: 4, chariot: 4, halebas: 1, cunningham: 1, bordure: 2, foc: 4, derive: 5 },
      depth: 0.17,
      crew: 'Poids vers l’avant et légèrement sous le vent : un peu de gîte aide la voile à prendre sa forme et réduit la surface mouillée.',
      key: 'Chercher la puissance : voiles creuses, sans les écraser. Barrer en douceur.',
    },
    medium: {
      v: { ecoute: 5, chariot: 3, halebas: 3, cunningham: 3, bordure: 3, foc: 5, derive: 5 },
      depth: 0.13,
      crew: 'Au rappel, bateau à plat. Poids au niveau du mât.',
      key: 'Voiles bordées, bôme dans l’axe, plis du guindant juste effacés au Cunningham.',
    },
    strong: {
      v: { ecoute: 4, chariot: 1, halebas: 5, cunningham: 5, bordure: 5, foc: 4, derive: 4 },
      depth: 0.07,
      crew: 'Rappel à fond, poids un peu reculé. Le bateau doit rester à plat : choquer la GV dans chaque risée.',
      key: 'Aplatir et déventer : Cunningham, bordure et hale-bas à bloc, chariot sous le vent, dérive légèrement remontée. Si le bateau reste trop gîté, prendre un ris (à terre sur un dériveur).',
    },
  },
  travers: {
    light: {
      v: { ecoute: 3, chariot: 3, halebas: 2, cunningham: 1, bordure: 2, foc: 3, derive: 3 },
      depth: 0.17,
      crew: 'Équipage centré, bateau à plat.',
      key: 'Choquer jusqu’au faseyement puis border un peu. Dérive à mi-hauteur.',
    },
    medium: {
      v: { ecoute: 3, chariot: 2, halebas: 3, cunningham: 2, bordure: 2, foc: 3, derive: 3 },
      depth: 0.15,
      crew: 'Au rappel, poids légèrement reculé pour libérer l’avant.',
      key: 'Allure rapide : régler finement aux penons et suivre les variations du vent.',
    },
    strong: {
      v: { ecoute: 2, chariot: 1, halebas: 4, cunningham: 4, bordure: 4, foc: 2, derive: 2 },
      depth: 0.1,
      crew: 'Tout le monde au rappel et reculé : le bateau part au planing !',
      key: 'Jouer l’écoute en permanence : choquer dans les rafales pour éviter le départ au lof. Remonter la dérive réduit la gîte.',
    },
  },
  largue: {
    light: {
      v: { ecoute: 2, chariot: 2, halebas: 2, cunningham: 1, bordure: 1, foc: 2, derive: 2 },
      depth: 0.19,
      crew: 'Équipage centré, éviter les mouvements brusques.',
      key: 'Voiles choquées et creuses. Dérive remontée aux deux tiers.',
    },
    medium: {
      v: { ecoute: 2, chariot: 1, halebas: 3, cunningham: 1, bordure: 2, foc: 2, derive: 2 },
      depth: 0.17,
      crew: 'Poids reculé, bateau à plat.',
      key: 'Hale-bas repris pour empêcher la bôme de monter. Surveiller les penons.',
    },
    strong: {
      v: { ecoute: 2, chariot: 1, halebas: 4, cunningham: 3, bordure: 3, foc: 2, derive: 2 },
      depth: 0.13,
      crew: 'Tout à l’arrière, rappel. Abattre (tirer la barre) dans les rafales pour rester à plat et planer.',
      key: 'Le hale-bas tendu garde la voile efficace quand on choque. Choquer franchement dans les risées.',
    },
  },
  portant: {
    light: {
      v: { ecoute: 1, chariot: 2, halebas: 2, cunningham: 1, bordure: 1, foc: 1, derive: 1 },
      depth: 0.2,
      crew: 'Équipage au centre ou un peu en avant. Un peu de gîte au vent peut équilibrer la barre.',
      key: 'Bôme presque perpendiculaire au bateau (sans toucher les haubans). Foc en ciseaux au vent arrière.',
    },
    medium: {
      v: { ecoute: 1, chariot: 1, halebas: 3, cunningham: 1, bordure: 2, foc: 1, derive: 2 },
      depth: 0.18,
      crew: 'Poids reculé, bateau à plat.',
      key: 'Hale-bas tenu pour limiter le roulis. Dérive au quart pour la stabilité. Attention à l’empannage involontaire !',
    },
    strong: {
      v: { ecoute: 2, chariot: 1, halebas: 3, cunningham: 2, bordure: 3, foc: 1, derive: 2 },
      depth: 0.15,
      crew: 'Tout à l’arrière. Rester au grand largue plutôt que plein vent arrière : moins de roulis, moins de risque d’empannage.',
      key: 'Hale-bas moyen (trop tendu, la bôme accroche l’eau). Un peu plus de dérive pour amortir le roulis. Empanner seulement dans une accalmie, ou virer de bord au lieu d’empanner.',
    },
  },
};

// ---------------------------------------------------------------- Catamaran (Hobie Cat 16)
const CAT_CONTROLS = [
  {
    id: 'ecoute', name: 'Écoute de GV', what: 'Palan d’écoute de la grand-voile',
    scale: ['Choquée', 'Mi-bordée', 'Bordée'],
    rule: 'Au près, l’écoute est bordée fort : c’est le chariot qu’on joue. Au largue, on choque jusqu’à ce que les penons du guindant filent.',
  },
  {
    id: 'chariot', name: 'Chariot de GV', what: 'Barre d’écoute entre les deux coques',
    scale: ['Ouvert (au bout)', 'Mi-course', 'Centré'],
    rule: 'Centré au près par vent faible et moyen. On l’ouvre de 10 à 20 cm par vent fort, et en grand au largue et au portant.',
  },
  {
    id: 'cunningham', name: 'Cunningham', what: 'Étarquage du guindant de la grand-voile',
    scale: ['Relâché', 'Moyen', 'À bloc'],
    rule: 'LE réglage de vent fort d’un catamaran : à bloc, il ouvre le haut de la voile qui laisse échapper le vent. Relâché par petit temps et au portant.',
  },
  {
    id: 'bordure', name: 'Bordure', what: 'Tension du bas de la voile',
    scale: ['Relâchée', 'Moyenne', 'Tendue'],
    rule: 'Relâchée pour la puissance (petit temps, portant), tendue pour aplatir la voile au près dans la brise.',
  },
  {
    id: 'rotation', name: 'Rotation du mât', what: 'Le mât tourne pour prolonger la voile',
    scale: ['Peu tourné', 'Moyen', 'Très tourné'],
    rule: 'Plus le mât est tourné, plus la voile est creuse et puissante. On le tourne beaucoup par petit temps et au portant, moins par vent fort au près.',
  },
  {
    id: 'foc', name: 'Écoute de foc', what: 'Ouvre ou ferme le foc',
    scale: ['Choquée', 'Mi-bordée', 'Bordée'],
    rule: 'Le foc guide le vent dans la grand-voile : penons droits des deux côtés. Au vent arrière, il est presque inutile.',
  },
  {
    id: 'equipage', name: 'Position de l’équipage', what: 'Avant / arrière sur le trampoline',
    scale: ['À l’avant', 'Au centre', 'À l’arrière'],
    rule: 'En avant par petit temps (les sterns ne traînent pas), en arrière dès que ça accélère pour éviter que les étraves plantent (l’enfournement).',
  },
];

const CAT_TRIM = {
  pres: {
    light: { v: { ecoute: 4, chariot: 5, cunningham: 1, bordure: 2, rotation: 4, foc: 4, equipage: 1 }, depth: 0.16,
      crew: 'Équipage à l’avant, sur la coque sous le vent : la coque au vent se soulage.',
      key: 'Chercher la vitesse avant le cap : un catamaran remonte à ≈ 50–55° du vent, pas plus serré.' },
    medium: { v: { ecoute: 5, chariot: 5, cunningham: 3, bordure: 3, rotation: 3, foc: 5, equipage: 2 }, depth: 0.13,
      crew: 'Au trapèze dès que la coque au vent décolle : la faire voler juste au ras de l’eau.',
      key: 'Écoute bordée, chariot centré, et on vole sur une coque en gardant le bateau stable.' },
    strong: { v: { ecoute: 5, chariot: 3, cunningham: 5, bordure: 5, rotation: 2, foc: 4, equipage: 4 }, depth: 0.07,
      crew: 'Les deux au trapèze, reculés. Choquer l’écoute dans chaque rafale pour ne pas chavirer.',
      key: 'Cunningham à bloc, chariot ouvert, mât moins tourné : la voile s’aplatit et vrille.' },
  },
  travers: {
    light: { v: { ecoute: 3, chariot: 3, cunningham: 1, bordure: 2, rotation: 4, foc: 3, equipage: 2 }, depth: 0.17,
      crew: 'Équipage au centre, poids sous le vent pour soulager la coque au vent.',
      key: 'Choquer jusqu’au faseyement, border un peu : le catamaran accélère tout de suite.' },
    medium: { v: { ecoute: 3, chariot: 2, cunningham: 2, bordure: 2, rotation: 4, foc: 3, equipage: 3 }, depth: 0.15,
      crew: 'Au trapèze, poids reculé.',
      key: 'Allure la plus rapide : jouer l’écoute en permanence pour garder la coque en l’air.' },
    strong: { v: { ecoute: 2, chariot: 1, cunningham: 4, bordure: 4, rotation: 3, foc: 2, equipage: 5 }, depth: 0.1,
      crew: 'Tout le monde à l’arrière : risque d’enfournement !',
      key: 'Choquer franchement dans les rafales (l’écoute, puis le chariot) si la coque monte trop. N’abattre qu’une fois au largue.' },
  },
  largue: {
    light: { v: { ecoute: 2, chariot: 1, cunningham: 1, bordure: 1, rotation: 5, foc: 2, equipage: 2 }, depth: 0.19,
      crew: 'Équipage au centre, sans à-coups.',
      key: 'Voiles choquées, mât bien tourné : de la puissance.' },
    medium: { v: { ecoute: 2, chariot: 1, cunningham: 1, bordure: 2, rotation: 5, foc: 2, equipage: 4 }, depth: 0.17,
      crew: 'Poids reculé, éventuellement au trapèze.',
      key: 'Chariot ouvert, on règle à l’écoute. Le catamaran file à plus de 10 nœuds.' },
    strong: { v: { ecoute: 2, chariot: 1, cunningham: 3, bordure: 3, rotation: 4, foc: 2, equipage: 5 }, depth: 0.13,
      crew: 'Tout à l’arrière, prêts à choquer.',
      key: 'Abattre (tirer la barre) dans les rafales, garder les étraves hors de l’eau.' },
  },
  portant: {
    light: { v: { ecoute: 1, chariot: 1, cunningham: 1, bordure: 1, rotation: 5, foc: 1, equipage: 2 }, depth: 0.2,
      crew: 'Équipage en avant, sur la coque sous le vent.',
      key: 'Ne descends pas plein vent arrière : un catamaran descend en zigzag (≈ 140–150° du vent) en empannant.' },
    medium: { v: { ecoute: 1, chariot: 1, cunningham: 1, bordure: 2, rotation: 5, foc: 1, equipage: 4 }, depth: 0.18,
      crew: 'Poids reculé.',
      key: 'Chariot en bout, mât tourné à fond. Empanner est facile : pas d’hésitation.' },
    strong: { v: { ecoute: 2, chariot: 1, cunningham: 2, bordure: 3, rotation: 4, foc: 1, equipage: 5 }, depth: 0.15,
      crew: 'Tout le monde collé à l’arrière.',
      key: 'Poids tout à l’arrière contre l’enfournement. Empanner en vitesse, bateau à plat.' },
  },
};

// ---------------------------------------------------------------- Optimist (4 réglages seulement)
const OPTI_CONTROLS = [
  {
    id: 'ecoute', name: 'Écoute', what: 'Ouvre ou ferme la voile',
    scale: ['Choquée', 'Mi-bordée', 'Bordée'],
    rule: 'Le réglage le plus important ! Plus on s’éloigne du vent, plus on choque. Choque jusqu’à ce que la voile faseye, puis borde juste assez.',
  },
  {
    id: 'derive', name: 'Dérive', what: 'Empêche le bateau de déraper',
    scale: ['Haute', 'Mi-hauteur', 'Basse'],
    rule: 'Basse au près, à moitié au travers, presque haute au vent arrière (garde-en un peu pour la stabilité).',
  },
  {
    id: 'livarde', name: 'Livarde', what: 'Vergue en diagonale qui tend la voile',
    scale: ['Détendue', 'Moyenne', 'Tendue'],
    rule: 'Réglée pour qu’il n’y ait aucun pli en diagonale dans la voile. Un peu plus tendue par vent fort.',
  },
  {
    id: 'halebas', name: 'Hale-bas', what: 'Retient la bôme vers le bas',
    scale: ['Mou', 'Moyen', 'Tendu'],
    rule: 'Mou par petit temps, tendu par vent fort pour aplatir la voile et empêcher la bôme de monter.',
  },
];

const OPTI_TRIM = {
  pres: {
    light: { v: { ecoute: 4, derive: 5, livarde: 3, halebas: 1 }, depth: 0.17,
      crew: 'Assis au centre ou un peu sous le vent, poids vers l’avant.',
      key: 'Voile creuse, écoute pas trop bordée : le bateau doit avancer avant de remonter.' },
    medium: { v: { ecoute: 5, derive: 5, livarde: 3, halebas: 3 }, depth: 0.13,
      crew: 'Au rappel, bateau à plat, poids près du mât.',
      key: 'Écoute bordée, dérive basse, bateau bien à plat.' },
    strong: { v: { ecoute: 4, derive: 4, livarde: 4, halebas: 5 }, depth: 0.08,
      crew: 'Rappel maximal, poids un peu reculé.',
      key: 'Hale-bas tendu, choquer dans les rafales, dérive légèrement remontée pour moins gîter.' },
  },
  travers: {
    light: { v: { ecoute: 3, derive: 3, livarde: 3, halebas: 1 }, depth: 0.17,
      crew: 'Au centre, sans bouger.',
      key: 'Choque jusqu’au faseyement puis borde un peu. Dérive à mi-hauteur.' },
    medium: { v: { ecoute: 3, derive: 3, livarde: 3, halebas: 2 }, depth: 0.15,
      crew: 'Au rappel, bateau à plat.',
      key: 'Suis les penons de la voile.' },
    strong: { v: { ecoute: 2, derive: 2, livarde: 4, halebas: 4 }, depth: 0.11,
      crew: 'Rappel, poids reculé.',
      key: 'Choque franchement dans les rafales pour rester à plat.' },
  },
  largue: {
    light: { v: { ecoute: 2, derive: 2, livarde: 3, halebas: 1 }, depth: 0.19,
      crew: 'Au centre, sans à-coups.',
      key: 'Voile choquée, dérive remontée aux deux tiers.' },
    medium: { v: { ecoute: 2, derive: 2, livarde: 3, halebas: 2 }, depth: 0.17,
      crew: 'Poids reculé.',
      key: 'Hale-bas repris pour garder la bôme basse.' },
    strong: { v: { ecoute: 2, derive: 2, livarde: 3, halebas: 3 }, depth: 0.14,
      crew: 'Tout à l’arrière, rappel.',
      key: 'L’Optimist part au surf : abats (tire la barre) dans les vagues, choque dans les rafales.' },
  },
  portant: {
    light: { v: { ecoute: 1, derive: 1, livarde: 3, halebas: 1 }, depth: 0.2,
      crew: 'Au centre, avec une petite gîte au vent : la voile se place toute seule.',
      key: 'Bôme presque perpendiculaire au bateau, dérive presque haute.' },
    medium: { v: { ecoute: 1, derive: 1, livarde: 3, halebas: 2 }, depth: 0.18,
      crew: 'Poids reculé, petite gîte au vent.',
      key: 'Attention à l’empannage involontaire : surveille la bôme !' },
    strong: { v: { ecoute: 1, derive: 2, livarde: 3, halebas: 3 }, depth: 0.15,
      crew: 'Tout à l’arrière, prêt à réagir.',
      key: 'Un peu plus de dérive pour limiter le roulis. Empanner seulement dans une accalmie.' },
  },
};

// ---------------------------------------------------------------- J80 (quillard de sport)
const J80_CONTROLS = [
  {
    id: 'ecoute', name: 'Écoute de GV', what: 'Ouvre ou ferme la grand-voile',
    scale: ['Choquée', 'Mi-bordée', 'Bordée'],
    rule: 'Au près, bordée jusqu’à ce que le penon de chute (en haut) décroche de temps en temps. Plus on abat (barre tirée), plus on choque.',
  },
  {
    id: 'chariot', name: 'Chariot de GV', what: 'Barre d’écoute dans le cockpit',
    scale: ['Sous le vent', 'Centré', 'Au vent'],
    rule: 'Au vent par petit temps pour garder la bôme dans l’axe, sous le vent dans la brise pour réduire la gîte sans ouvrir la chute.',
  },
  {
    id: 'halebas', name: 'Hale-bas', what: 'Retient la bôme vers le bas',
    scale: ['Mou', 'Moyen', 'Très tendu'],
    rule: 'Mou au près par petit temps. Repris au portant pour que la bôme ne monte pas, et dans la brise pour aplatir la voile.',
  },
  {
    id: 'greement', name: 'Tension du gréement', what: 'Haubans réglés à terre',
    scale: ['Souple', 'Moyenne', 'Tendue'],
    rule: 'Réglée avant de partir selon la force du vent : souple par petit temps (voiles creuses), tendue dans la brise (le mât plie moins, l’étai reste droit).',
  },
  {
    id: 'foc', name: 'Écoute de foc', what: 'Ouvre ou ferme le foc',
    scale: ['Choquée', 'Mi-bordée', 'Bordée'],
    rule: 'Penons du foc qui filent droit des deux côtés. Au portant sous spi, le foc est enroulé.',
  },
  {
    id: 'spi', name: 'Spi asymétrique', what: 'Grande voile d’avant sur le bout-dehors',
    scale: ['Rangé', 'Prêt à envoyer', 'Envoyé'],
    rule: 'Envoyé dès qu’on dépasse le travers (plus tôt par petit temps). On le règle en permanence : choquer jusqu’à ce que le guindant « frisotte », puis border un peu.',
  },
  {
    id: 'equipage', name: 'Position de l’équipage', what: 'Rappel et placement avant / arrière',
    scale: ['Sous le vent / avant', 'Au centre', 'Au rappel / arrière'],
    rule: 'Petit temps : équipage groupé vers l’avant, un peu sous le vent. Dans la brise : tout le monde au rappel, poids reculé au portant pour planer.',
  },
];

const J80_TRIM = {
  pres: {
    light: { v: { ecoute: 4, chariot: 4, halebas: 1, greement: 1, foc: 4, spi: 1, equipage: 1 }, depth: 0.17,
      crew: 'Équipage groupé au pied du mât, un peu sous le vent.',
      key: 'Gréement souple, voiles creuses, bateau légèrement gîté : chercher la vitesse.' },
    medium: { v: { ecoute: 5, chariot: 3, halebas: 3, greement: 3, foc: 5, spi: 1, equipage: 5 }, depth: 0.13,
      crew: 'Tout le monde au rappel, bateau à plat.',
      key: 'Bôme dans l’axe, foc bordé, on barre aux penons.' },
    strong: { v: { ecoute: 4, chariot: 1, halebas: 5, greement: 5, foc: 4, spi: 1, equipage: 5 }, depth: 0.07,
      crew: 'Rappel maximal, jambes dehors.',
      key: 'Gréement tendu, Cunningham et hale-bas à bloc, chariot sous le vent, choquer la GV dans les rafales.' },
  },
  travers: {
    light: { v: { ecoute: 3, chariot: 3, halebas: 2, greement: 1, foc: 3, spi: 2, equipage: 2 }, depth: 0.17,
      crew: 'Équipage centré.',
      key: 'Choquer jusqu’au faseyement, border un peu. Préparer le spi pour la suite.' },
    medium: { v: { ecoute: 3, chariot: 2, halebas: 3, greement: 3, foc: 3, spi: 2, equipage: 4 }, depth: 0.15,
      crew: 'Au rappel.',
      key: 'Le spi asymétrique peut porter dès le travers par vent faible à moyen.' },
    strong: { v: { ecoute: 2, chariot: 1, halebas: 4, greement: 5, foc: 2, spi: 1, equipage: 5 }, depth: 0.1,
      crew: 'Rappel maximal.',
      key: 'Trop de vent pour le spi au travers : on reste sous GV et foc et on choque dans les risées.' },
  },
  largue: {
    light: { v: { ecoute: 2, chariot: 2, halebas: 2, greement: 1, foc: 1, spi: 5, equipage: 2 }, depth: 0.19,
      crew: 'Équipage vers l’avant, sous le vent pour aider le spi à se gonfler.',
      key: 'Spi envoyé, foc enroulé : lofer légèrement (pousser un peu la barre) pour garder la vitesse.' },
    medium: { v: { ecoute: 2, chariot: 1, halebas: 3, greement: 3, foc: 1, spi: 5, equipage: 4 }, depth: 0.17,
      crew: 'Poids reculé, au rappel.',
      key: 'Le régleur de spi joue l’écoute en continu, le barreur suit les surventes.' },
    strong: { v: { ecoute: 2, chariot: 1, halebas: 4, greement: 5, foc: 1, spi: 5, equipage: 5 }, depth: 0.14,
      crew: 'Tout le monde à l’arrière et au rappel.',
      key: 'Planing ! Abattre (tirer la barre) dans les rafales, choquer spi et GV ensemble pour éviter le départ au lof.' },
  },
  portant: {
    light: { v: { ecoute: 1, chariot: 2, halebas: 2, greement: 1, foc: 1, spi: 5, equipage: 2 }, depth: 0.2,
      crew: 'Équipage vers l’avant, gîte légère sous le vent.',
      key: 'Ne descends pas plein vent arrière : le spi asymétrique se dégonfle. Lofe (pousse la barre) vers 145–155° et empanne.' },
    medium: { v: { ecoute: 1, chariot: 1, halebas: 3, greement: 3, foc: 1, spi: 5, equipage: 3 }, depth: 0.18,
      crew: 'Poids centré à reculé.',
      key: 'Empanner en faisant passer le spi par l’avant : le numéro 1 aide le point d’écoute à passer.' },
    strong: { v: { ecoute: 2, chariot: 1, halebas: 4, greement: 5, foc: 1, spi: 5, equipage: 5 }, depth: 0.15,
      crew: 'Tout à l’arrière.',
      key: 'Empanner seulement dans une accalmie, à pleine vitesse : le bateau est moins chargé.' },
  },
};

const TRIMS = {
  deriveur: { controls: DERIVEUR_CONTROLS, table: DERIVEUR_TRIM },
  catamaran: { controls: CAT_CONTROLS, table: CAT_TRIM },
  optimist: { controls: OPTI_CONTROLS, table: OPTI_TRIM },
  j80: { controls: J80_CONTROLS, table: J80_TRIM },
};

// Réglages du bateau sélectionné.
export const getTrim = (id = boatId()) => TRIMS[id];

// Pour le quiz : on accepte la réponse si elle est à moins d'un cran de la valeur conseillée.
export const BUCKET_VALUES = [1.5, 3, 4.5];
export const answerOk = (bucket, value) => Math.abs(BUCKET_VALUES[bucket] - value) <= 1.01;
