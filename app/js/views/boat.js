// Accueil du premier lancement (pseudo + bateau) et changement de bateau ensuite.
import { BOAT_LIST, setBoat, boatId } from '../core/boats.js';
import { bestVmgAngles } from '../core/polar.js';
import { getTrim } from '../data/trim.js';
import { boatSVG, windArrowSVG } from '../ui/boat.js';
import { store } from '../store.js';
import { pickBackup, openProfile } from '../ui/backup.js';
import { peek } from '../core/cloud.js';
import { dateInputHTML, bindDateInput } from '../ui/dateinput.js';
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
        <form class="signin" id="signin" novalidate>
          <div class="id-fields">
            <label class="name-field">Ton pseudo
              <input id="pname" maxlength="24" autocomplete="nickname" autocapitalize="off" placeholder="Ex. Moussaillon44" value="${esc(store.name)}" required />
            </label>
            ${dateInputHTML('pbirth', store.birth)}
          </div>
          <button class="btn primary" id="signGo" type="submit">C’est parti ⛵</button>
          <small class="muted">Déjà joué sur un autre appareil ? Mets le même pseudo et la même date : ta progression revient toute seule.</small>
          <small class="save-msg" id="cloudMsg" role="status"></small>
        </form>
        <details class="comeback-more"><summary class="muted">Autres options</summary>
          <div class="comeback">
            ${others.map((p) => `<button class="btn small" data-open="${p.id}">⛵ Reprendre ${esc(p.name || 'le profil sans pseudo')}</button>`).join('')}
            <button class="btn small ghost" id="restore">⬆️ Reprendre une sauvegarde (fichier)</button>
            <button class="btn small ghost" id="skipId">Jouer sans sauvegarde en ligne</button>
            <small class="save-msg bad" id="saveMsg" role="status"></small>
          </div>
        </details>
      </div>
    </section>` : ''}
    <div id="boatStep" ${first && !(store.name && store.birth) ? 'hidden' : ''}>
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
    </div>
    </div>`;

  root.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => openProfile(() => store.switchProfile(b.dataset.open))));
  // Premier lancement : pseudo + date de naissance. Compte existant → progression récupérée,
  // sinon nouveau compte (enregistré en ligne dès la première progression).
  let birthIso = store.birth;
  bindDateInput(root.querySelector('#pbirth'), (iso) => (birthIso = iso));
  const showBoats = () => {
    const step = root.querySelector('#boatStep');
    step.hidden = false;
    step.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  root.querySelector('#skipId')?.addEventListener('click', () => {
    store.setName(root.querySelector('#pname').value.trim());
    showBoats();
  });
  root.querySelector('#signin')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = root.querySelector('#pname').value.trim();
    const m = root.querySelector('#cloudMsg');
    const btn = root.querySelector('#signGo');
    const say = (t, bad) => { m.textContent = t; m.classList.toggle('bad', !!bad); };
    if (!name) return say('Choisis un pseudo.', true);
    if (!birthIso) return say('Date de naissance au format JJ/MM/AAAA, par exemple 27/12/2012.', true);
    btn.disabled = true;
    say('Recherche de ton compte…');
    let remote = null;
    try {
      remote = await peek(name, birthIso);
    } catch {
      say('Pas de connexion : on continue, ta progression sera sauvegardée dès le retour du réseau.');
    }
    store.setName(name);
    store.setBirth(birthIso);
    btn.disabled = false;
    if (remote) {
      say('✓ Compte retrouvé, ta progression revient !');
      if (remote.boat) return openProfile(() => store.adopt(mergeProfiles(store.snapshot(), remote)));
      store.adopt(mergeProfiles(store.snapshot(), remote));
      window.dispatchEvent(new CustomEvent('progress'));
    } else if (m.textContent.startsWith('Recherche')) say(`✓ Bienvenue ${name} ! Ton compte est créé : choisis ton bateau.`);
    showBoats();
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
