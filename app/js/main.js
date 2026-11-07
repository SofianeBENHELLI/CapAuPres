// Routeur minimal par hash :
//   #/                     accueil (tableau de bord)
//   #/bateau               choix du bateau (premier lancement)
//   #/apprendre[/leçon]    parcours d'apprentissage et leçons
//   #/naviguer             carte de la baie : missions et entraînement
//   #/mission/:id          une mission (tracé)  #/barre/:id  à la barre  #/regate/:id  régate en flotte
//   #/defi/:diff/:graine   un défi aléatoire
//   #/jeux                 jeux : défis, réflexes, ateliers
//   #/reflexes[/mode]      mini-jeux       #/profil               profil, grade, badges
//   #/conditions           météo, vent, marée, vagues et webcam en temps réel
import * as home from './views/home.js';
import * as learn from './views/learn.js';
import * as play from './views/play.js';
import * as reflexes from './views/reflexes.js';
import * as game from './views/game.js';
import * as boat from './views/boat.js';
import * as games from './views/games.js';
import * as profile from './views/profile.js';
import * as live from './views/live.js';
import * as conditions from './views/conditions.js';
import { setBoat, getBoat } from './core/boats.js';
import { xpBreakdown, gradeOf } from './core/progress.js';
import { boatIcon, setMyLook } from './ui/boat.js';
import { resolveLook } from './core/look.js';
import { syncSeenXp } from './ui/fx.js';
import { store } from './store.js';
import './pwa.js';
import { startCloud } from './core/cloud.js';

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
const view = document.getElementById('view');
let cleanup = null;

if (store.boat) setBoat(store.boat);

// Pastilles de la barre du haut : bateau (à ses couleurs) et grade, avec la jauge du prochain grade.
const chip = document.getElementById('boatChip');
const gchip = document.getElementById('gradeChip');
function refreshChips() {
  const g = gradeOf(xpBreakdown().total);
  setMyLook(resolveLook(g.index));
  const b = getBoat();
  chip.innerHTML = `${boatIcon(b.id, 22, true)} <span>${b.name}</span>`;
  chip.hidden = !store.boat;
  const who = store.name ? store.name.replace(/[<>&"]/g, '') : 'Profil';
  gchip.innerHTML = `<span class="g-ico">${g.icon}</span><span class="gname"><b class="g-who">${who}</b><small class="g-rank">${g.name}</small></span><span class="chip-bar"><i style="width:${Math.round(g.pct * 100)}%"></i></span>`;
  gchip.title = g.next
    ? g.blocked ? `${g.name} : il ne te reste que l’épreuve pour devenir ${g.next.name}` : `${g.name} : encore ${g.toGo} XP pour devenir ${g.next.name}`
    : `${g.name} : grade maximal`;
  gchip.title = `${store.name ? `${store.name} · ` : ''}${gchip.title} (ouvrir le profil)`;
  gchip.setAttribute('aria-label', gchip.title);
  gchip.hidden = !store.boat;
}
syncSeenXp();
window.addEventListener('boatchange', refreshChips);
window.addEventListener('progress', refreshChips);
refreshChips();
startCloud();

const ROUTES = {
  home, jeux: games, bateau: boat, apprendre: learn, naviguer: play, mission: game, defi: game, reflexes, profil: profile, barre: live, regate: live, conditions,
};
const NAV_OF = { mission: 'naviguer', defi: 'jeux', reflexes: 'jeux', barre: 'naviguer', regate: 'naviguer', bateau: 'profil', conditions: 'conditions' };
// Anciennes adresses (versions précédentes, raccourcis installés).
const LEGACY = { seance: '', theorie: 'apprendre', parcours: 'naviguer', lexique: 'apprendre/matelotage/lexique', noeuds: 'apprendre/matelotage/noeuds' };

function route() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const [section = 'home', ...params] = parts;
  if (section in LEGACY) {
    location.replace(`#/${LEGACY[section]}`);
    return;
  }
  // Premier lancement : on choisit d'abord son bateau, puis on va où l'on voulait aller.
  if (!store.boat && section !== 'bateau') {
    location.replace(`#/bateau/${encodeURIComponent(location.hash || '#/')}`);
    return;
  }
  if (cleanup) {
    try { cleanup(); } catch (e) { console.error(e); }
    cleanup = null;
  }
  // une cérémonie de grade restée ouverte appartient à l'écran qu'on quitte
  document.querySelectorAll('.ceremony-back').forEach((el) => el.remove());
  view.innerHTML = '';
  view.className = '';
  // les écrans de jeu occupent toute la hauteur : pas de pied de page
  document.body.classList.toggle('no-foot', ['mission', 'defi', 'barre', 'regate'].includes(section));
  const nav = NAV_OF[section] || section;
  document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === nav));
  const mod = ROUTES[section] || home;
  cleanup = mod.render(view, params, section) || null;
  refreshChips();
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
route();
