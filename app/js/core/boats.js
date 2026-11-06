// Les quatre bateaux proposés : performances (polaire, coût des manœuvres) et textes propres à chacun.
// Polaire : vitesses en nœuds pour les angles 40, 45, 50, 60, 75, 90, 105, 120, 135, 150, 165, 180°.

import { setUpwindLimits } from './angles.js';

// upwind : noGo = angle au vent (°) en dessous duquel le bateau est pincé et ralentit fort,
// pinch = angle où il s'arrête (vent debout). Le meilleur angle de remontée (VMG) en découle.
export const BOATS = {
  deriveur: {
    id: 'deriveur',
    name: 'Dériveur',
    long: 'Dériveur monocoque',
    example: 'Type 420, Laser, dériveur école',
    article: 'un dériveur',
    jib: true,
    turnPer90: 1.5, // s perdues par quart de tour de barre
    live: { length: 4.2, tau: 3.5, turnRate: 32 }, // m, s pour prendre sa vitesse, °/s à la barre
    upwind: { noGo: 40, pinch: 32 },
    level: 'Intermédiaire',
    pitch: 'Le bateau le plus polyvalent pour apprendre : grand-voile, foc, dérive et tous les réglages classiques.',
    perf: {
      light: {
        speeds: [2.0, 2.5, 2.7, 2.9, 3.1, 3.2, 3.3, 3.25, 3.1, 3.0, 2.65, 2.5],
        tack: 6, gybe: 4,
        hint: 'Peu de vent : chaque manœuvre fait perdre de l’élan, mais l’empannage est facile.',
      },
      medium: {
        speeds: [3.4, 4.2, 4.5, 4.8, 5.2, 5.5, 5.7, 5.6, 5.3, 5.0, 4.4, 4.0],
        tack: 5, gybe: 5,
        hint: 'Conditions idéales : le bateau accélère bien du près au largue.',
      },
      strong: {
        speeds: [3.6, 4.5, 4.9, 5.4, 6.4, 7.2, 7.6, 7.3, 6.6, 5.8, 5.0, 4.6],
        tack: 6, gybe: 12,
        hint: 'Ça planche au largue ! Mais l’empannage est risqué et coûte cher en temps.',
      },
    },
    downwindTip: (a) => `Plein vent arrière, un dériveur sans spi est lent. Au <b>grand largue</b> (≈ ${a}° du vent) avec un empannage, tu descends plus vite.`,
    heavyWeather: 'On <b>tire</b> ! Par vent fort, on <b>étarque le Cunningham</b> (tension du guindant) : le creux avance, le haut de la voile s’aplatit et s’ouvre, le bateau gîte moins. On tend aussi la bordure et le hale-bas. Si l’équipage ne tient plus le bateau à plat, on prend un ris (à terre). Par petit temps, au contraire, on <b>relâche</b> pour garder une voile creuse et puissante.',
    maneuverNote: '',
    trimNote: 'Tous les dériveurs n’ont pas de chariot ni de Cunningham : le principe reste le même avec les réglages disponibles.',
  },

  catamaran: {
    id: 'catamaran',
    name: 'Catamaran',
    long: 'Catamaran de sport',
    example: 'Type Hobie Cat 16',
    article: 'un catamaran',
    jib: true,
    turnPer90: 2.5, // grand rayon de giration : tourner coûte cher
    noBoom: true, // grand-voile sans bôme : elle est tenue par son écoute, au point d'écoute
    live: { length: 5.1, tau: 5, turnRate: 18 },
    upwind: { noGo: 44, pinch: 36 }, // un catamaran ne serre pas le vent : il cherche la vitesse
    level: 'Sensations',
    pitch: 'Deux coques, un trampoline et beaucoup de vitesse. Il remonte moins bien au vent, vire lentement, et descend en zigzag.',
    perf: {
      light: {
        speeds: [1.5, 3.0, 3.8, 4.6, 5.3, 5.8, 6.0, 5.9, 5.4, 4.6, 3.6, 3.0],
        tack: 9, gybe: 5,
        hint: 'Petit temps : le catamaran a peu d’élan pour virer. Abats un peu (tire la barre) pour garder de la vitesse.',
      },
      medium: {
        speeds: [2.5, 4.6, 6.0, 7.8, 9.6, 11.0, 12.0, 12.0, 11.0, 9.0, 6.8, 5.5],
        tack: 8, gybe: 5,
        hint: 'Une coque vole ! Le catamaran file au travers et au largue, deux fois plus vite qu’un dériveur.',
      },
      strong: {
        speeds: [3.0, 5.5, 7.2, 9.5, 12.5, 14.5, 16.0, 16.0, 14.5, 12.0, 8.5, 7.0],
        tack: 8, gybe: 6,
        hint: 'Vent fort : 16 nœuds au largue ! Attention à l’enfournement : poids à l’arrière au portant.',
      },
    },
    downwindTip: (a) => `Un catamaran ne descend jamais plein vent arrière : il perd toute sa vitesse. Descends en zigzag à ≈ ${a}° du vent et empanne : c’est beaucoup plus rapide.`,
    heavyWeather: 'On <b>tire</b> sur le <b>Cunningham</b>, à bloc : sur un catamaran c’est LE réglage de vent fort. Il ouvre le haut de la grand-voile qui « vrille » et laisse échapper le vent. On ouvre le chariot, on tourne moins le mât, et on choque l’écoute dans les rafales pour ne pas chavirer.',
    maneuverNote: 'Sur un catamaran, le virement est délicat : garde de la vitesse, ne pousse pas la barre à fond (les safrans freinent) et laisse le foc à contre un instant pour aider l’avant à passer. L’empannage, lui, est facile.',
    trimNote: 'Le Hobie 16 n’a pas de dérive : ses coques asymétriques empêchent le bateau de déraper.',
  },

  optimist: {
    id: 'optimist',
    name: 'Optimist',
    long: 'Optimist',
    example: 'Le bateau des débutants (jusqu’à 15 ans)',
    article: 'un Optimist',
    jib: false,
    turnPer90: 1, // pivote presque sur place
    live: { length: 2.3, tau: 2.5, turnRate: 42 },
    upwind: { noGo: 43, pinch: 35 },
    level: 'Débutant',
    pitch: 'Une seule voile, peu de réglages : idéal pour commencer. Petit et lent, mais très maniable.',
    perf: {
      light: {
        speeds: [1.3, 1.7, 1.9, 2.1, 2.3, 2.4, 2.4, 2.35, 2.25, 2.15, 2.0, 1.9],
        tack: 4, gybe: 3,
        hint: 'Petit temps : bouge doucement dans le bateau, chaque mouvement brusque le freine.',
      },
      medium: {
        speeds: [2.3, 2.9, 3.1, 3.3, 3.6, 3.8, 3.9, 3.85, 3.7, 3.5, 3.3, 3.1],
        tack: 4, gybe: 4,
        hint: 'L’Optimist vire vite et facilement : n’hésite pas à tirer des bords.',
      },
      strong: {
        speeds: [2.4, 3.1, 3.3, 3.6, 4.2, 4.6, 4.8, 4.7, 4.4, 4.1, 3.8, 3.6],
        tack: 5, gybe: 8,
        hint: 'Vent fort : rappel à fond et choque dans les rafales. L’empannage peut faire dessaler !',
      },
    },
    downwindTip: (a) => `Au portant, l’Optimist va presque aussi vite au vent arrière qu’au grand largue : vise ≈ ${a}° du vent et évite les empannages inutiles.`,
    heavyWeather: 'L’Optimist n’a pas de Cunningham. Par vent fort, on <b>tend la livarde</b> et le <b>hale-bas</b> pour aplatir la voile, on remonte un peu la dérive et on choque dans les rafales. Par petit temps, on relâche pour garder du creux.',
    maneuverNote: 'En Optimist, on passe sous la bôme en restant bien accroupi, et on change de main sur la barre et l’écoute après chaque manœuvre.',
    trimNote: 'Sur un Optimist, concentre-toi d’abord sur l’écoute et la dérive : ce sont les deux réglages qui comptent le plus.',
  },
};

BOATS.j80 = {
  id: 'j80',
  name: 'J80',
  long: 'Quillard de sport J80',
  example: 'Voilier de 8 m à quille, 4 à 5 équipiers',
  article: 'un J80',
  jib: true,
  spinnaker: true,
  keel: true, // quille de 1,5 m : touche les hauts-fonds
  turnPer90: 2, // bateau lourd : il faut garder de l'erre dans les virages
  live: { length: 8, tau: 7, turnRate: 20 },
  upwind: { noGo: 36, pinch: 29 }, // quille et foc bien établi : remonte à 38–43° (ORC)
  level: 'Équipage',
  pitch: 'Un vrai voilier de régate : quille, foc et grand spi asymétrique au portant. On navigue en équipe, chacun à son poste.',
  // Polaire recalée sur le certificat ORC One Design J/80 2023 (data.orc.org), voir tools/data/polars-report.md
  perf: {
    light: {
      speeds: [4.05, 4.63, 4.9, 5.25, 5.39, 5.48, 5.58, 5.49, 4.97, 4.24, 3.67, 3.5],
      tack: 6, gybe: 6,
      hint: 'Petit temps : le J80 garde bien son erre grâce à sa quille. Envoie le spi dès que tu passes le travers.',
    },
    medium: {
      speeds: [5.84, 6.06, 6.27, 6.55, 6.78, 6.88, 7.13, 7.44, 7.31, 6.66, 5.77, 5.6],
      tack: 5, gybe: 7,
      hint: 'Vent moyen : sous spi asymétrique, le J80 descend vite en zigzag au grand largue.',
    },
    strong: {
      speeds: [5.93, 6.16, 6.4, 6.75, 7.21, 7.76, 8.19, 9.17, 11.05, 10.17, 9, 7],
      tack: 6, gybe: 12,
      hint: 'Vent fort : le J80 part au planing sous spi ! Mais l’empannage du spi demande un équipage bien coordonné.',
    },
  },
  downwindTip: (a) => `Sous spi asymétrique, un J80 ne descend pas plein vent arrière : il lofe (barre poussée) à ≈ ${a}° du vent pour garder le spi gonflé et empanne. C’est bien plus rapide.`,
  heavyWeather: 'Sur un J80, on <b>tire</b> sur le <b>Cunningham</b> et le <b>hale-bas</b> pour aplatir la grand-voile, on <b>descend le chariot</b> sous le vent, et on <b>tend le gréement</b> (les haubans) avant de partir. Au portant, on n’envoie le spi que si l’équipage est prêt, et on le choque dans les rafales.',
  maneuverNote: 'Sur un J80, chaque manœuvre se fait en équipe : le barreur annonce, le numéro 1 (à l’avant) prépare le spi, le piano gère les drisses, le régleur borde. Pour empanner sous spi, on fait passer le spi par l’avant du foc.',
  trimNote: 'Sur le J80, la tension du gréement se règle à terre selon la force du vent (tableau de réglage de la classe).',
};

// Textes génériques (« la bôme est de l'autre côté ») adaptés au bateau sans bôme.
export const boomless = (s) =>
  getBoat().noBoom ? s.replace(/([Ll])a bôme/g, '$1a grand-voile').replace(/Bôme/g, 'Grand-voile').replace(/bôme/g, 'grand-voile') : s;

export const BOAT_LIST = [BOATS.optimist, BOATS.deriveur, BOATS.catamaran, BOATS.j80];

let current = 'deriveur';
export const setBoat = (id) => {
  if (BOATS[id]) current = id;
  setUpwindLimits(BOATS[current].upwind.noGo, BOATS[current].upwind.pinch);
};
export const boatId = () => current;
export const getBoat = () => BOATS[current];
