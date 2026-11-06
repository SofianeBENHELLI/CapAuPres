// Les trois nœuds essentiels du matelotage. points : tracé de la corde (du dormant vers le bout),
// over : segments (Pi→Pi+1) qui passent dessus à leurs croisements (voir ui/rope.js),
// steps : upto = index du point atteint à cette étape (la dernière montre le nœud fini).

const CLEAT = `
  <path d="M28,125 Q28,103 58,106 L242,106 Q272,103 272,125 Q272,147 242,144 L58,144 Q28,147 28,125 Z" class="cleat"/>
  <rect x="118" y="100" width="64" height="50" rx="10" class="cleat-base"/>
  <circle cx="134" cy="125" r="4" class="cleat-screw"/><circle cx="166" cy="125" r="4" class="cleat-screw"/>`;

export const KNOTS = [
  {
    id: 'huit',
    name: 'Nœud de huit',
    emoji: '8️⃣',
    use: 'Le nœud d’arrêt : au bout d’une écoute ou d’une drisse, il l’empêche de s’échapper d’une poulie ou d’un taquet coinceur.',
    tip: 'Il doit dessiner un beau « 8 ». Il se défait facilement, même après avoir été très serré.',
    viewBox: '0 0 312 351',
    points: [[156, 8], [156, 78], [156, 143], [156, 208], [182, 266], [143, 307], [91, 280], [104, 228], [195, 169], [224, 130], [211, 88], [176, 72], [117, 78], [83, 125], [110, 195], [150, 260], [169, 341]],
    over: [0, 1, 4, 7, 14],
    steps: [
      { upto: 8, text: 'Avec le bout (le « courant »), fais une boucle qui passe <b>par-dessus</b> le dormant.' },
      { upto: 13, text: 'Fais passer le bout <b>derrière</b> le dormant.' },
      { upto: 16, text: 'Puis rentre dans la boucle <b>par-dessus</b> et ressors par-dessous.' },
      { text: 'Serre en tirant les deux brins : un <b>8</b> apparaît. Laisse dépasser un bout de 5 cm.' },
    ],
  },
  {
    id: 'chaise',
    name: 'Nœud de chaise',
    emoji: '🪑',
    use: 'La boucle fixe qui ne glisse pas et ne serre pas : pour attacher une écoute à la voile, amarrer le bateau à un anneau, ou faire une boucle de sauvetage.',
    tip: '« Le lapin sort du terrier, fait le tour de l’arbre et rentre dans le terrier. » Le terrier est la petite boucle, l’arbre est le dormant, le lapin est le bout.',
    viewBox: '20 -10 200 345',
    points: [[140, 0], [140, 50], [139, 100], [130, 160], [80, 165], [62, 120], [95, 92], [170, 140], [190, 200], [185, 265], [140, 320], [90, 290], [78, 235], [92, 205], [98, 140], [104, 60], [160, 30], [182, 50], [172, 78], [118, 98], [115, 135], [112, 190], [110, 235]],
    over: [0, 3, 6, 14, 18, 19],
    steps: [
      { upto: 7, text: 'Fais une petite boucle dans le dormant, le brin du bout <b>par-dessus</b> : c’est le <b>terrier</b>.' },
      { upto: 15, text: 'Laisse une grande boucle, puis le <b>lapin</b> (le bout) sort du terrier <b>par en dessous</b>…' },
      { upto: 18, text: '…fait le tour de l’<b>arbre</b> (le dormant) <b>par derrière</b>…' },
      { text: '…et rentre dans le terrier. Serre en tenant le bout contre la grande boucle : elle ne glissera plus.' },
    ],
  },
  {
    id: 'taquet',
    name: 'Nœud de taquet',
    emoji: '⚓',
    use: 'Pour bloquer une amarre ou une drisse sur un taquet. Il tient fort et se défait en une seconde, même sous tension.',
    tip: 'Tour mort, « 8 », demi-clé : pas plus ! Trop de tours empêchent de larguer vite. Le dernier brin finit parallèle à la première diagonale.',
    viewBox: '0 40 290 230',
    decor: CLEAT,
    points: [[20, 252], [90, 207], [160, 172], [200, 160], [208, 125], [196, 100], [150, 96], [104, 100], [92, 125], [104, 158], [128, 162], [200, 92], [228, 100], [236, 125], [226, 152], [196, 160], [100, 92], [72, 100], [64, 125], [74, 152], [110, 176], [215, 108], [236, 92]],
    front: [[10, 11], [15, 16], [20, 22]],
    over: [15],
    steps: [
      { upto: 9, text: '<b>Tour mort</b> : la corde fait le tour du pied du taquet, en passant sous les deux cornes.' },
      { upto: 16, text: '<b>Un 8</b> : croise par-dessus le taquet en diagonale, passe sous l’autre corne, puis recroise par-dessus dans l’autre sens.' },
      { text: '<b>Demi-clé retournée</b> : fais une boucle en retournant la corde et capelle-la sur la corne. Le bout se coince sous la diagonale, parallèle à la première. Range le reste en glène.' },
    ],
  },
];

export const knotById = (id) => KNOTS.find((k) => k.id === id);
