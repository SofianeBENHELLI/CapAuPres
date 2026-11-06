// Parcours d'apprentissage : 7 leçons, chacune validée par un quiz.
// q : question, c : choix (le premier est la bonne réponse, mélangé à l'affichage), e : explication.
// visual : types de questions illustrées générées automatiquement (voir views/learn.js).

export const LESSONS = [
  {
    id: 'allures', num: 1, icon: '🧭', title: 'Le vent et les allures',
    summary: 'D’où vient le vent, la zone interdite, et les allures du près au vent arrière.',
    visual: ['allure', 'allure'],
    quiz: [
      { q: 'Que veut dire « naviguer au près » ?', c: ['Naviguer le plus près possible du vent (≈ 45°)', 'Avoir le vent dans le dos', 'Avoir le vent pile sur le côté', 'Rester tout près de la plage'], e: 'Au près, on remonte au vent, à environ 45° du lit du vent.' },
      { q: 'Pourquoi un voilier ne peut-il pas aller droit face au vent ?', c: ['Ses voiles faseyent : elles ne portent plus', 'Le safran se bloque', 'C’est interdit par le règlement', 'La dérive l’en empêche'], e: 'Face au vent, la voile bat comme un drapeau : le bateau s’arrête. C’est la zone interdite.' },
      { q: 'Pour rejoindre un point situé face au vent, on…', c: ['tire des bords de près en zigzag', 'va tout droit en bordant fort', 'passe vent arrière', 'attend que le vent tourne'], e: 'On zigzague au près, en virant de bord de temps en temps.' },
      { q: 'Plus on s’éloigne du vent (on abat : on tire la barre), plus on doit…', c: ['choquer les voiles', 'border les voiles', 'baisser la dérive', 'se mettre à l’avant'], e: 'Au près les voiles sont bordées, au vent arrière elles sont grandes ouvertes.' },
    ],
  },
  {
    id: 'matelotage', num: 2, icon: '🪢', title: 'Le bateau et les nœuds',
    summary: 'Le nom de chaque pièce de ton bateau, le lexique du marin et les trois nœuds à connaître.',
    visual: [],
    quiz: [
      { q: 'La bôme, c’est…', c: ['le bras horizontal qui tient le bas de la grand-voile', 'le câble qui tient le mât vers l’avant', 'l’aileron sous la coque', 'la voile d’avant'], e: 'La bôme passe d’un bord à l’autre à chaque empannage : on baisse la tête !' },
      { q: 'À quoi sert un taquet coinceur ?', c: ['Bloquer un cordage d’un geste vers le bas, le libérer en le soulevant', 'Démultiplier l’effort pour border', 'Hisser la voile en haut du mât', 'Attacher le bateau au ponton'], e: 'Ses deux mâchoires crantées pincent le cordage. Pour amarrer le bateau, on utilise un taquet classique.' },
      { q: 'Le cordage qui sert à hisser une voile s’appelle…', c: ['la drisse', 'l’écoute', 'le hale-bas', 'l’étai'], e: 'La drisse monte la voile ; l’écoute la règle.' },
      { q: 'Choquer l’écoute, c’est…', c: ['la relâcher : la voile s’ouvre', 'la tirer : la voile se ferme', 'la bloquer dans le coinceur', 'la ranger en glène'], e: 'Choquer = relâcher ; border = tirer.' },
      { q: 'Le safran, c’est…', c: ['la lame du gouvernail, orientée par la barre', 'l’aileron qu’on remonte au portant', 'le bord avant de la voile', 'le côté droit du bateau'], e: 'La dérive empêche de déraper ; le safran sert à diriger.' },
      { q: 'Quel nœud fait une boucle fixe qui ne glisse pas et ne serre pas ?', c: ['Le nœud de chaise', 'Le nœud de huit', 'Le nœud de taquet', 'Un nœud plat'], e: '« Le lapin sort du terrier, fait le tour de l’arbre et rentre dans le terrier. »' },
      { q: 'Au bout d’une écoute, pour qu’elle ne s’échappe pas de la poulie, on fait…', c: ['un nœud de huit', 'un nœud de chaise', 'un nœud de taquet', 'rien, la poulie la retient'], e: 'Le nœud de huit est le nœud d’arrêt : solide et facile à défaire.' },
      { q: 'Quel bateau n’a pas de dérive mais une quille lestée ?', c: ['Le J80', 'L’Optimist', 'Le dériveur', 'Aucun'], e: 'La quille du J80 est fixe et lourde : elle touche le fond s’il n’y a pas assez d’eau. Le catamaran, lui, n’a ni dérive ni quille : ses coques l’empêchent de déraper.' },
    ],
  },
  {
    id: 'amures', num: 3, icon: '↔️', title: 'Bâbord ou tribord ?',
    summary: 'Les amures, la bôme, qui est prioritaire quand deux voiliers se croisent, et la place à la marque.',
    visual: ['amure', 'amure'],
    quiz: [
      { q: 'Bâbord, c’est…', c: ['la gauche, en regardant vers l’avant', 'la droite, en regardant vers l’avant', 'l’arrière du bateau', 'le côté d’où vient le vent'], e: 'Moyen mnémotechnique : « BAtterie » → BAbord à gauche, TRIbord à droite.' },
      { q: 'Le vent arrive par la droite du bateau. Il est…', c: ['tribord amure', 'bâbord amure', 'vent debout', 'au mouillage'], e: 'L’amure, c’est le côté qui reçoit le vent : à droite = tribord amure.' },
      { q: 'Tu es bâbord amure. Où est la bôme ?', c: ['À droite (tribord)', 'À gauche (bâbord)', 'Dans l’axe du bateau', 'Ça dépend de la vitesse'], e: 'La bôme est toujours du côté opposé au vent.' },
      { q: 'Un voilier tribord amure croise un voilier bâbord amure. Qui s’écarte ?', c: ['Le voilier bâbord amure', 'Le voilier tribord amure', 'Le plus petit', 'Le plus rapide'], e: 'Tribord amure est prioritaire.' },
      { q: 'Deux voiliers ont la même amure et naviguent bord à bord (engagés). Qui est prioritaire ?', c: ['Celui qui est sous le vent', 'Celui qui est au vent', 'Celui qui a la plus grande voile', 'Celui qui va le plus vite'], e: 'À même amure et engagés, le bateau au vent s’écarte de celui qui est sous le vent (règle 11). S’ils ne sont pas engagés, c’est celui qui est derrière qui s’écarte (règle 12).' },
      { q: 'Deux voiliers engagés arrivent ensemble à une bouée de parcours. Qui a droit à la place pour la contourner ?', c: ['Celui à l’intérieur, le plus près de la bouée', 'Celui à l’extérieur', 'Toujours celui qui est tribord amure', 'Celui qui est sous le vent, même à l’extérieur'], e: 'Règle 18 : dans la zone (3 longueurs autour de la bouée), le bateau à l’extérieur laisse la place à celui de l’intérieur, même s’il est prioritaire ailleurs. Exception : deux bateaux d’amures opposées au près, là c’est la règle 10.' },
    ],
  },
  {
    id: 'voiles', num: 4, icon: '🪁', title: 'Lire la voile',
    summary: 'Les penons, le faseyement et la règle d’or du réglage de l’écoute.',
    visual: [],
    quiz: [
      { q: 'L’avant de la voile (le guindant) faseye. Que fais-tu ?', c: ['Je borde (ou j’abats : je tire la barre)', 'Je choque encore', 'Je lève la dérive', 'Rien, c’est normal'], e: 'Une voile qui faseye est trop choquée pour l’allure.' },
      { q: 'Le penon côté sous le vent s’agite et décroche. La voile est…', c: ['trop bordée : je choque (ou je lofe : je pousse la barre)', 'trop choquée : je borde', 'parfaitement réglée', 'trop bordée : j’abats (je tire la barre)'], e: 'L’air ne suit plus la voile côté sous le vent : il faut l’ouvrir.' },
      { q: 'Quelle est la règle d’or pour régler l’écoute ?', c: ['Choquer jusqu’au faseyement, puis border juste assez', 'Toujours border à fond', 'Toujours choquer à fond', 'Régler une fois pour toutes au départ'], e: 'On cherche la limite du faseyement : c’est là que la voile porte le mieux.' },
      { q: 'Des penons bien réglés…', c: ['filent tous les deux à l’horizontale', 'pointent vers le haut', 'tournent en rond', 's’enroulent autour de l’étai'], e: 'Quand l’air glisse bien des deux côtés, les deux penons filent droit.' },
    ],
  },
  {
    id: 'reglages', num: 5, icon: '🎛️', title: 'Régler son bateau',
    summary: 'Les réglages de ton bateau selon l’allure et la force du vent.',
    visual: [],
    quiz: [
      { q: 'Par vent fort, pour aplatir la voile et moins gîter, on…', c: ['tend les réglages (Cunningham, bordure, hale-bas…)', 'relâche tout pour creuser la voile', 'met tout l’équipage sous le vent', 'remonte complètement la dérive au près'], e: 'Voile plate = moins de puissance = bateau plus facile à tenir.' },
      { q: 'Par petit temps, on cherche une voile…', c: ['creuse, pour avoir de la puissance', 'très plate', 'à moitié affalée', 'bordée à bloc à toutes les allures'], e: 'Peu de vent : on relâche pour creuser la voile.' },
      { q: 'Sur un bateau à dérive, au près, la dérive est…', c: ['basse', 'haute', 'à moitié', 'enlevée'], e: 'Au près la dérive empêche le bateau de déraper.' },
      { q: 'Une rafale fait gîter le bateau au près. Le premier réflexe :', c: ['choquer la grand-voile', 'border davantage', 'lâcher la barre', 'se mettre sous le vent'], e: 'On choque pour vider la voile, puis on reborde quand la rafale passe.' },
    ],
  },
  {
    id: 'manoeuvres', num: 6, icon: '🔄', title: 'Virer et empanner',
    summary: 'Virement de bord, empannage, lof pour lof : les annonces et les gestes.',
    visual: ['manoeuvre', 'manoeuvre'],
    quiz: [
      { q: 'Un virement de bord, c’est changer d’amure en passant…', c: ['face au vent', 'vent arrière', 'vent de travers', 'au mouillage'], e: 'L’avant du bateau passe dans le lit du vent.' },
      { q: 'Que dit le barreur avant de virer ?', c: ['« Paré à virer ? »', 'Rien : il vire et l’équipier suit', '« Larguez tout ! »', '« Paré à empanner ? »'], e: 'Puis « On vire ! » quand l’équipage a répondu « Paré ! ».' },
      { q: 'Pendant un empannage, le principal danger est…', c: ['la bôme qui traverse brusquement', 'la dérive qui remonte', 'la voile qui se déchire', 'le bateau qui recule'], e: 'Tête baissée et bôme accompagnée !' },
      { q: 'Un virement « lof pour lof », c’est…', c: ['remonter au vent (lofer : pousser la barre), virer, puis abattre (tirer la barre) au lieu d’empanner', 'empanner deux fois de suite', 'virer sans toucher la barre', 's’arrêter face au vent'], e: 'Plus long, mais plus sûr qu’un empannage par vent fort.' },
      { q: 'Lofer, c’est…', c: ['se rapprocher du lit du vent (en poussant la barre)', 's’éloigner du vent (en tirant la barre)', 'border la voile au maximum', 'changer d’amure'], e: 'Lofer = remonter vers le vent en poussant la barre ; abattre = s’en éloigner en tirant la barre.' },
      { q: 'Pour abattre (s’éloigner du vent), le barreur…', c: ['tire la barre vers lui', 'pousse la barre vers la voile', 'borde la grand-voile', 'lâche la barre'], e: 'Tirer la barre = abattre ; pousser la barre (vers la voile) = lofer. Le bateau tourne du côté opposé à la barre.' },
    ],
  },
  {
    id: 'baie', num: 7, icon: '🗺️', title: 'Naviguer dans la baie',
    summary: 'Les vents de la baie de La Baule, les dangers, la bande des 300 m et la sécurité.',
    visual: [],
    quiz: [
      { q: 'L’après-midi en été, quel vent se lève souvent dans la baie ?', c: ['La brise thermique de sud-ouest / ouest', 'Le vent de terre de nord-est', 'Aucun, c’est toujours calme', 'Un vent du sud glacial'], e: 'La terre chauffe, l’air de la mer s’engouffre : c’est la brise de mer (thermique).' },
      { q: 'Dans la bande des 300 m le long de la plage, la vitesse est limitée à…', c: ['5 nœuds', '15 nœuds', '30 nœuds', 'Pas de limite pour les voiliers'], e: 'Et on respecte les zones de baignade balisées en jaune.' },
      { q: 'Autour de la pointe de Penchâteau et de l’îlot des Évens, il faut…', c: ['garder ses distances : il y a des rochers', 'passer au plus près pour gagner du temps', 'passer côté terre, l’eau y est plus calme', 'y aller à marée basse pour voir les rochers'], e: 'Ces zones sont parsemées de cailloux, surtout à marée basse.' },
      { q: 'Avant de partir naviguer, tu…', c: ['vérifies la météo, mets ton gilet et préviens le club', 'pars le plus vite possible', 'laisses ton gilet à terre s’il fait beau', 'éteins ton téléphone'], e: 'Météo, gilet, et quelqu’un à terre sait où tu es.' },
      { q: 'Une balise cardinale Nord (deux cônes pointe en haut) indique…', c: ['qu’il faut passer au nord de la balise', 'qu’il faut passer au sud', 'un port tout proche', 'une zone de baignade'], e: 'Les cardinales indiquent le côté où se trouvent les eaux saines.' },
      { q: 'À environ 1 km à l’est du club, la tourelle verte des Petits Impairs signale…', c: ['un plateau de roches : les Impairs', 'la zone de baignade', 'le chenal de Pornichet', 'une bouée de régate'], e: 'Les Impairs sont des roches à éviter sur la route de La Baule.' },
      { q: 'En entrant au port du Pouliguen, une marque rouge se laisse…', c: ['à bâbord (à gauche)', 'à tribord (à droite)', 'n’importe comment', 'au vent'], e: 'Système IALA A : rouge à bâbord, vert à tribord en rentrant au port.' },
      { q: 'En été, quel créneau est le plus souvent idéal pour débuter dans la baie ?', c: ['L’après-midi, vers 14–17 h', 'Tôt le matin, avant que le vent se lève', 'Vers midi pile', 'En soirée, après 19 h'], e: '12 ans de données : l’après-midi réunit 2,7 fois plus souvent un vent de mer modéré et régulier.' },
    ],
  },
];

export const lessonById = (id) => LESSONS.find((l) => l.id === id);
