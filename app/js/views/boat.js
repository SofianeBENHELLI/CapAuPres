// Accueil du premier lancement (pseudo + bateau) et changement de bateau ensuite.
import { BOAT_LIST, setBoat, boatId } from '../core/boats.js';
import { bestVmgAngles } from '../core/polar.js';
import { getTrim } from '../data/trim.js';
import { boatSVG, windArrowSVG } from '../ui/boat.js';
import { store } from '../store.js';
import { pickBackup, openProfile } from '../ui/backup.js';
import { peek } from '../core/cloud.js';
import { mergeProfiles } from '../core/merge.js';

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
        <label class="name-field">Ton pseudo
          <input id="pname" maxlength="24" autocomplete="nickname" placeholder="Ex. Moussaillon44" value="${esc(store.name)}" />
        </label>
        <div class="cloud-restore">
          <b>☁️ Tu as déjà joué sur un autre appareil ?</b>
          <span class="muted">Mets ton pseudo ci-dessus et ta date de naissance : ta progression revient.</span>
          <div class="row">
            <input id="rbirth" type="date" min="1920-01-01" max="${new Date().toISOString().slice(0, 10)}" aria-label="Date de naissance" />
            <button class="btn small primary" id="cloudRestore">Retrouver ma progression</button>
          </div>
          <small class="save-msg" id="cloudMsg" role="status"></small>
        </div>
        <div class="comeback">
          <b>Déjà venu·e ?</b>
          ${others.map((p) => `<button class="btn small" data-open="${p.id}">⛵ Reprendre ${esc(p.name || 'le profil sans pseudo')}</button>`).join('')}
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
  root.querySelector('#cloudRestore')?.addEventListener('click', async (e) => {
    const name = root.querySelector('#pname').value.trim();
    const birth = root.querySelector('#rbirth').value;
    const m = root.querySelector('#cloudMsg');
    const say = (t, bad) => { m.textContent = t; m.classList.toggle('bad', !!bad); };
    if (!name || !birth) return say('Il faut ton pseudo et ta date de naissance.', true);
    e.target.disabled = true;
    say('Recherche…');
    try {
      const remote = await peek(name, birth);
      if (!remote) {
        e.target.disabled = false;
        return say('Aucune progression trouvée avec ce pseudo et cette date de naissance.', true);
      }
      openProfile(() => {
        store.setName(name);
        store.setBirth(birth);
        store.adopt(mergeProfiles(store.snapshot(), remote));
      });
    } catch {
      e.target.disabled = false;
      say('Impossible de joindre le serveur : vérifie ta connexion.', true);
    }
  });
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
