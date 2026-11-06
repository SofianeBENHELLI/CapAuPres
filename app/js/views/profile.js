// Profil : prénom, grade et XP, badges, progression par bateau, records.
import { BOAT_LIST, getBoat } from '../core/boats.js';
import { LEVELS } from '../core/levels.js';
import { LESSONS } from '../data/lessons.js';
import { store, protectStorage } from '../store.js';
import { saveBackup, pickBackup, openProfile, dateFr } from '../ui/backup.js';
import { xpBreakdown, gradeOf, GRADES, BADGES, earnedBadges, examChecks } from '../core/progress.js';
import { perksOf } from '../core/look.js';
import { boatIcon } from '../ui/boat.js';
import { lookPickerHTML, bindLookPicker } from '../ui/lookpicker.js';

const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const REFLEX_NAMES = { amure: 'Bâbord ou tribord ?', allure: 'Quelle allure ?', manoeuvre: 'Quelle manœuvre ?', barre: 'À la barre !', mix: 'Grand mix' };

export function render(root, params = []) {
  const xp = xpBreakdown();
  const g = gradeOf(xp.total);
  const badges = earnedBadges();
  const reflexes = store.allReflexes();
  const lessonsDone = LESSONS.filter((l) => store.lesson(l.id)?.done).length;

  root.innerHTML = `
    <div class="section-title"><h1>Profil</h1></div>
    <div class="profile-grid">
      <section class="card profile-card">
        <div class="pc-top">
          <span class="pc-icon">${g.icon}</span>
          <div class="grow">
            <label class="name-field">Prénom
              <input id="pname" maxlength="24" value="${esc(store.name)}" placeholder="Ton prénom" />
            </label>
            <h2 style="margin:8px 0 0">${g.name}</h2>
            <span class="xpbar big"><i style="width:${Math.round(g.pct * 100)}%"></i></span>
            <small class="muted">${xp.total} XP${!g.next ? ' · grade maximal atteint !' : g.blocked ? ` · XP atteints pour <b>${g.next.icon} ${g.next.name}</b> : il reste l’épreuve` : ` · prochain grade : <b>${g.next.icon} ${g.next.name}</b> à ${g.next.xp} XP`}</small>
          </div>
        </div>
        <ul class="xp-list">
          <li><span>📖 Leçons (${lessonsDone}/${LESSONS.length})</span><b>${xp.lessons} XP</b></li>
          <li><span>⛵ Missions (tous bateaux)</span><b>${xp.missions} XP</b></li>
          <li><span>⚡ Réflexes</span><b>${xp.reflexes} XP</b></li>
          <li><span>📅 Défis du jour</span><b>${xp.daily} XP</b></li>
        </ul>
        ${g.next?.exam ? `<div class="exam-box">
          <h3 style="margin:14px 0 4px">🎓 Épreuve pour devenir ${g.next.name}</h3>
          <p class="muted" style="margin:0">${g.blocked ? 'Tu as les XP : il reste à le prouver sur l’eau.' : `Il faudra aussi ${g.next.xp} XP.`}</p>
          <ul class="exam-list">${examChecks(g.next.exam).map((c) => `<li class="${c.ok ? 'ok' : ''}">${c.ok ? '✅' : '⬜'} ${c.ok ? c.label : `<a href="${c.href}">${c.label}</a>`}</li>`).join('')}</ul>
        </div>` : ''}
        <h3 class="ladder-title">Du Moussaillon à l’Amiral</h3>
        <ol class="ladder">${GRADES.map((x, i) => {
          const perks = perksOf(i);
          const state = i < g.index ? 'done' : i === g.index ? 'cur' : i === g.index + 1 ? 'next' : '';
          const left = Math.max(0, x.xp - xp.total);
          return `<li class="${state}"><span class="lad-ico">${x.icon}</span><div class="grow"><b>${x.name}</b>
            <small class="muted">${i <= g.index ? (i === g.index ? 'Ton grade actuel' : 'Obtenu') : `${x.xp} XP${x.exam ? ' + épreuve' : ''} · encore ${left} XP`}</small>
            ${perks.length ? `<span class="perk">🎨 ${perks.join(' · ')}</span>` : ''}</div>${i < g.index ? '<span class="lad-ok">✓</span>' : ''}</li>`;
        }).join('')}</ol>
      </section>

      <section class="card look-card" id="look">
        <h3 style="margin-top:0">🎨 Mon bateau</h3>
        ${lookPickerHTML(g.index)}
        <p class="muted small-print">Chaque grade débloque de nouvelles couleurs. Tous les bateaux restent ouverts : c’est seulement pour le style !</p>
      </section>

      <section class="card">
        <div class="row" style="justify-content:space-between"><h3 style="margin:0">Badges</h3><span class="pill">${badges.size} / ${BADGES.length}</span></div>
        <div class="badge-grid">
          ${BADGES.map((b) => `<div class="badge ${badges.has(b.id) ? 'got' : ''}" title="${b.how}">
            <span class="bicon">${b.icon}</span>${badges.has(b.id) ? '' : '<span class="block">🔒</span>'}<b>${b.name}</b><small>${b.how}</small></div>`).join('')}
        </div>
      </section>

      <section class="card">
        <div class="row" style="justify-content:space-between"><h3 style="margin:0">Ma flotte</h3><a class="btn small" href="#/bateau">Changer de bateau</a></div>
        <div class="fleet">
          ${BOAT_LIST.map((b) => {
            const doneB = LEVELS.filter((l) => store.level(l.id, b.id)).length;
            const st = store.totalStars(LEVELS, b.id);
            return `<div class="fleet-row ${b.id === getBoat().id ? 'cur' : ''}">${boatIcon(b.id, 34, true)}<div class="grow"><b>${b.name}</b><span class="xpbar"><i style="width:${(doneB / LEVELS.length) * 100}%"></i></span></div><small>${doneB}/${LEVELS.length} · ⭐ ${st}</small></div>`;
          }).join('')}
        </div>
      </section>

      <section class="card">
        <h3>Records des réflexes</h3>
        <ul class="xp-list">${Object.entries(REFLEX_NAMES).map(([id, n]) => `<li><span>${n}</span><b>${reflexes[id] || 0} pts</b></li>`).join('')}</ul>
        <a class="btn small" href="#/reflexes">⚡ S’entraîner</a>
      </section>

      <section class="card">
        <h3>👩‍🏫 Moniteur</h3>
        <p class="muted" style="margin-top:0">Prépare une séance pour ton groupe : les élèves la rejoignent par QR code, révisent, naviguent, et tu récupères leurs résultats en les scannant. Sans compte ni serveur.</p>
        <a class="btn navy small" href="#/seance">Ouvrir le mode séance</a>
      </section>

      <section class="card save-card">
        <h3>💾 Sauvegarde et profils</h3>
        <p class="muted" style="margin-top:0">Ta progression s’enregistre <b>toute seule</b> sur cet appareil, après chaque leçon, mission ou défi. <span id="persist"></span></p>
        <h4>Qui navigue sur cet appareil ?</h4>
        <ul class="profile-list">${store.profiles().map((p) => {
          const b = p.boat && BOAT_LIST.find((x) => x.id === p.boat);
          return `<li class="${p.current ? 'cur' : ''}">
            <span>${b ? boatIcon(b.id, 26) : '⛵'}</span>
            <div class="grow"><b>${esc(p.name || 'Sans prénom')}</b><small class="muted">${b ? b.name : 'pas de bateau'} · ${p.missions} mission${p.missions > 1 ? 's' : ''} · ${p.lessons} leçon${p.lessons > 1 ? 's' : ''}${p.updated ? ` · ${dateFr(p.updated)}` : ''}</small></div>
            ${p.current ? '<span class="pill">C’est moi</span>' : `<button class="btn small" data-open="${p.id}">Reprendre</button><button class="btn small ghost" data-del="${p.id}" aria-label="Supprimer le profil ${esc(p.name || 'sans prénom')}">🗑</button>`}
          </li>`;
        }).join('')}</ul>
        <button class="btn small" id="newProfile">➕ Nouveau marin sur cet appareil</button>
        <h4>Sauvegarde dans un fichier</h4>
        <p class="muted" style="margin-top:0">Pour changer d’appareil, ou si les données du site sont effacées : enregistre une sauvegarde (AirDrop, mail, Fichiers…), puis reprends-la ici sur n’importe quel appareil.${store.lastBackup ? ` Dernière sauvegarde : ${dateFr(store.lastBackup)}.` : ''}</p>
        <div class="row">
          <button class="btn primary small" id="backup">⬇️ Enregistrer une sauvegarde</button>
          <button class="btn small" id="restore">⬆️ Reprendre une sauvegarde</button>
        </div>
        <p class="save-msg" id="saveMsg" role="status"></p>
        <details class="danger-zone"><summary class="muted">Remettre à zéro</summary>
          <button class="btn port small" id="reset">Remettre ma progression à zéro</button>
        </details>
      </section>
    </div>`;

  const look = root.querySelector('.look-card');
  bindLookPicker(look, g.index);
  if (params[0] === 'bateau') requestAnimationFrame(() => look.scrollIntoView({ behavior: 'smooth', block: 'start' }));

  root.querySelector('#pname').addEventListener('change', (e) => {
    store.setName(e.target.value);
    window.dispatchEvent(new CustomEvent('progress'));
  });
  const msg = (t, bad = false) => {
    const m = root.querySelector('#saveMsg');
    m.textContent = t;
    m.classList.toggle('bad', bad);
  };
  protectStorage().then((ok) => {
    root.querySelector('#persist').textContent = ok
      ? 'Le navigateur la protège : il ne l’effacera pas pour faire de la place.'
      : 'Elle reste tant que les données du site ne sont pas effacées. Pense à faire une sauvegarde de temps en temps.';
  });
  root.querySelector('.profile-list').addEventListener('click', (e) => {
    const open = e.target.closest('[data-open]');
    const del = e.target.closest('[data-del]');
    if (open) openProfile(() => store.switchProfile(open.dataset.open));
    if (del) {
      const p = store.profiles().find((x) => x.id === del.dataset.del);
      if (!window.confirm(`Supprimer le profil de ${p?.name || 'ce marin'} et toute sa progression sur cet appareil ?`)) return;
      store.deleteProfile(del.dataset.del);
      render(root);
    }
  });
  root.querySelector('#newProfile').addEventListener('click', () => {
    if (!window.confirm('Créer un nouveau marin ? Ta progression reste enregistrée : tu pourras la reprendre ici, dans « Qui navigue ».')) return;
    store.newProfile();
    location.hash = '#/bateau';
    location.reload();
  });
  root.querySelector('#backup').addEventListener('click', async () => {
    const r = await saveBackup();
    if (r === 'cancelled') return;
    msg(r === 'shared' ? '✓ Sauvegarde envoyée.' : '✓ Sauvegarde enregistrée dans tes téléchargements.');
  });
  root.querySelector('#restore').addEventListener('click', async () => {
    try {
      const p = await pickBackup();
      if (!p) return;
      const same = store.profiles().find((x) => x.id === p.pid);
      const what = `${p.name || 'Sans prénom'} : ${Object.keys(p.levels || {}).length} missions, ${Object.keys(p.lessons || {}).length} leçons`;
      const q = same
        ? `Remplacer la progression de ${same.name || 'ce marin'} sur cet appareil par la sauvegarde (${what}) ?`
        : `Reprendre la sauvegarde de ${what} ? La progression actuelle reste dans « Qui navigue ».`;
      if (!window.confirm(q)) return;
      openProfile(() => store.importProfile(p));
    } catch (e) {
      msg(e.message, true);
    }
  });
  root.querySelector('#reset').addEventListener('click', () => {
    if (!window.confirm('Effacer toutes tes étoiles, leçons, records et badges ? (Ton prénom et ton bateau sont conservés.)')) return;
    store.reset();
    window.dispatchEvent(new CustomEvent('progress'));
    render(root);
  });
}
