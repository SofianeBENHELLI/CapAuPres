// Leçons théoriques et générateurs de questions (dont questions visuelles procédurales).
import { allureRose, telltales, scene, boatSvg, windArrow } from './svg.js';
import { allureName } from './physics.js';

const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
const shuffle = (r, arr) => arr.map((v) => [r(), v]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);

export const LESSONS = [
  {
    id: 'allures', title: 'Le vent et les allures', icon: '🧭',
    intro: 'Un voilier ne va pas tout droit face au vent. Selon l\'angle entre le bateau et le vent, on parle d\'allures.',
    body: () => `
      ${allureRose()}
      <p><b>Vent debout</b> : dans la zone rouge (environ 45° de chaque côté du vent), la voile faseye et le bateau s'arrête.</p>
      <p><b>Près, bon plein</b> : on remonte vers le vent, voile bordée. <b>Travers</b> : vent sur le côté, souvent l'allure la plus rapide.</p>
      <p><b>Largue, grand largue, vent arrière</b> : on descend le vent, voile choquée. Au vent arrière le bateau roule et risque l'empannage involontaire.</p>
      <p><b>Amures</b> : le vent arrive par tribord (droite) = tribord amures ; par bâbord (gauche) = bâbord amures.</p>`,
    quiz: 'allure',
  },
  {
    id: 'reglages', title: 'Régler sa voile', icon: '⛵',
    intro: 'Une voile bien réglée est bordée juste assez pour ne pas faseyer. Les penons, petits brins de laine, te disent quoi faire.',
    body: () => `
      <div class="row3">${telltales('ok')}${telltales('border')}${telltales('choquer')}</div>
      <p><b>Les deux penons filent à l'horizontale</b> : réglage parfait.</p>
      <p><b>Le penon au vent tourbillonne</b> : la voile est trop choquée (ou tu remontes trop). Borde ou abats un peu.</p>
      <p><b>Le penon sous le vent tourbillonne</b> : la voile est trop bordée. Choque ou lofe un peu.</p>
      <p>Règle d'or : <b>dans le doute, choque jusqu'à ce que ça faseye, puis borde juste ce qu'il faut</b>.</p>
      <p>Trop de vent ? On fait le rappel ou le trapèze, et on choque dans les rafales pour garder le bateau à plat.</p>`,
    quiz: 'penons',
  },
  {
    id: 'manoeuvres', title: 'Virer et empanner', icon: '🔄',
    intro: 'Pour changer d\'amures, on passe soit l\'avant du bateau dans le vent (virement de bord), soit l\'arrière (empannage).',
    body: () => `
      ${scene(windArrow(0, 110, 20, 30) + boatSvg(-45, 0, { x: 60, y: 110, label: 'bâbord' }) + boatSvg(0, 0, { x: 110, y: 90, sail: false, label: 'vent debout' }) + boatSvg(45, 0, { x: 160, y: 110, label: 'tribord' }), 220, 160)}
      <p><b>Virement de bord</b> : « Paré à virer ? … On vire ! ». On lofe franchement, l'avant passe dans le vent, on change de côté et on reborde sur le nouveau bord. Il faut de la vitesse avant de virer.</p>
      <p><b>Empannage</b> : « Paré à empanner ? … Empannez ! ». On abat, l'arrière passe dans le vent, la bôme change de côté d'un coup : on baisse la tête et on accompagne la bôme.</p>
      <p><b>Tirer des bords</b> : pour aller vers une bouée au vent, on alterne bâbord et tribord amures au près. Vire quand la bouée est « par le travers » de l'autre bord.</p>`,
    quiz: 'manoeuvres',
  },
  {
    id: 'priorites', title: 'Les règles de priorité', icon: '⚖️',
    intro: 'Sur l\'eau, des règles simples évitent les collisions. Celui qui n\'est pas prioritaire manœuvre tôt et franchement.',
    body: () => `
      <ol>
        <li><b>Amures opposées</b> : bâbord amures laisse passer tribord amures (« tribord, prioritaire ! »).</li>
        <li><b>Mêmes amures</b> : le bateau au vent s'écarte du bateau sous le vent.</li>
        <li><b>Rattrapant</b> : celui qui rattrape s'écarte de celui qui est rattrapé.</li>
        <li><b>Voile et moteur</b> : en règle générale le bateau à moteur s'écarte du voilier, sauf navires de commerce dans un chenal, pêcheurs en action, et tous ceux qui manœuvrent difficilement.</li>
      </ol>
      <p>Et toujours : même prioritaire, tu dois tout faire pour éviter l'abordage.</p>`,
    quiz: 'priorites',
  },
  {
    id: 'meteo', title: 'Lire le vent et la houle', icon: '🌬️',
    intro: 'Pour décider si on sort, deux choses comptent avant tout : la force du vent (et de ses rafales) et la hauteur de la houle.',
    body: () => `
      <table class="tbl"><tr><th>Force</th><th>Nœuds</th><th>Sur l'eau</th></tr>
      <tr><td>2</td><td>4 à 6</td><td>Petites vaguelettes, petit temps</td></tr>
      <tr><td>3</td><td>7 à 10</td><td>Quelques moutons, idéal école</td></tr>
      <tr><td>4</td><td>11 à 16</td><td>Moutons nombreux, ça avance bien</td></tr>
      <tr><td>5</td><td>17 à 21</td><td>Vigilance, on choque dans les rafales</td></tr>
      <tr><td>6</td><td>22 à 27</td><td>Engagé, équipages confirmés</td></tr></table>
      <p><b>Rafales</b> : on les voit arriver comme des taches sombres sur l'eau. Plus l'écart vent moyen / rafales est grand, plus il faut anticiper.</p>
      <p><b>Houle</b> : au-delà d'un mètre, la mise à l'eau et le retour sur la plage demandent de l'attention, surtout par vent de mer (sud à ouest) qui la fait rentrer dans la baie.</p>
      <p><b>Vent de terre</b> (nord à est) : l'eau est plate au bord, le vent est irrégulier sous la côte et plus soutenu au large. À La Baule, la baie est fermée et le club au fond : la rentrée se fait au près, en eau abritée. C'est un point d'attention, pas un interdit.</p>`,
    quiz: 'meteo',
  },
  {
    id: 'securite', title: 'Sécurité et balisage', icon: '🛟',
    intro: 'Connaître le balisage et les zones réglementées, c\'est naviguer sereinement.',
    body: () => `
      <p><b>Bande des 300 m</b> : le long des plages, vitesse limitée à 5 nœuds. On la traverse par les chenaux balisés, perpendiculairement à la plage.</p>
      <p><b>Zones de baignade</b> : interdites aux engins, balisées par des bouées jaunes en été.</p>
      <p><b>Balisage latéral</b> : en entrant au port, bouées <span style="color:#2fb36d">vertes à droite</span>, <span style="color:#e5484d">rouges à gauche</span>.</p>
      <p><b>Cardinales</b> : jaunes et noires, elles indiquent de quel côté passer d'un danger (au nord d'une cardinale nord, etc.).</p>
      <p><b>Équipement</b> : gilet toujours fermé, combinaison adaptée à l'eau, et on reste près du bateau en cas de chavirage : il flotte, toi aussi.</p>
      <p><b>Dans la baie</b> : roches de Penchâteau, la Baguenaude, plateau des Évens, Les Impairs. On les contourne largement.</p>`,
    quiz: 'securite',
  },
];

const STATIC = {
  manoeuvres: [
    { q: 'Pour virer de bord, on fait passer dans le vent…', a: ["l'avant du bateau", "l'arrière du bateau", 'la dérive'], ok: 0 },
    { q: "Lors d'un empannage, la bôme…", a: ['change de côté brusquement', 'reste au centre', 'ne bouge pas'], ok: 0 },
    { q: 'Avant de virer, il faut surtout…', a: ['avoir de la vitesse', 'choquer en grand', 'relever la dérive'], ok: 0 },
    { q: 'Pour rejoindre une bouée plein vent debout, on…', a: ['tire des bords au près', 'y va tout droit', 'reste au vent arrière'], ok: 0 },
    { q: 'L\'annonce avant un virement est…', a: ['« Paré à virer ? »', '« Attention bôme ! »', '« Tribord ! »'], ok: 0 },
  ],
  priorites: [
    { q: 'Deux voiliers amures opposées : qui est prioritaire ?', a: ['Tribord amures', 'Bâbord amures', 'Le plus gros'], ok: 0 },
    { q: 'Deux voiliers mêmes amures : qui s\'écarte ?', a: ['Le bateau au vent', 'Le bateau sous le vent', 'Aucun'], ok: 0 },
    { q: 'Tu rattrapes un autre voilier : tu…', a: ["t'écartes", 'es prioritaire', 'klaxonnes'], ok: 0 },
    { q: 'Même prioritaire, tu dois…', a: ["tout faire pour éviter l'abordage", 'garder ton cap quoi qu\'il arrive', 'accélérer'], ok: 0 },
  ],
  meteo: [
    { q: 'Les deux critères principaux pour décider de sortir ?', a: ['Le vent et la houle', 'La température et le soleil', 'Le type de bateau'], ok: 0 },
    { q: 'Vent de nord-est à La Baule : c\'est…', a: ['un vent de terre, rentrée facile au près', 'un vent de mer, houle sur la plage', 'toujours interdit'], ok: 0 },
    { q: 'Une tache sombre qui avance sur l\'eau, c\'est…', a: ['une risée (rafale)', 'un banc de poissons', 'un haut-fond'], ok: 0 },
    { q: 'Force 4 Beaufort correspond environ à…', a: ['11 à 16 nœuds', '1 à 3 nœuds', '30 nœuds'], ok: 0 },
    { q: 'La houle rentre le plus dans la baie par vent…', a: ['de sud à ouest', 'de nord', "d'est"], ok: 0 },
    { q: 'Où la baie est-elle la plus abritée de la houle d\'ouest ?', a: ['Côté Pouliguen, derrière Penchâteau', 'Devant Pornichet', 'Au Grand Charpentier'], ok: 0 },
  ],
  securite: [
    { q: 'Vitesse maximale dans la bande des 300 m ?', a: ['5 nœuds', '10 nœuds', 'Pas de limite'], ok: 0 },
    { q: 'En entrant au port, les bouées vertes sont…', a: ['à droite', 'à gauche', 'au milieu'], ok: 0 },
    { q: 'Après un chavirage, tu…', a: ['restes près du bateau', 'nages vers la plage', 'lâches tout'], ok: 0 },
    { q: 'Une cardinale nord : on passe…', a: ['au nord', 'au sud', "n'importe où"], ok: 0 },
    { q: 'Le gilet de sauvetage se porte…', a: ['toujours fermé', 'dans le bateau', 'seulement par gros temps'], ok: 0 },
  ],
};

// Génère une question. Les questions visuelles sont tirées au hasard (infinies).
export function makeQuestion(kind, r) {
  if (kind === 'allure') {
    const twd = Math.floor(r() * 8) * 45;
    const twa = pick(r, [0, 50, 70, 95, 130, 158, 180]) * (r() < 0.5 ? 1 : -1);
    const hdg = twd - twa;
    const good = allureName(twa);
    const all = ['Vent debout', 'Près', 'Bon plein', 'Travers', 'Largue', 'Grand largue', 'Vent arrière'];
    const opts = shuffle(r, [good, ...shuffle(r, all.filter((x) => x !== good)).slice(0, 3)]);
    return { q: 'Quelle est l\'allure de ce bateau ?', svg: scene(windArrow(twd, 40, 40, 44) + boatSvg(hdg, twd, { x: 130, y: 100, scale: 1.4 }), 220, 180), a: opts, ok: opts.indexOf(good) };
  }
  if (kind === 'penons') {
    const st = pick(r, ['ok', 'border', 'choquer']);
    const ans = { ok: 'Ne touche à rien', border: 'Border', choquer: 'Choquer' };
    const opts = shuffle(r, Object.values(ans));
    return { q: 'Que fais-tu de l\'écoute ?', svg: telltales(st), a: opts, ok: opts.indexOf(ans[st]) };
  }
  if (kind === 'priorites' && r() < 0.6) {
    const twd = 0;
    const a = pick(r, [45, 60]), b = pick(r, [-45, -60]);
    const sb = r() < 0.5;
    // Bateau A tribord amures (vent par la droite), bateau B bâbord amures.
    const opts = shuffle(r, ['Le bleu', 'Le rouge']);
    const blueIsStarboard = sb;
    const svg = scene(windArrow(twd, 110, 20, 30)
      + boatSvg(blueIsStarboard ? -a : -b, twd, { x: 60, y: 110, color: '#2a6fdb', label: 'bleu' })
      + boatSvg(blueIsStarboard ? -b : -a, twd, { x: 160, y: 110, color: '#e5484d', label: 'rouge' }), 220, 170);
    const good = blueIsStarboard ? 'Le bleu' : 'Le rouge';
    return { q: 'Qui est prioritaire ?', svg, a: opts, ok: opts.indexOf(good) };
  }
  const pool = STATIC[kind] || STATIC.securite;
  const it = pick(r, pool);
  const order = shuffle(r, it.a.map((_, i) => i));
  return { q: it.q, a: order.map((i) => it.a[i]), ok: order.indexOf(it.ok) };
}

export function makeQuiz(kind, r, n = 6) {
  const out = [], seen = new Set();
  let guard = 0;
  while (out.length < n && guard++ < 60) {
    const q = makeQuestion(kind, r);
    const key = q.q + (q.svg ? out.length : '') + q.a.join();
    if (seen.has(key)) continue;
    seen.add(key); out.push(q);
  }
  return out;
}
