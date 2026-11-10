// Leçons « pour aller plus loin » : partir de la plage et revenir, dessaler et se redresser,
// la météo et la marée, la régate. Même principe que views/theory.js : chaque fonction remplit
// l'élément reçu, avec une figure interactive et des fiches courtes.
import { boatSVG, windArrowSVG } from '../ui/boat.js';
import { getBoat } from '../core/boats.js';

const SEA_GRAD = (id) => `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b6f9e"/><stop offset="1" stop-color="#2a9fd6"/></linearGradient></defs>`;
const boatAt = (x, y, heading, windFrom, scale = 0.42, ghost = false) =>
  `<g transform="translate(${x},${y}) scale(${scale})">${boatSVG({ heading, windFrom, ghost, mine: !ghost })}</g>`;
const steps = (list) => `<div class="steps">${list.map((t) => `<div class="step on"><div>${t}</div></div>`).join('')}</div>`;

// ------------------------------------------------------------------ Partir de la plage et revenir
const DEPART = {
  mer: {
    label: '🌊 Vent de mer', windFrom: 0,
    title: 'Le vent souffle de la mer vers la plage',
    out: 'M200,238 L286,160 L206,86 L262,34', back: 'M112,34 L112,196 Q112,226 136,230',
    boats: [[244, 198, 48, 0], [246, 123, 312, 0], [112, 110, 180, 0], [133, 229, 285, 0]],
    go: ['Bateau <b>face au vent</b>, donc face à la mer : on le pousse jusqu’à avoir de l’eau aux cuisses.', 'On monte à bord, <b>dérive à moitié</b>, safran dès qu’il y a assez d’eau.', 'On borde et on part <b>au près</b>, sur le bord qui éloigne le mieux de la plage. Dérive basse dès que possible.'],
    ret: ['On revient <b>au portant</b> : ça va vite. On <b>choque en grand</b> pour ralentir.', 'Avant le bord, on <b>lofe face au vent</b> pour s’arrêter, et on relève dérive et safran.', 'On descend <b>côté au vent</b> et on tient le bateau par l’avant, face aux vagues.'],
    note: 'Le départ demande un peu de technique, le retour est rapide : c’est l’arrivée qu’il faut préparer.',
  },
  terre: {
    label: '🏖️ Vent de terre', windFrom: 180,
    title: 'Le vent souffle de la plage vers le large',
    out: 'M200,238 L200,40', back: 'M110,40 L188,118 L112,190 L150,232',
    boats: [[200, 150, 0, 180], [150, 78, 135, 180], [150, 154, 225, 180], [140, 222, 150, 180]],
    go: ['L’eau est <b>plate</b> au bord : le départ est très facile.', 'On part <b>au portant</b>, voile choquée, dérive à moitié relevée.', 'Le vent est irrégulier sous la côte et plus soutenu un peu plus loin : on garde l’écoute en main.'],
    ret: ['Le retour se fait <b>au près</b>, en tirant des bords : on garde un peu de temps pour ça.', 'Dans la baie, on remonte en <b>eau abritée</b> : la mer reste plate jusqu’au club.', 'On arrive presque face au vent, donc <b>lentement</b> : c’est l’arrivée la plus douce.'],
    note: 'Le vent de terre n’est pas un piège ici : la baie est fermée et le club est au fond. Il faut juste savoir remonter au près.',
  },
  travers: {
    label: '↔️ Vent de travers', windFrom: 270,
    title: 'Le vent souffle le long de la plage',
    out: 'M210,238 L210,40', back: 'M130,40 L130,236',
    boats: [[210, 150, 0, 270], [130, 130, 180, 270]],
    go: ['Bateau face au vent, donc <b>parallèle à la plage</b>, pour hisser la voile.', 'On part <b>au travers</b>, tout droit vers le large : c’est le départ le plus simple.', 'Dérive à moitié au début, puis on la descend quand il y a du fond.'],
    ret: ['On revient <b>au travers</b>, à la vitesse qu’on veut en réglant l’écoute.', 'Pour ralentir, on <b>choque</b> ; pour s’arrêter, on <b>lofe</b> face au vent.', 'On relève dérive et safran avant de toucher le fond.'],
    note: 'Aller et retour à la même allure : idéal pour une première sortie.',
  },
};

function depart(el) {
  let cur = 'mer';
  const fig = (c) => {
    const [ax, ay] = c.windFrom === 0 ? [44, 38] : c.windFrom === 180 ? [44, 214] : [36, 120];
    return `<svg viewBox="0 0 400 300" class="lesson-fig" role="img" aria-label="${c.title}">
      ${SEA_GRAD('dpSea')}<rect width="400" height="300" fill="url(#dpSea)"/>
      <path d="M0,252 Q50,244 100,252 T200,252 T300,252 T400,252 L400,300 L0,300 Z" fill="#f1e6c8"/>
      <text x="200" y="285" text-anchor="middle" class="fig-label dark">LA PLAGE</text>
      <text x="386" y="24" text-anchor="end" class="fig-label">LE LARGE</text>
      <g transform="translate(${ax},${ay})" style="color:#fff">${windArrowSVG(c.windFrom, 30)}</g>
      <text x="${ax + 24}" y="${ay + 4}" class="fig-label">VENT</text>
      <path d="${c.out}" class="fig-path out"/><path d="${c.back}" class="fig-path back"/>
      ${c.boats.map(([x, y, h, w]) => boatAt(x, y, h, w)).join('')}
      <g class="fig-key"><rect x="262" y="262" width="126" height="30" rx="8"/><line x1="270" y1="272" x2="292" y2="272" class="fig-path out"/><text x="298" y="276">départ</text><line x1="270" y1="285" x2="292" y2="285" class="fig-path back"/><text x="298" y="289">retour</text></g>
    </svg>`;
  };
  const draw = () => {
    const c = DEPART[cur];
    el.querySelector('#dpFig').innerHTML = fig(c);
    el.querySelector('#dpTitle').textContent = c.title;
    el.querySelector('#dpGo').innerHTML = steps(c.go);
    el.querySelector('#dpRet').innerHTML = steps(c.ret);
    el.querySelector('#dpNote').innerHTML = `<b>À retenir :</b> ${c.note}`;
    el.querySelectorAll('#dpTabs button').forEach((b) => b.classList.toggle('active', b.dataset.k === cur));
  };
  el.innerHTML = `
  <div class="theory-grid">
    <div class="card">
      <h2>D’où vient le vent ?</h2>
      <p>Tout dépend du vent par rapport à la plage. Choisis une situation :</p>
      <nav class="tabs" id="dpTabs">${Object.entries(DEPART).map(([k, c]) => `<button data-k="${k}">${c.label}</button>`).join('')}</nav>
      <div id="dpFig"></div>
      <h3 id="dpTitle" style="margin:12px 0 8px"></h3>
      <div class="two-col">
        <div><h4>⛵ Pour partir</h4><div id="dpGo"></div></div>
        <div><h4>🏖️ Pour revenir</h4><div id="dpRet"></div></div>
      </div>
      <div class="callout" id="dpNote"></div>
    </div>
    <div>
      <div class="card">
        <h2 class="h3">Avant de quitter la plage</h2>
        <ul class="help-list" style="font-size:15px;color:var(--ink)">
          <li>On grée le bateau <b>le nez face au vent</b> : la voile faseye sans forcer.</li>
          <li><b>Gilet fermé</b>, bouchons de coque en place, safran et dérive prêts à descendre.</li>
          <li>On regarde le plan d’eau : les baigneurs, les autres bateaux, le chenal.</li>
          <li>On sait <b>où l’on va</b> et le moniteur aussi.</li>
        </ul>
      </div>
      <div class="card" style="margin-top:16px">
        <h2 class="h3">⚠️ Les règles d’or de l’arrivée</h2>
        ${steps([
          '<b>Arriver lentement</b> : un voilier n’a pas de frein. On choque, puis on lofe face au vent.',
          '<b>Relever dérive et safran</b> avant de toucher le fond.',
          '<b>Descendre côté au vent</b> : le bateau ne doit pas te passer dessus.',
          'Dans la <b>bande des 300 m</b> : 5 nœuds au plus, par le chenal, en surveillant les baigneurs.',
        ])}
        <p style="margin-bottom:0"><a class="btn sea small" href="#/apprendre/baie">🗺️ Revoir la baie et la bande des 300 m</a></p>
      </div>
    </div>
  </div>`;
  el.querySelector('#dpTabs').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    cur = b.dataset.k;
    draw();
  });
  draw();
}

// ------------------------------------------------------------------ Dessaler et se redresser
const RIGHTING = {
  optimist: {
    angles: [90, 90, 90, 40, 0],
    steps: [
      '<b>Tout va bien ?</b> On respire, on reste accroché au bateau : il flotte, et on te voit de loin.',
      '<b>Choque l’écoute</b> pour que la voile ne retienne pas le bateau.',
      'Fais le tour jusqu’à la <b>dérive</b>, en te tenant à la coque.',
      '<b>Pèse sur la dérive</b>, les mains sur le bord de la coque, en te penchant en arrière : l’Optimist se redresse.',
      'Remonte <b>par l’arrière</b>, reste face au vent et <b>écope</b> avant de repartir.',
    ],
  },
  deriveur: {
    angles: [90, 90, 90, 40, 0],
    steps: [
      '<b>Tout le monde va bien ?</b> On se parle, on reste accrochés au bateau : il flotte, et on vous voit de loin.',
      '<b>Choquez les écoutes</b> de grand-voile et de foc, sinon le bateau repartira ou rechavirera.',
      'Le barreur passe à la <b>dérive</b>. L’équipier reste dans l’eau près du cockpit, ou tient l’étrave face au vent.',
      'Le barreur <b>pèse sur la dérive</b> en se penchant en arrière : le bateau se redresse doucement.',
      'On remonte <b>par l’arrière ou le côté au vent</b>, on vide l’eau et on repart tranquillement.',
    ],
  },
  catamaran: {
    angles: [90, 90, 90, 45, 0],
    steps: [
      '<b>Tout le monde va bien ?</b> On reste avec le bateau, accrochés à la coque du bas.',
      '<b>Choquez tout</b> : écoute de grand-voile, chariot, foc.',
      'Tournez le bateau pour que les <b>étraves pointent vers le vent</b>.',
      'Debout sur la <b>coque du bas</b>, attrapez le <b>bout de redressement</b> et penchez-vous en arrière, bien tendus.',
      'Quand la coque retombe, accrochez-vous à la <b>poutre</b> pour que le bateau ne reparte pas, puis remontez.',
    ],
  },
  j80: {
    angles: [70, 70, 55, 25, 0],
    steps: [
      'Un quillard <b>ne chavire pas</b> : dans une survente il se couche, puis sa quille lestée le redresse.',
      '<b>Choquez en grand</b> la grand-voile, et le spi s’il est envoyé.',
      'Tout le monde reste <b>accroché côté au vent</b>, personne ne lâche le bateau.',
      'La quille fait son travail : le bateau <b>se redresse tout seul</b>.',
      'On se compte, on <b>réduit la toile</b> (on affale le spi) et on repart.',
    ],
  },
};

function securite(el) {
  const type = getBoat().id;
  const R = RIGHTING[type] || RIGHTING.deriveur;
  let i = 0;
  const cata = type === 'catamaran';
  // Bateau vu de face : coque(s), mât vers le haut, dérive ou quille vers le bas.
  const hull = cata
    ? '<path d="M-46,0 q8,16 16,0 Z M30,0 q8,16 16,0 Z" class="rt-hull"/><line x1="-38" y1="0" x2="38" y2="0" class="rt-beam"/>'
    : '<path d="M-30,0 Q-26,20 0,22 Q26,20 30,0 Z" class="rt-hull"/>';
  const fin = type === 'j80' ? '<line x1="0" y1="20" x2="0" y2="52" class="rt-fin"/><ellipse cx="0" cy="56" rx="9" ry="5" class="rt-bulb"/>' : cata ? '' : '<line x1="0" y1="20" x2="0" y2="50" class="rt-fin"/>';
  const draw = () => {
    const a = R.angles[i];
    el.querySelector('#rtFig').innerHTML = `<svg viewBox="0 0 400 240" class="lesson-fig" role="img" aria-label="Bateau vu de face, étape ${i + 1}">
      ${SEA_GRAD('rtSea')}<rect width="400" height="150" fill="#bfe6fb"/><rect y="150" width="400" height="90" fill="url(#rtSea)"/>
      <path d="M0,150 Q25,144 50,150 T100,150 T150,150 T200,150 T250,150 T300,150 T350,150 T400,150" fill="none" stroke="#fff" stroke-width="2" opacity=".7"/>
      <g transform="translate(200,150) rotate(${a})" class="rt-boat">
        <line x1="0" y1="0" x2="0" y2="-118" class="rt-mast"/><path d="M3,-112 L3,-14 L58,-14 Z" class="rt-sail"/>
        ${fin}${hull}
      </g>
      ${i >= 2 && i <= 3 && type !== 'j80' ? `<g class="rt-crew"><circle cx="${cata ? 176 : 150 + (i === 3 ? 14 : 0)}" cy="${cata ? 96 : 138}" r="9"/><line x1="${cata ? 176 : 150 + (i === 3 ? 14 : 0)}" y1="${cata ? 105 : 147}" x2="${cata ? 190 : 160 + (i === 3 ? 14 : 0)}" y2="${cata ? 128 : 160}"/></g>` : ''}
      <text x="200" y="228" text-anchor="middle" class="fig-label">Étape ${i + 1} / ${R.steps.length}</text>
    </svg>`;
    el.querySelector('#rtSteps').innerHTML = `<div class="steps">${R.steps.map((t, k) => `<div class="step ${k <= i ? 'on' : ''}${k === i ? ' cur' : ''}"><div>${t}</div></div>`).join('')}</div>`;
    el.querySelector('#rtPrev').disabled = i === 0;
    el.querySelector('#rtNext').textContent = i === R.steps.length - 1 ? '↺ Recommencer' : 'Étape suivante →';
  };
  el.innerHTML = `
  <div class="theory-grid">
    <div class="card">
      <h2>${type === 'j80' ? 'Quand le bateau se couche' : 'Redresser son bateau'}</h2>
      <p>${type === 'j80' ? 'Sur le J80, pas de dessalage : mais une survente peut le coucher sur l’eau.' : 'Dessaler arrive à tout le monde, même aux champions. Ce qui compte, c’est de savoir repartir.'} Suis les étapes pour ${getBoat().article}.</p>
      <div id="rtFig"></div>
      <div id="rtSteps" style="margin-top:12px"></div>
      <div class="row" style="margin-top:12px"><button class="btn small" id="rtPrev">← Précédente</button><button class="btn primary small" id="rtNext"></button></div>
      <div class="callout warn"><b>Règle n° 1 :</b> on ne quitte <b>jamais</b> le bateau pour nager vers la plage. Il flotte, il se voit de loin, et le moniteur vient toujours vers lui.</div>
    </div>
    <div>
      <div class="card">
        <h2 class="h3">🧑‍🤝‍🧑 Un équipier tombe à l’eau</h2>
        ${steps([
          'On crie <b>« Un homme à la mer ! »</b> et quelqu’un le <b>montre du doigt</b> sans le quitter des yeux.',
          'On lui lance ce qui flotte (bouée, gilet de rechange).',
          'Le barreur fait demi-tour et revient <b>s’arrêter face au vent</b>, à côté de lui.',
          'On le remonte <b>par le côté au vent ou par l’arrière</b>, bateau arrêté, voiles choquées.',
        ])}
      </div>
      <div class="card" style="margin-top:16px">
        <h2 class="h3">🆘 Demander de l’aide</h2>
        <ul class="help-list" style="font-size:15px;color:var(--ink)">
          <li><b>Lever et baisser lentement les deux bras</b> tendus : c’est le signal de détresse, compris partout.</li>
          <li>Par téléphone : le <b>196</b> joint le CROSS, le centre de sauvetage en mer.</li>
          <li>À la radio VHF : le <b>canal 16</b>.</li>
          <li>Le moniteur te remorque ? Dérive un peu relevée, voile choquée, assis à l’arrière, tu barres <b>dans son sillage</b>.</li>
        </ul>
      </div>
      <div class="card" style="margin-top:16px">
        <h2 class="h3">🎒 Avant de partir</h2>
        <ul class="help-list" style="font-size:15px;color:var(--ink)">
          <li><b>Gilet fermé et ajusté</b>, du départ au retour.</li>
          <li>Une tenue pour l’<b>eau</b>, pas pour l’air : combinaison si elle est fraîche, chaussons, coupe-vent.</li>
          <li>Casquette, crème solaire, et de l’eau à boire.</li>
          <li>Quelqu’un à terre sait où tu vas et quand tu rentres.</li>
        </ul>
        <p style="margin-bottom:0"><a class="btn sea small" href="#/reflexes/gite">⚖️ S’entraîner : pas de dessalage !</a></p>
      </div>
    </div>
  </div>`;
  el.querySelector('#rtPrev').addEventListener('click', () => { i = Math.max(0, i - 1); draw(); });
  el.querySelector('#rtNext').addEventListener('click', () => { i = i === R.steps.length - 1 ? 0 : i + 1; draw(); });
  draw();
}

// ------------------------------------------------------------------ Le vent, la météo et la marée
export const BEAUFORT = [
  { f: 0, name: 'Calme', kn: 'moins de 1', sea: 'Mer d’huile : un vrai miroir.', tip: 'Pas de vent : on sort la pagaie, ou on révise les nœuds.' },
  { f: 1, name: 'Très légère brise', kn: '1 à 3', sea: 'Quelques rides sur l’eau.', tip: 'On avance à peine : parfait pour un tout premier bord.' },
  { f: 2, name: 'Légère brise', kn: '4 à 6', sea: 'Des vaguelettes qui ne déferlent pas.', tip: 'Idéal pour débuter et travailler les réglages fins.' },
  { f: 3, name: 'Petite brise', kn: '7 à 10', sea: 'Les premiers moutons apparaissent.', tip: 'Les meilleures conditions d’école : le bateau répond bien.' },
  { f: 4, name: 'Jolie brise', kn: '11 à 16', sea: 'Des moutons partout, de petites vagues.', tip: 'Ça avance ! On fait le rappel et on choque dans les risées.' },
  { f: 5, name: 'Bonne brise', kn: '17 à 21', sea: 'Des vagues bien formées, des embruns.', tip: 'Pour les marins à l’aise, moniteur tout près.' },
  { f: 6, name: 'Vent frais', kn: '22 à 27', sea: 'Des crêtes d’écume blanche, la mer se creuse.', tip: 'Réservé aux équipages confirmés.' },
  { f: 7, name: 'Grand frais', kn: '28 à 33', sea: 'L’écume est soufflée en traînées.', tip: 'On reste à terre.' },
  { f: 8, name: 'Coup de vent', kn: '34 à 40', sea: 'De hautes vagues, des tourbillons d’embruns.', tip: 'On reste à terre et on vérifie que les bateaux sont bien amarrés.' },
];
const TWELFTHS = [1, 2, 3, 3, 2, 1];

function meteo(el) {
  let f = 3;
  let h = 3;
  const RANGE = 4.2; // marnage de l'exemple, en mètres
  const drawF = () => {
    const b = BEAUFORT[f];
    const col = f <= 1 ? '#8fb8d0' : f <= 4 ? 'var(--flag-green)' : f === 5 ? 'var(--flag-yellow)' : f === 6 ? 'var(--flag-red)' : 'var(--flag-black)';
    el.querySelector('#bfOut').innerHTML = `
      <div class="bf-head"><span class="bf-num" style="background:${col}">${b.f}</span><div><b>${b.name}</b><span class="muted">${b.kn} nœuds</span></div></div>
      <svg viewBox="0 0 400 70" class="lesson-fig bf-sea" aria-hidden="true">${SEA_GRAD('bfSea')}<rect width="400" height="70" fill="url(#bfSea)"/>
        ${Array.from({ length: 4 }, (_, r) => `<path d="M0,${14 + r * 16} ${Array.from({ length: 9 }, (_, k) => `q25,${-f * 1.5 - 1} 50,0`).join(' ')}" fill="none" stroke="#fff" stroke-width="${f >= 3 ? 2 : 1.2}" opacity="${0.25 + f * 0.08}"/>`).join('')}
        ${Array.from({ length: Math.max(0, (f - 2) * 5) }, (_, k) => `<ellipse cx="${(k * 83 + 30) % 390}" cy="${10 + ((k * 37) % 52)}" rx="${5 + (f - 3)}" ry="2" fill="#fff" opacity=".85"/>`).join('')}
      </svg>
      <p><b>Sur l’eau :</b> ${b.sea}</p><p><b>Pour naviguer :</b> ${b.tip}</p>`;
    el.querySelector('#bfVal').textContent = `Force ${f}`;
  };
  const drawT = () => {
    const done = TWELFTHS.slice(0, h).reduce((a, b) => a + b, 0);
    const height = (RANGE * done) / 12;
    el.querySelector('#tdOut').innerHTML = `
      <div class="td-bars">${TWELFTHS.map((t, k) => `<div class="td-bar${k < h ? ' on' : ''}${k === h - 1 ? ' cur' : ''}"><i style="height:${t * 22}px"></i><b>${t}/12</b><small>${k + 1}<sup>${k ? 'e' : 're'}</sup> h</small></div>`).join('')}</div>
      <p>${h === 0 ? 'Basse mer : l’eau est au plus bas, les cailloux découvrent.' : h === 6 ? 'Pleine mer : l’eau est au plus haut, le courant s’arrête un moment (c’est l’étale).' : `${h} h après la basse mer, la mer est montée de <b>${done}/12</b>, soit <b>${height.toFixed(1).replace('.', ',')} m</b> sur ${String(RANGE).replace('.', ',')} m.`}
      ${h === 3 || h === 4 ? ' C’est le moment où elle monte <b>le plus vite</b> et où le courant est le plus fort.' : ''}</p>`;
    el.querySelector('#tdVal').textContent = h === 0 ? 'Basse mer' : h === 6 ? 'Pleine mer' : `Basse mer + ${h} h`;
  };
  el.innerHTML = `
  <div class="theory-grid">
    <div class="card">
      <h2>L’échelle de Beaufort</h2>
      <p>Le vent se mesure en <b>nœuds</b> (1 nœud = 1,852 km/h) et se classe en <b>forces</b>. Fais glisser pour voir la mer changer :</p>
      <label class="range-field"><span id="bfVal"></span><input type="range" id="bfIn" min="0" max="8" step="1" value="${f}" aria-label="Force du vent"/></label>
      <div id="bfOut"></div>
      <div class="callout"><b>Le vent a un nom :</b> celui de la direction d’où il <b>vient</b>. Un vent d’ouest arrive de l’ouest.</div>
    </div>
    <div>
      <div class="card">
        <h2 class="h3">📻 Lire un bulletin</h2>
        <ul class="help-list" style="font-size:15px;color:var(--ink)">
          <li><b>Vent moyen et rafales</b> : « 10 nœuds, rafales 20 », on se prépare pour 20.</li>
          <li><b>Risée</b> : une tache sombre et ridée qui avance sur l’eau. Le vent va forcir : on prépare l’écoute.</li>
          <li><b>Grain</b> : un gros nuage sombre en forme de tour (cumulonimbus). Le vent peut doubler et tourner : on rentre.</li>
          <li><b>Brise thermique</b> : l’après-midi en été, la terre chauffe et le vent de mer se lève.</li>
        </ul>
        <p style="margin-bottom:0"><a class="btn sea small" href="#/conditions">🌤️ Voir la météo de la baie</a></p>
      </div>
      <div class="card" style="margin-top:16px">
        <h2 class="h3">🌙 La marée et la règle des douzièmes</h2>
        <p>La mer monte pendant environ <b>6 heures</b>, puis descend pendant 6 heures. Elle ne monte pas à vitesse constante :</p>
        <label class="range-field"><span id="tdVal"></span><input type="range" id="tdIn" min="0" max="6" step="1" value="${h}" aria-label="Heures après la basse mer"/></label>
        <div id="tdOut"></div>
        <ul class="help-list" style="font-size:15px;color:var(--ink)">
          <li><b>Coefficient</b> : de 20 (petite marée) à 120 (grande marée). Plus il est grand, plus la mer monte haut et descend bas.</li>
          <li>À <b>basse mer</b>, les cailloux de la baie affleurent : on passe encore plus au large.</li>
        </ul>
      </div>
    </div>
  </div>`;
  el.querySelector('#bfIn').addEventListener('input', (e) => { f = +e.target.value; drawF(); });
  el.querySelector('#tdIn').addEventListener('input', (e) => { h = +e.target.value; drawT(); });
  drawF();
  drawT();
}

// ------------------------------------------------------------------ La régate
// Pavillons dessinés dans un repère 0 0 60 40.
const FLAG = {
  classe: '<rect width="60" height="40" fill="#fff"/><path d="M30,6 L30,30 L46,30 Z" fill="#243150"/><path d="M27,10 L27,30 L16,30 Z" fill="#64c5f1"/><path d="M12,32 H48 L44,36 H16 Z" fill="#243150"/>',
  P: '<rect width="60" height="40" fill="#1d4f9c"/><rect x="18" y="12" width="24" height="16" fill="#fff"/>',
  X: '<rect width="60" height="40" fill="#fff"/><rect x="24" width="12" height="40" fill="#1d4f9c"/><rect y="14" width="60" height="12" fill="#1d4f9c"/>',
  orange: '<rect width="60" height="40" fill="#ff8a3d"/>',
};
const START = [
  { t: '5 min', flags: ['classe'], sound: '1 signal sonore', title: 'Avertissement', text: 'Le pavillon de la <b>classe</b> monte. On déclenche son chrono et on repère la ligne.' },
  { t: '4 min', flags: ['classe', 'P'], sound: '1 signal sonore', title: 'Signal préparatoire', text: 'Le pavillon <b>P</b> monte (bleu, rectangle blanc). Les règles de course s’appliquent : on reste près de la ligne.' },
  { t: '1 min', flags: ['classe'], sound: '1 signal sonore long', title: 'Dernière minute', text: 'Le pavillon <b>P</b> descend. On se place, on choisit son côté et on lance le bateau.' },
  { t: 'Départ', flags: [], sound: '1 signal sonore', title: 'C’est parti !', text: 'Le pavillon de la classe descend. On coupe la ligne <b>lancé</b>, pas avant le signal.' },
  { t: 'Rappel', flags: ['X'], sound: '1 signal sonore', title: 'Rappel individuel', text: 'Pavillon <b>X</b> : un bateau était au-dessus de la ligne au départ. Si c’est toi, tu reviens <b>entièrement</b> derrière la ligne, puis tu repars.' },
];

function regate(el) {
  let i = 0;
  const draw = () => {
    const s = START[i];
    el.querySelector('#rgFig').innerHTML = `<svg viewBox="0 0 400 200" class="lesson-fig" role="img" aria-label="${s.title}">
      ${SEA_GRAD('rgSea')}<rect width="400" height="200" fill="#bfe6fb"/><rect y="150" width="400" height="50" fill="url(#rgSea)"/>
      <path d="M60,150 L190,150 L176,176 L74,176 Z" fill="#fff" stroke="#243150" stroke-width="2"/><rect x="96" y="128" width="50" height="22" rx="4" fill="#fff" stroke="#243150" stroke-width="2"/>
      <text x="125" y="169" text-anchor="middle" class="fig-label dark">COMITÉ</text>
      <line x1="160" y1="150" x2="160" y2="22" stroke="#243150" stroke-width="3"/>
      <g transform="translate(110,34) scale(.75)"><g stroke="#243150" stroke-width="1.5">${FLAG.orange}</g></g><line x1="140" y1="34" x2="160" y2="34" stroke="#243150"/>
      ${s.flags.map((fl, k) => `<g transform="translate(163,${26 + k * 46})" class="rg-flag"><g stroke="#243150" stroke-width="1.5">${FLAG[fl]}</g></g>`).join('')}
      <circle cx="330" cy="156" r="10" fill="#ffb000" stroke="#243150" stroke-width="2"/><line x1="330" y1="146" x2="330" y2="120" stroke="#243150" stroke-width="2"/><path d="M330,120 L348,126 L330,132 Z" fill="#ff8a3d"/>
      <line x1="160" y1="156" x2="320" y2="156" stroke="#243150" stroke-width="2" stroke-dasharray="6 6"/>
      <text x="245" y="146" text-anchor="middle" class="fig-label dark">ligne de départ</text>
      <text x="386" y="26" text-anchor="end" class="fig-label dark">🔊 ${s.sound}</text>
    </svg>`;
    el.querySelector('#rgText').innerHTML = `<b>${s.title}.</b> ${s.text}`;
    el.querySelectorAll('#rgTabs button').forEach((b, k) => b.classList.toggle('active', k === i));
  };
  el.innerHTML = `
  <div class="theory-grid">
    <div class="card">
      <h2>La procédure de départ</h2>
      <p>Tout le monde part en même temps, au signal. Le comité l’annonce avec des <b>pavillons</b> et des <b>signaux sonores</b>. Suis le compte à rebours :</p>
      <nav class="tabs" id="rgTabs">${START.map((s, k) => `<button data-k="${k}">${s.t}</button>`).join('')}</nav>
      <div id="rgFig"></div>
      <div class="callout" id="rgText"></div>
      <h3 style="margin:16px 0 8px">Le parcours « banane »</h3>
      <svg viewBox="0 0 400 230" class="lesson-fig" role="img" aria-label="Parcours banane : une bouée au vent, une bouée sous le vent">
        ${SEA_GRAD('bnSea')}<rect width="400" height="230" fill="url(#bnSea)"/>
        <g transform="translate(40,34)" style="color:#fff">${windArrowSVG(0, 30)}</g><text x="40" y="70" text-anchor="middle" class="fig-label">VENT</text>
        <path d="M150,204 L232,150 L176,100 L240,62 Q252,24 222,22 Q192,22 192,56 L192,168 Q194,196 222,196 Q250,196 250,170 L250,140" class="fig-path out"/>
        <path d="M244,150 L250,138 L256,150" fill="none" stroke="#ffd166" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="222" cy="48" r="9" fill="#ffb000" stroke="#fff" stroke-width="2"/><text x="300" y="52" text-anchor="middle" class="fig-label">1 · au vent</text>
        <circle cx="222" cy="172" r="9" fill="#ffb000" stroke="#fff" stroke-width="2"/><text x="318" y="190" text-anchor="middle" class="fig-label">2 · sous le vent</text>
        <line x1="96" y1="212" x2="176" y2="212" stroke="#fff" stroke-width="2" stroke-dasharray="6 6"/><text x="98" y="226" class="fig-label">départ</text>
        ${boatAt(190, 178, 57, 0, 0.32)}${boatAt(192, 112, 180, 0, 0.32)}
      </svg>
      <p class="muted" style="margin-bottom:0">On monte au près jusqu’à la bouée 1, on redescend au portant jusqu’à la bouée 2, et on recommence. Les bouées se laissent en général à <b>bâbord</b>.</p>
    </div>
    <div>
      <div class="card">
        <h2 class="h3">⚖️ Les pénalités</h2>
        ${steps([
          '<b>Tu touches une bouée :</b> un tour de pénalité, c’est-à-dire <b>un virement et un empannage</b>.',
          '<b>Tu gênes un bateau prioritaire :</b> <b>deux tours</b>, dès que possible, en t’écartant des autres.',
          'Pendant ta pénalité, tu n’as <b>aucune priorité</b>.',
          'On se répare soi-même : c’est le <b>fair-play</b> de la voile, il n’y a pas d’arbitre sur chaque bateau.',
        ])}
        <p style="margin-bottom:0"><a class="btn sea small" href="#/quiz/priorite">⚖️ S’entraîner : qui est prioritaire ?</a></p>
      </div>
      <div class="card" style="margin-top:16px">
        <h2 class="h3">🚀 Pour ton premier départ</h2>
        <ul class="help-list" style="font-size:15px;color:var(--ink)">
          <li>Sois <b>près de la ligne et lancé</b> au signal, plutôt que premier et arrêté.</li>
          <li>Cherche du <b>vent clair</b> : derrière un autre bateau, le vent est perturbé.</li>
          <li>Au près, quand le vent t’oblige à abattre (une <b>refusante</b>), c’est souvent le moment de <b>virer</b>.</li>
          <li>Tribord amure reste prioritaire : au départ, c’est une bonne amure pour couper la ligne.</li>
        </ul>
        <p style="margin-bottom:0"><a class="btn sea small" href="#/naviguer">🏁 Courir une régate dans la baie</a></p>
      </div>
    </div>
  </div>`;
  el.querySelector('#rgTabs').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    i = +b.dataset.k;
    draw();
  });
  draw();
}

export const MORE_LESSON_VIEWS = { depart, securite, meteo, regate };
