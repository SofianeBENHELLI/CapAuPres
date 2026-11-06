// Accueil du premier lancement (prénom + bateau) et changement de bateau ensuite.
import { BOAT_LIST, setBoat, boatId } from '../core/boats.js';
import { bestVmgAngles } from '../core/polar.js';
import { getTrim } from '../data/trim.js';
import { boatSVG, windArrowSVG } from '../ui/boat.js';
import { store } from '../store.js';
import { pickBackup, openProfile } from '../ui/backup.js';

const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function render(root, params) {
  const next = params[0] && params[0].startsWith('#/') && !params[0].startsWith('#/bateau') ? params[0] : '#/';
  const first = !store.boat;
  const others = first ? store.profiles().filter((p) => !p.current) : [];
  root.innerHTML = `
    ${first ? `
    <section class="welcome">
      <img src="assets/cnbpp-rond.png" alt="Logo du CNBPP" />
      <div>
        <h1>Bienvenue à bord !</h1>
        <p>L’école de voile du <b>Cercle Nautique La Baule – Le Pouliguen – Pornichet</b> dans ta poche : apprends la théorie, entraîne tes réflexes, puis navigue dans la baie de La Baule.</p>
        <label class="name-field">Ton prénom (facultatif)
          <input id="pname" maxlength="24" autocomplete="given-name" placeholder="Ex. Léa" value="${esc(store.name)}" />
        </label>
        <div class="comeback">
          <b>Déjà venu·e ?</b>
          ${others.map((p) => `<button class="btn small" data-open="${p.id}">⛵ Reprendre ${esc(p.name || 'le profil sans prénom')}</button>`).join('')}
          <button class="btn small ghost" id="restore">⬆️ Reprendre une sauvegarde</button>
          <small class="save-msg bad" id="saveMsg" role="status"></small>
        </div>
      </div>
    </section>` : ''}
    <div class="section-title"><h1>${first ? 'Choisis ton bateau' : 'Change de bateau'}</h1></div>
    <p class="muted" style="margin-top:-6px">Le bateau change le dessin, les vitesses, les manœuvres, les réglages et donc les meilleures routes. Ta progression est gardée pour chaque bateau, et tu peux en changer à tout moment.</p>
    <div class="boat-grid">
      ${BOAT_LIST.map((b) => {
        const prev = boatId();
        setBoat(b.id); // pour lire la polaire de ce bateau
        const { up, down } = bestVmgAngles('medium');
        const vmax = Math.max(...b.perf.strong.speeds);
        const nTrim = getTrim(b.id).controls.length;
        setBoat(prev);
        const selected = !first && b.id === prev;
        return `<button class="card boat-card${selected ? ' selected' : ''}" data-boat="${b.id}">
          <svg viewBox="-110 -105 220 210" aria-hidden="true">
            <circle r="100" fill="url(#bsea-${b.id})"/>
            <defs><radialGradient id="bsea-${b.id}"><stop offset="0" stop-color="#2a9fd6"/><stop offset="1" stop-color="#1b5f8c"/></radialGradient></defs>
            <g transform="translate(0,-86)" style="color:#fff">${windArrowSVG(0, 11)}</g>
            <g transform="scale(${b.id === 'optimist' ? 1.15 : 0.95})">${boatSVG({ heading: 235, windFrom: 0, type: b.id })}</g>
          </svg>
          <div class="boat-body">
            <div class="row" style="justify-content:space-between"><h2 class="h3" style="margin:0">${b.name}</h2><span class="pill">${b.level}</span></div>
            <div class="muted" style="font-size:13px">${b.example}</div>
            <p style="font-size:14px">${b.pitch}</p>
            <ul class="boat-stats">
              <li><span>Vitesse max</span><b>${vmax.toFixed(0)} nœuds</b></li>
              <li><span>Remonte au vent à</span><b>≈ ${Math.round(up.angle)}°</b></li>
              <li><span>Descend au mieux à</span><b>≈ ${Math.round(down.angle)}°</b></li>
              <li><span>Réglages</span><b>${nTrim}</b></li>
            </ul>
            <span class="btn ${selected ? 'navy' : 'primary'}" style="width:100%">${selected ? '✓ Bateau actuel' : `Naviguer en ${b.name}`}</span>
          </div>
        </button>`;
      }).join('')}
    </div>`;

  root.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => openProfile(() => store.switchProfile(b.dataset.open))));
  root.querySelector('#restore')?.addEventListener('click', async () => {
    try {
      const p = await pickBackup();
      if (p) openProfile(() => store.importProfile(p));
    } catch (e) {
      root.querySelector('#saveMsg').textContent = e.message;
    }
  });
  root.querySelectorAll('[data-boat]').forEach((el) =>
    el.addEventListener('click', () => {
      const name = root.querySelector('#pname');
      if (name) store.setName(name.value);
      setBoat(el.dataset.boat);
      store.setBoat(el.dataset.boat);
      window.dispatchEvent(new CustomEvent('boatchange'));
      location.hash = next;
    }),
  );
}
