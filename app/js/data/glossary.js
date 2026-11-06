// Lexique de la voile. boats : bateaux concernés (absent = tous) ; note : précision par bateau.
// icon : pictogramme d'accastillage dessiné dans ui/gear.js.

export const CATS = [
  { id: 'coque', label: 'La coque', emoji: '🛶' },
  { id: 'greement', label: 'Le gréement', emoji: '📏' },
  { id: 'voiles', label: 'Les voiles', emoji: '⛵' },
  { id: 'accastillage', label: 'L’accastillage', emoji: '🔩' },
  { id: 'reglages', label: 'Les réglages', emoji: '🎛️' },
  { id: 'navigation', label: 'Naviguer', emoji: '🧭' },
];

export const TERMS = [
  // ---- La coque
  { id: 'coque', term: 'Coque', cat: 'coque', def: 'Le « corps » du bateau, qui flotte. Un catamaran en a deux.' },
  { id: 'etrave', term: 'Étrave', cat: 'coque', def: 'L’avant du bateau, la partie qui fend l’eau.' },
  { id: 'tableau', term: 'Tableau arrière', cat: 'coque', def: 'La paroi qui ferme l’arrière de la coque. On y accroche souvent le safran.' },
  { id: 'cockpit', term: 'Cockpit', cat: 'coque', def: 'L’endroit où se tient l’équipage pour barrer et régler.', boats: ['deriveur', 'optimist', 'j80'] },
  { id: 'trampoline', term: 'Trampoline', cat: 'coque', def: 'La toile tendue entre les deux coques du catamaran : c’est là que l’équipage se tient.', boats: ['catamaran'] },
  { id: 'rouf', term: 'Rouf', cat: 'coque', def: 'Le toit de la petite cabine, au milieu du bateau.', boats: ['j80'] },
  { id: 'derive', term: 'Dérive', cat: 'coque', def: 'Grand aileron qu’on enfonce sous la coque pour que le bateau ne dérape pas sur le côté. On la remonte au portant.', boats: ['deriveur', 'optimist'] },
  { id: 'quille', term: 'Quille', cat: 'coque', def: 'Aileron fixe et lesté (lourd) sous la coque : il empêche de déraper et redresse le bateau quand il gîte. Il touche le fond s’il y a peu d’eau !', boats: ['j80'] },
  { id: 'safran', term: 'Safran', cat: 'coque', def: 'Le gouvernail : une lame sous l’arrière du bateau, orientée par la barre.', note: { catamaran: 'Un safran sur chaque coque, reliés par une barre de liaison.' } },
  { id: 'barre', term: 'Barre', cat: 'coque', def: 'Le manche qui oriente le safran. On pousse la barre du côté de la voile pour lofer, on la tire pour abattre.' },
  { id: 'stick', term: 'Stick (allonge de barre)', cat: 'coque', def: 'Prolongement articulé de la barre : il permet de barrer assis sur le bord, au rappel.', boats: ['deriveur', 'optimist', 'catamaran'] },
  { id: 'boutdehors', term: 'Bout-dehors', cat: 'coque', def: 'Tube qui sort à l’avant du bateau pour amurer (fixer) le spi asymétrique loin devant.', boats: ['j80', 'catamaran'], note: { catamaran: 'Avec le spi, en option sur le Hobie 16 et de série sur beaucoup de catamarans de sport.' } },

  // ---- Le gréement
  { id: 'mat', term: 'Mât', cat: 'greement', def: 'Le grand poteau vertical qui porte les voiles.', note: { catamaran: 'Le mât du Hobie 16 tourne sur lui-même pour mieux profiler la voile.', optimist: 'Le mât de l’Optimist tient tout seul, sans câbles.' } },
  { id: 'bome', term: 'Bôme', cat: 'greement', boats: ['deriveur', 'optimist', 'j80'], def: 'Le bras horizontal fixé au mât, qui tient le bas de la grand-voile. Attention à la tête quand elle passe d’un bord à l’autre ! (Le catamaran Hobie 16 n’en a pas : sa grand-voile est tenue par l’écoute, directement au point d’écoute.)' },
  { id: 'livarde', term: 'Livarde', cat: 'greement', def: 'Perche en diagonale qui tend le coin haut de la voile de l’Optimist.', boats: ['optimist'] },
  { id: 'etai', term: 'Étai', cat: 'greement', def: 'Câble qui tient le mât vers l’avant. Le foc y est accroché.', boats: ['deriveur', 'catamaran', 'j80'] },
  { id: 'haubans', term: 'Haubans', cat: 'greement', def: 'Câbles qui tiennent le mât sur les côtés.', boats: ['deriveur', 'catamaran', 'j80'] },
  { id: 'drisse', term: 'Drisse', cat: 'greement', def: 'Cordage qui sert à hisser (monter) une voile le long du mât.' },
  { id: 'trapeze', term: 'Trapèze', cat: 'greement', def: 'Câble accroché en haut du mât : l’équipier s’y suspend par un harnais, pieds sur la coque, pour faire contrepoids.', boats: ['catamaran', 'deriveur'], note: { deriveur: 'Sur le 420, pour l’équipier en compétition.' } },

  // ---- Les voiles
  { id: 'gv', term: 'Grand-voile', cat: 'voiles', def: 'La voile principale, accrochée au mât et à la bôme.', note: { optimist: 'Sur l’Optimist, c’est la seule voile.' } },
  { id: 'foc', term: 'Foc', cat: 'voiles', def: 'La voile d’avant, triangulaire, accrochée sur l’étai.', boats: ['deriveur', 'catamaran', 'j80'] },
  { id: 'spi', term: 'Spi (spinnaker)', cat: 'voiles', def: 'Grande voile légère et très creuse, pour le portant. Sur le J80 et les catamarans, il est asymétrique et amuré sur le bout-dehors.', boats: ['j80', 'catamaran'], note: { catamaran: 'En option sur le Hobie 16 (kit spi) : on descend toujours en zigzag, mais plus vite.' } },
  { id: 'guindant', term: 'Guindant', cat: 'voiles', def: 'Le bord avant d’une voile (le long du mât ou de l’étai). C’est lui qui faseye en premier.' },
  { id: 'chute', term: 'Chute', cat: 'voiles', def: 'Le bord arrière d’une voile, libre.' },
  { id: 'bordure', term: 'Bordure', cat: 'voiles', def: 'Le bord bas d’une voile (le long de la bôme pour la grand-voile).' },
  { id: 'lattes', term: 'Lattes', cat: 'voiles', def: 'Baguettes glissées dans la voile pour garder sa forme.', boats: ['deriveur', 'catamaran', 'j80'] },
  { id: 'penons', term: 'Penons', cat: 'voiles', def: 'Brins de laine collés sur la voile : ils montrent si l’air glisse bien des deux côtés.' },
  { id: 'pointecoute', term: 'Point d’écoute', cat: 'voiles', def: 'Le coin arrière bas de la voile, où l’on fixe l’écoute.' },
  { id: 'pointamure', term: 'Point d’amure', cat: 'voiles', def: 'Le coin avant bas de la voile, fixé au bateau.' },
  { id: 'pointdrisse', term: 'Point de drisse', cat: 'voiles', def: 'Le coin haut de la voile, où l’on attache la drisse.' },

  // ---- L'accastillage
  { id: 'ecoute', term: 'Écoute', cat: 'accastillage', def: 'Le cordage qui règle l’ouverture d’une voile : on la borde (on tire) ou on la choque (on relâche).' },
  { id: 'ecoutegv', term: 'Écoute de grand-voile', cat: 'accastillage', def: 'Elle règle la grand-voile. Elle passe dans plusieurs poulies (un palan) pour démultiplier l’effort, entre la bôme et le bateau.', note: { catamaran: 'Sans bôme : le palan part directement du point d’écoute de la grand-voile vers le chariot, sur la poutre arrière.', optimist: 'Elle part de la bôme vers une poulie à cliquet au fond du cockpit : on la garde en main.' } },
  { id: 'ecoutefoc', term: 'Écoutes de foc', cat: 'accastillage', boats: ['deriveur', 'catamaran', 'j80'], def: 'Deux écoutes, une de chaque côté du foc : on règle celle qui est sous le vent (l’écoute « active »), l’autre reste molle jusqu’au prochain virement. Elles passent dans un filoir ou une poulie, puis dans un taquet coinceur.', note: { j80: 'Sur le J80, elles sont renvoyées vers les winchs du cockpit.' } },
  { id: 'poulie', term: 'Poulie', cat: 'accastillage', icon: 'poulie', def: 'Roue dans laquelle passe un cordage : elle change sa direction ou démultiplie l’effort.' },
  { id: 'taquet', term: 'Taquet', cat: 'accastillage', icon: 'taquet', def: 'Pièce à deux cornes sur laquelle on bloque un cordage avec un nœud de taquet (amarres, drisses).', boats: ['deriveur', 'catamaran', 'j80'] },
  { id: 'coinceur', term: 'Taquet coinceur', cat: 'accastillage', icon: 'coinceur', def: 'Deux mâchoires crantées qui bloquent un cordage d’un simple geste vers le bas, et le libèrent en le soulevant. Pratique pour garder une écoute réglée.', note: { optimist: 'L’Optimist a souvent une poulie à cliquet plutôt qu’un coinceur : on garde l’écoute en main.' } },
  { id: 'winch', term: 'Winch', cat: 'accastillage', icon: 'winch', def: 'Tambour qui tourne dans un seul sens, avec une manivelle : il aide à border une écoute très chargée.', boats: ['j80'] },
  { id: 'manille', term: 'Manille', cat: 'accastillage', icon: 'manille', def: 'Anneau en métal qui se ferme par une vis : il relie une voile, une poulie ou un cordage.' },
  { id: 'chariot', term: 'Chariot (rail d’écoute)', cat: 'accastillage', icon: 'chariot', def: 'Rail sur lequel glisse la poulie d’écoute de grand-voile : on le déplace pour régler la voile sans changer l’écoute.', boats: ['catamaran', 'j80', 'deriveur'], note: { deriveur: 'Selon les modèles de dériveur.', catamaran: 'Sur le Hobie 16, il est sur la poutre arrière.' } },

  // ---- Les réglages
  { id: 'border', term: 'Border', cat: 'reglages', def: 'Tirer sur l’écoute : la voile se rapproche de l’axe du bateau.' },
  { id: 'choquer', term: 'Choquer', cat: 'reglages', def: 'Relâcher l’écoute : la voile s’ouvre.' },
  { id: 'halebas', term: 'Hale-bas', cat: 'reglages', def: 'Cordage (ou palan) qui tire la bôme vers le bas : il aplatit la voile et l’empêche de monter au portant.', boats: ['deriveur', 'optimist', 'j80'] },
  { id: 'cunningham', term: 'Cunningham', cat: 'reglages', def: 'Petit cordage (souvent en palan) qui passe dans l’œillet du guindant, un peu au-dessus du point d’amure de la grand-voile, et descend à la verticale vers le pied de mât. En le tirant, on tend le guindant : par vent fort, la voile s’aplatit et s’ouvre en haut.', boats: ['deriveur', 'catamaran', 'j80'] },
  { id: 'faseyer', term: 'Faseyer', cat: 'reglages', def: 'Une voile faseye quand elle bat comme un drapeau : elle est trop choquée, ou le bateau est trop près du vent.' },

  // ---- Naviguer
  { id: 'babord', term: 'Bâbord', cat: 'navigation', def: 'Le côté gauche du bateau, en regardant vers l’avant. Couleur : rouge.' },
  { id: 'tribord', term: 'Tribord', cat: 'navigation', def: 'Le côté droit du bateau, en regardant vers l’avant. Couleur : vert.' },
  { id: 'amure', term: 'Amure', cat: 'navigation', def: 'Le côté par lequel le bateau reçoit le vent : tribord amure si le vent arrive par la droite.' },
  { id: 'auvent', term: 'Au vent / sous le vent', cat: 'navigation', def: 'Au vent : du côté d’où vient le vent. Sous le vent : de l’autre côté, à l’abri.' },
  { id: 'lofer', term: 'Lofer', cat: 'navigation', def: 'Tourner pour se rapprocher du lit du vent : on pousse la barre (vers la voile).' },
  { id: 'abattre', term: 'Abattre', cat: 'navigation', def: 'Tourner pour s’éloigner du lit du vent : on tire la barre (vers soi).' },
  { id: 'virer', term: 'Virer de bord', cat: 'navigation', def: 'Changer d’amure en passant l’avant du bateau face au vent.' },
  { id: 'empanner', term: 'Empanner', cat: 'navigation', def: 'Changer d’amure en passant l’arrière du bateau face au vent : la bôme passe d’un coup de l’autre côté.' },
  { id: 'louvoyer', term: 'Louvoyer (tirer des bords)', cat: 'navigation', def: 'Remonter au vent en zigzag, en enchaînant des bords de près et des virements.' },
  { id: 'gite', term: 'Gîte', cat: 'navigation', def: 'L’inclinaison du bateau sur le côté, poussé par le vent.' },
  { id: 'rappel', term: 'Rappel', cat: 'navigation', def: 'Se pencher à l’extérieur du bateau pour faire contrepoids et limiter la gîte.' },
  { id: 'dessaler', term: 'Dessaler', cat: 'navigation', def: 'Chavirer. On reste toujours avec son bateau !' },
  { id: 'lit', term: 'Lit du vent', cat: 'navigation', def: 'La direction d’où vient le vent.' },
];

export const termById = (id) => TERMS.find((t) => t.id === id);
export const termFor = (t, boat) => !t.boats || t.boats.includes(boat);
