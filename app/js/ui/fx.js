// Petits effets de fête : confettis aux couleurs du club, XP gagnés, passage de grade et badges.
import { newBadges, xpBreakdown, gradeOf, GRADES, examChecks } from '../core/progress.js';
import { perksOf } from '../core/look.js';
import { store } from '../store.js';

const COLORS = ['#64c5f1', '#243150', '#ffffff', '#f5b700', '#2a9fd6'];

export function confetti(count = 140) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = document.createElement('canvas');
  c.className = 'confetti';
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = innerWidth * dpr;
  c.height = innerHeight * dpr;
  document.body.appendChild(c);
  const g = c.getContext('2d');
  g.scale(dpr, dpr);
  const parts = Array.from({ length: count }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 160,
    y: innerHeight * 0.35,
    vx: (Math.random() - 0.5) * 14,
    vy: -6 - Math.random() * 10,
    r: 4 + Math.random() * 6,
    a: Math.random() * Math.PI,
    va: (Math.random() - 0.5) * 0.4,
    col: COLORS[Math.floor(Math.random() * COLORS.length)],
  }));
  const t0 = performance.now();
  const step = (now) => {
    const t = now - t0;
    g.clearRect(0, 0, innerWidth, innerHeight);
    parts.forEach((p) => {
      p.vy += 0.35;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.a += p.va;
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.a);
      g.fillStyle = p.col;
      g.globalAlpha = Math.max(0, 1 - t / 2600);
      g.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2);
      g.restore();
    });
    if (t < 2600) requestAnimationFrame(step);
    else c.remove();
  };
  requestAnimationFrame(step);
}

const PARTS = [
  ['lessons', '📖 Leçons'],
  ['missions', '⛵ Missions'],
  ['reflexes', '⚡ Réflexes'],
  ['daily', '📅 Défi du jour'],
];

// Première visite (ou profil repris d'une ancienne sauvegarde) : on part de l'état actuel, sans fête.
export function syncSeenXp() {
  if (store.seenXp) return;
  const xp = xpBreakdown();
  store.setSeenXp(xp, gradeOf(xp.total).index);
}

function toastBox(html, ms = 5200) {
  let wrap = document.querySelector('.badge-toasts');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = 'badge-toasts';
    document.body.appendChild(wrap);
  }
  const el = document.createElement('div');
  el.innerHTML = html;
  const node = el.firstElementChild;
  node.style.animationDuration = `${ms}ms`;
  wrap.appendChild(node);
  setTimeout(() => {
    node.remove();
    if (!wrap.children.length) wrap.remove();
  }, ms);
  return node;
}

// Ce qui a été gagné depuis la dernière fois : XP par catégorie, la barre du grade qui se remplit,
// la cérémonie si le grade change, puis les nouveaux badges.
export function celebrate() {
  syncSeenXp();
  const seen = store.seenXp;
  const xp = xpBreakdown();
  const g = gradeOf(xp.total);
  const before = gradeOf(seen.total);
  const gained = xp.total - seen.total;
  const gradeUp = g.index > (seen.grade ?? before.index);
  const examNow = g.blocked && !before.blocked;
  store.setSeenXp(xp, g.index);
  window.dispatchEvent(new CustomEvent('progress'));
  if (gained > 0) {
    const lines = PARTS.filter(([k]) => xp[k] > seen[k]).map(([k, label]) => `<span>${label} <b>+${xp[k] - seen[k]}</b></span>`).join('');
    const from = gradeUp ? 0 : Math.round(before.pct * 100);
    const to = Math.round(g.pct * 100);
    const node = toastBox(`<div class="badge-toast xp-toast">
      <span class="bicon">${g.icon}</span>
      <div class="grow"><small>+${gained} XP</small>
        <div class="xp-lines">${lines}</div>
        <span class="xpbar"><i style="width:${from}%"></i></span>
        <span class="xp-next">${g.next ? (g.blocked ? `🎓 Il ne te reste que l’épreuve pour devenir <b>${g.next.name}</b>` : `Encore <b>${g.toGo} XP</b> pour devenir ${g.next.icon} ${g.next.name}`) : 'Grade maximal !'}</span>
      </div></div>`);
    requestAnimationFrame(() => requestAnimationFrame(() => (node.querySelector('.xpbar i').style.width = `${to}%`)));
  }
  if (gradeUp) setTimeout(() => gradeCeremony(g), gained > 0 ? 1400 : 300);
  else if (examNow) setTimeout(() => examCeremony(g.next), 1400);
  setTimeout(announceBadges, gradeUp ? 400 : 1000);
}

function overlay(html) {
  const back = document.createElement('div');
  back.className = 'modal-back ceremony-back';
  back.innerHTML = `<div class="modal ceremony" role="dialog" aria-modal="true">${html}</div>`;
  document.body.appendChild(back);
  const close = () => back.remove();
  back.addEventListener('click', (e) => {
    if (e.target === back || e.target.closest('[data-close]')) close();
  });
  back.querySelector('[data-close]')?.focus();
  return back;
}

// La cérémonie reste au-dessus de la partie en cours, sans lien vers une autre page : on la ferme
// et on reprend exactement où on en était. La personnalisation se fait plus tard, dans le Profil.
export function gradeCeremony(g) {
  const perks = perksOf(g.index);
  const after = GRADES[g.index + 1];
  confetti(260);
  overlay(`
    <div class="cer-icon">${g.icon}</div>
    <small class="cer-kicker">Nouveau grade</small>
    <h2>Tu deviens ${g.name} !</h2>
    ${perks.length ? `<p>🎨 Tu débloques pour ton bateau : <b>${perks.join(' · ')}</b>. À choisir quand tu veux dans ton Profil.</p>` : ''}
    ${after ? `<p class="muted">Prochain grade : ${after.icon} <b>${after.name}</b> à ${after.xp} XP${after.exam ? ', avec une épreuve de passage' : ''}.</p>` : '<p>Tu as atteint le plus haut grade du club. Bravo, Amiral !</p>'}
    <div class="actions"><button class="btn primary" data-close>Continuer</button></div>`);
}

// Les XP du grade suivant sont là : on présente l'épreuve à passer (elle reste visible dans le Profil).
function examCeremony(next) {
  overlay(`
    <div class="cer-icon">🎓</div>
    <small class="cer-kicker">Épreuve de passage</small>
    <h2>Tu as les XP pour devenir ${next.name} !</h2>
    <p>Pour mériter ce grade, il faut aussi le prouver sur l’eau :</p>
    <ul class="exam-list">${examChecks(next.exam).map((c) => `<li class="${c.ok ? 'ok' : ''}">${c.ok ? '✅' : '⬜'} ${c.label}</li>`).join('')}</ul>
    <p class="muted small-print">Tu retrouveras cette liste dans ton Profil.</p>
    <div class="actions"><button class="btn primary" data-close>Continuer</button></div>`);
}

// Affiche les badges obtenus depuis la dernière fois (et les marque comme vus).
export function announceBadges() {
  const fresh = newBadges();
  if (!fresh.length) return [];
  store.markBadgesSeen(fresh.map((b) => b.id));
  fresh.forEach((b) => toastBox(`<div class="badge-toast"><span class="bicon">${b.icon}</span><div><small>Nouveau badge !</small><b>${b.name}</b></div></div>`, 4200));
  window.dispatchEvent(new CustomEvent('progress'));
  return fresh;
}
