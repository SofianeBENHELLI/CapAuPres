// Séance moniteur ↔ élèves, par QR code et sans serveur.
//   #/seance                      choix : moniteur ou élève
//   #/seance/creer                le moniteur prépare sa séance
//   #/seance/moniteur/:id         QR de la séance, scan des résultats, bilan du groupe
//   #/seance/rejoindre/:code      l'élève rejoint la séance
//   #/seance/eleve                l'élève suit ses étapes et montre son résultat
import { LESSONS, lessonById } from '../data/lessons.js';
import { LEVELS } from '../core/levels.js';
import { BOAT_LIST, BOATS } from '../core/boats.js';
import { store } from '../store.js';
import { encodeSession, encodeResult, decode, groupSummary, shortId } from '../core/session.js';
import { questionOf } from '../core/srs.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Chargement à la demande des bibliothèques de QR code (copies locales, hors ligne).
const loaded = {};
function loadScript(src) {
  if (!loaded[src]) {
    loaded[src] = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = res;
      s.onerror = rej;
      document.head.appendChild(s);
    });
  }
  return loaded[src];
}

async function qrSVG(text) {
  await loadScript('assets/vendor/qrcode.js');
  const qr = window.qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  return qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
}

const joinUrl = (code) => `${location.origin}${location.pathname}#/seance/rejoindre/${code}`;

export function render(root, params) {
  const [what, arg] = params;
  if (what === 'creer') return create(root);
  if (what === 'moniteur') return instructor(root, arg);
  if (what === 'rejoindre') return join(root, arg);
  if (what === 'eleve') return student(root);
  return menu(root);
}

// ---------------------------------------------------------------- Accueil
function menu(root) {
  const mine = Object.entries(store.sessions).sort((a, b) => b[1].at - a[1].at);
  const ms = store.mySession;
  root.innerHTML = `
    <div class="section-title"><h1>👩‍🏫 Séance au club</h1></div>
    <p class="muted" style="margin-top:-6px">Le moniteur prépare une séance (leçons + mission), les élèves la rejoignent en scannant un QR code, puis lui montrent leur résultat. Tout reste sur les téléphones : aucun compte, aucun serveur.</p>
    <div class="next-grid">
      <a class="card next-card learn" href="#/seance/creer"><span class="ntag">Je suis moniteur</span><h2>Préparer une séance</h2><p class="muted">Choisis les leçons à réviser avant d’aller sur l’eau et la mission à faire.</p><span class="btn primary">Créer une séance</span></a>
      <div class="card next-card play"><span class="ntag">Je suis élève</span><h2>Rejoindre une séance</h2>
        <p class="muted">Scanne le QR code du moniteur avec l’appareil photo, ou colle le code reçu.</p>
        <div class="row"><input id="code" class="code-input" placeholder="CAP1.…" aria-label="Code de séance"/><button class="btn navy" id="go">Rejoindre</button></div>
        <button class="btn small" id="scan" style="margin-top:6px">📷 Scanner un QR code</button>
        ${ms ? `<a class="btn small" href="#/seance/eleve" style="margin-top:6px">↪ Reprendre « ${esc(ms.name)} »</a>` : ''}
      </div>
    </div>
    ${mine.length ? `<h2 class="block-title">Mes séances (moniteur)</h2><div class="train-grid">${mine.map(([id, s]) => `<a class="card train-card" href="#/seance/moniteur/${id}"><span class="temoji">📋</span><b>${esc(s.name)}</b><span class="muted">${new Date(s.at).toLocaleDateString('fr-FR')} · ${s.results.length} résultat${s.results.length > 1 ? 's' : ''}</span></a>`).join('')}</div>` : ''}
    <div id="scanner"></div>`;
  const go = (text) => {
    const d = decode(text);
    if (d && d.type === 'session') location.hash = `#/seance/rejoindre/${d.code}`;
    else alert('Ce code n’est pas un code de séance Cap au Près.');
  };
  root.querySelector('#go').addEventListener('click', () => go(root.querySelector('#code').value));
  root.querySelector('#scan').addEventListener('click', () => scanInto(root.querySelector('#scanner'), go));
}

// ---------------------------------------------------------------- Moniteur : création
function create(root) {
  root.innerHTML = `
    <div class="section-title"><h1>Préparer une séance</h1><a class="btn small ghost" href="#/seance">← Séances</a></div>
    <div class="card" style="max-width:720px">
      <label class="name-field" style="max-width:none">Nom de la séance<input id="sname" maxlength="40" value="Séance du ${new Date().toLocaleDateString('fr-FR')}"/></label>
      <h2 class="h3" style="margin-top:16px">Leçons à valider avant d’aller sur l’eau</h2>
      <div class="check-grid">${LESSONS.map((l) => `<label class="check"><input type="checkbox" value="${l.id}" ${l.num <= 2 ? 'checked' : ''}/> ${l.icon} ${l.title}</label>`).join('')}</div>
      <h2 class="h3" style="margin-top:16px">Mission à faire (facultatif)</h2>
      <select id="smission" class="code-input" aria-label="Mission à faire"><option value="">— aucune —</option>${LEVELS.map((l) => `<option value="${l.id}">${l.num}. ${l.title}</option>`).join('')}</select>
      <h2 class="h3" style="margin-top:16px">Bateau imposé (facultatif)</h2>
      <select id="sboat" class="code-input" aria-label="Bateau imposé"><option value="">— libre —</option>${BOAT_LIST.map((b) => `<option value="${b.id}">${b.name}</option>`).join('')}</select>
      <div class="row" style="margin-top:18px"><button class="btn primary" id="make">Créer et afficher le QR code</button></div>
    </div>`;
  root.querySelector('#make').addEventListener('click', () => {
    const id = shortId();
    const lessons = [...root.querySelectorAll('.check input:checked')].map((i) => i.value);
    const mission = root.querySelector('#smission').value || null;
    const boat = root.querySelector('#sboat').value || null;
    const name = root.querySelector('#sname').value;
    const code = encodeSession({ name, lessons, mission, boat, id });
    store.saveSession(id, { id, code, name, lessons, mission, boat, at: Date.now(), results: [] });
    location.hash = `#/seance/moniteur/${id}`;
  });
}

// ---------------------------------------------------------------- Moniteur : tableau de bord
function instructor(root, id) {
  const s = store.sessions[id];
  if (!s) {
    location.replace('#/seance');
    return null;
  }
  const g = groupSummary(s.results);
  root.innerHTML = `
    <div class="section-title"><h1>${esc(s.name)}</h1><a class="btn small ghost" href="#/seance">← Séances</a></div>
    <div class="session-grid">
      <div class="card qr-card">
        <b>1. Les élèves scannent ce QR code</b>
        <div class="qr" id="qr"><p class="muted">Génération…</p></div>
        <p class="muted" style="font-size:12px;word-break:break-all">${esc(s.code)}</p>
        <button class="btn small" id="copy">📋 Copier le lien</button>
        <ul class="help-list" style="margin-top:10px">
          ${s.lessons.map((l) => `<li>📖 ${lessonById(l)?.title}</li>`).join('')}
          ${s.mission ? `<li>⛵ Mission ${LEVELS.find((x) => x.id === s.mission)?.num} : ${LEVELS.find((x) => x.id === s.mission)?.title}</li>` : ''}
          ${s.boat ? `<li>Bateau : ${BOATS[s.boat]?.name}</li>` : ''}
        </ul>
      </div>
      <div class="card">
        <div class="row" style="justify-content:space-between"><b>2. Résultats du groupe (${g.count})</b><button class="btn navy small" id="scan">📷 Scanner un résultat</button></div>
        <div id="scanner"></div>
        <div class="row" style="margin-top:8px"><input id="paste" class="code-input" placeholder="ou colle un code CAPR1.…" aria-label="Code de résultat"/><button class="btn small" id="add">Ajouter</button></div>
        ${g.count ? `
        <h3 style="margin-top:16px">À retravailler avant d’aller sur l’eau</h3>
        <div class="summary">${g.lessons.map((l) => `<div class="sum-row"><span>${lessonById(l.lid)?.icon} ${lessonById(l.lid)?.title}</span><span class="bar"><i style="width:${l.avg}%;background:${l.avg >= 80 ? 'var(--ok)' : l.avg >= 60 ? 'var(--orange)' : 'var(--bad)'}"></i></span><b>${l.avg} %</b></div>`).join('')}</div>
        ${g.missed.length ? `<p style="margin:12px 0 4px"><b>Questions les plus ratées :</b></p><ol class="missed">${g.missed.slice(0, 5).map((m) => `<li>${esc(questionOf(m.id)?.q.q || m.id)} <span class="pill">${m.n} élève${m.n > 1 ? 's' : ''}</span></li>`).join('')}</ol>` : ''}
        ${g.missionAvg !== null ? `<p>Mission : score moyen <b>${g.missionAvg} %</b></p>` : ''}
        <table class="res-table"><thead><tr><th>Élève</th>${s.lessons.map((l) => `<th>${lessonById(l)?.icon}</th>`).join('')}${s.mission ? '<th>⛵</th>' : ''}</tr></thead><tbody>
          ${s.results.map((r) => `<tr><td>${esc(r.p)}</td>${s.lessons.map((l) => `<td class="${(r.q[l] ?? -1) >= 80 ? 'ok' : r.q[l] === undefined ? '' : 'ko'}">${r.q[l] ?? '—'}${r.q[l] !== undefined ? ' %' : ''}</td>`).join('')}${s.mission ? `<td>${r.m ?? '—'}${r.m !== null && r.m !== undefined ? ' %' : ''}</td>` : ''}</tr>`).join('')}
        </tbody></table>` : '<p class="muted">Aucun résultat pour l’instant. Quand un élève a fini, il te montre son QR code de résultat : scanne-le ici.</p>'}
        <button class="btn small port" id="del" style="margin-top:14px">Supprimer la séance</button>
      </div>
    </div>`;
  qrSVG(joinUrl(s.code)).then((svg) => (root.querySelector('#qr').innerHTML = svg)).catch(() => (root.querySelector('#qr').innerHTML = '<p class="muted">QR code indisponible : utilise le lien.</p>'));
  root.querySelector('#copy').addEventListener('click', () => navigator.clipboard?.writeText(joinUrl(s.code)));
  const addResult = (text) => {
    const d = decode(text);
    if (!d || d.type !== 'result') return alert('Ce code n’est pas un résultat Cap au Près.');
    if (d.s !== s.id) return alert('Ce résultat appartient à une autre séance.');
    const results = s.results.filter((r) => r.p !== d.p); // dernière version pour chaque élève
    results.push(d);
    store.saveSession(s.id, { ...s, results });
    instructor(root, id);
  };
  root.querySelector('#scan').addEventListener('click', () => scanInto(root.querySelector('#scanner'), addResult));
  root.querySelector('#add').addEventListener('click', () => addResult(root.querySelector('#paste').value));
  root.querySelector('#del').addEventListener('click', () => {
    if (!confirm('Supprimer cette séance et ses résultats ?')) return;
    store.deleteSession(s.id);
    location.hash = '#/seance';
  });
  return null;
}

// ---------------------------------------------------------------- Élève
function join(root, code) {
  const d = decode(code);
  if (!d || d.type !== 'session') {
    root.innerHTML = '<div class="card"><h2>Code de séance invalide</h2><a class="btn" href="#/seance">Retour</a></div>';
    return null;
  }
  const ms = store.mySession;
  if (!ms || ms.id !== d.id) store.setMySession({ id: d.id, code: d.code, name: d.n, lessons: d.l, mission: d.m, boat: d.b, quiz: {}, wrong: [], missionScore: null });
  location.replace('#/seance/eleve');
  return null;
}

function student(root) {
  const ms = store.mySession;
  if (!ms) {
    location.replace('#/seance');
    return null;
  }
  const done = ms.lessons.filter((l) => ms.quiz[l] !== undefined).length + (ms.mission && ms.missionScore !== null ? 1 : 0);
  const total = ms.lessons.length + (ms.mission ? 1 : 0);
  const level = LEVELS.find((l) => l.id === ms.mission);
  root.innerHTML = `
    <div class="section-title"><h1>👩‍🏫 ${esc(ms.name)}</h1><span class="pill">${done} / ${total}</span></div>
    ${ms.boat && store.boat !== ms.boat ? `<div class="callout warn">Le moniteur a choisi le bateau <b>${BOATS[ms.boat]?.name}</b>. <a href="#/bateau">Changer de bateau</a></div>` : ''}
    <div class="card">
      <ol class="steps-list">
        ${ms.lessons.map((l) => {
          const les = lessonById(l);
          const r = ms.quiz[l];
          return `<li class="${r !== undefined ? 'done' : ''}"><a href="#/apprendre/${l}">${les?.icon} ${les?.title}</a> ${r !== undefined ? `<span class="pill">${r} %</span>` : '<span class="muted">quiz à faire</span>'}</li>`;
        }).join('')}
        ${level ? `<li class="${ms.missionScore !== null ? 'done' : ''}"><a href="#/mission/${level.id}">⛵ Mission ${level.num} : ${level.title}</a> ${ms.missionScore !== null ? `<span class="pill">${ms.missionScore} %</span>` : '<span class="muted">à faire (tracé ou à la barre)</span>'}</li>` : ''}
      </ol>
    </div>
    <div class="card qr-card" style="margin-top:16px">
      <b>${done === total ? '🎉 Tout est fait ! Montre ce QR code à ton moniteur' : 'Ton résultat (à montrer au moniteur quand tu as fini)'}</b>
      <label class="name-field">Ton prénom<input id="pn" maxlength="24" value="${esc(store.name)}" placeholder="Prénom"/></label>
      <div class="qr" id="qr"></div>
      <p class="muted" style="font-size:11px;word-break:break-all" id="rcode"></p>
      <button class="btn small ghost" id="leave">Quitter la séance</button>
    </div>`;
  const draw = () => {
    const code = encodeResult({ session: ms.id, player: root.querySelector('#pn').value || 'Élève', quiz: ms.quiz, wrong: ms.wrong, mission: ms.missionScore });
    root.querySelector('#rcode').textContent = code;
    qrSVG(code).then((svg) => (root.querySelector('#qr').innerHTML = svg)).catch(() => {});
  };
  root.querySelector('#pn').addEventListener('change', (e) => {
    store.setName(e.target.value);
    draw();
  });
  root.querySelector('#leave').addEventListener('click', () => {
    if (!confirm('Quitter la séance ?')) return;
    store.setMySession(null);
    location.hash = '#/seance';
  });
  draw();
  return null;
}

// ---------------------------------------------------------------- Lecture de QR code (caméra)
async function scanInto(box, onCode) {
  box.innerHTML = '<div class="scanner"><video playsinline muted></video><p class="muted">Vise le QR code…</p><button class="btn small">Fermer</button></div>';
  const video = box.querySelector('video');
  let stream;
  let stop = false;
  const close = () => {
    stop = true;
    stream?.getTracks().forEach((t) => t.stop());
    box.innerHTML = '';
  };
  box.querySelector('button').addEventListener('click', close);
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
  } catch {
    box.innerHTML = '<p class="muted">Caméra indisponible : colle le code à la place.</p>';
    return;
  }
  video.srcObject = stream;
  await video.play();
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const detector = 'BarcodeDetector' in window ? new window.BarcodeDetector({ formats: ['qr_code'] }) : null;
  if (!detector) await loadScript('assets/vendor/jsQR.js');
  const tick = async () => {
    if (stop) return;
    let text = null;
    if (video.videoWidth) {
      if (detector) {
        const r = await detector.detect(video).catch(() => []);
        text = r[0]?.rawValue || null;
      } else {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        text = window.jsQR(img.data, img.width, img.height)?.data || null;
      }
    }
    if (text && decode(text)) {
      close();
      onCode(text);
      return;
    }
    requestAnimationFrame(tick);
  };
  tick();
}

// Enregistre un résultat dans la séance en cours de l'élève (appelé par les quiz et les missions).
export function recordForSession({ lesson, pct, wrong, mission, score }) {
  const ms = store.mySession;
  if (!ms) return;
  if (lesson && ms.lessons.includes(lesson)) {
    ms.quiz[lesson] = Math.max(ms.quiz[lesson] ?? 0, pct);
    ms.wrong = [...new Set([...ms.wrong.filter((w) => !w.startsWith(`${lesson}#`)), ...(wrong || [])])];
  }
  if (mission && ms.mission === mission) ms.missionScore = Math.max(ms.missionScore ?? 0, score);
  store.setMySession(ms);
}
