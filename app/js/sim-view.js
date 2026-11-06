// Écran de navigation : rendu canvas, commandes clavier et tactiles, HUD, pilote « Montre-moi ».
import { COAST, ISLETS, PLACES, BOUNDS } from './geo.js';
import { createRace, routeTo } from './race.js';
import { createAutopilot } from './autopilot.js';
import { allureName, wrap180, wrap360, twaOf, D2R } from './physics.js';
import { optimalSheet } from './boats.js';
import { cardinal } from './conditions.js';

const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function mountSim(root, { mission, boatId, wind, sea, ghost, warp, onFinish, onExit, onEvent }) {
  root.innerHTML = `
  <div class="sim">
    <canvas class="sim-canvas"></canvas>
    <div class="hud-top">
      <button class="btn-icon" data-act="exit" aria-label="Quitter">✕</button>
      <div class="hud-title"><b>${mission.title}</b><span>${mission.goal}</span></div>
      <div class="hud-chrono"><span data-k="time">0:00</span><small data-k="warp"></small></div>
      <button class="btn-icon" data-act="pause" aria-label="Pause">⏸</button>
    </div>
    <div class="hud-msg" data-k="msg"></div>
    <div class="hud-panel">
      <div class="gauge"><small>Vitesse</small><b data-k="speed">0.0</b><small>nds</small></div>
      <div class="gauge"><small>Allure</small><b data-k="allure">-</b><small data-k="amure"></small></div>
      <div class="gauge"><small>Vent</small><b data-k="tws">-</b><small data-k="twd"></small></div>
      <div class="gauge"><small>Réglage</small><b data-k="trim">-</b><small data-k="trimhint"></small></div>
      <div class="gauge"><small>Bouée</small><b data-k="dist">-</b><small data-k="mark"></small></div>
    </div>
    <div class="ctrl">
      <div class="ctrl-steer">
        <button class="btn-big" data-hold="left" aria-label="Bâbord">◀</button>
        <button class="btn-big" data-hold="right" aria-label="Tribord">▶</button>
      </div>
      <div class="ctrl-toggles">
        <button class="chip" data-act="tack">Virer / empanner</button>
        <button class="chip" data-act="hike">${mission.boatHike || 'Rappel'}</button>
        <button class="chip" data-act="board" hidden>Dérive</button>
        <button class="chip" data-act="spi" hidden>Spi</button>
        <button class="chip" data-act="demo">Montre-moi</button>
        <button class="chip" data-act="warp">Vitesse ×</button>
      </div>
      <div class="ctrl-sheet">
        <small>Border</small>
        <input type="range" min="0" max="100" value="50" data-k="sheet" aria-label="Écoute" orient="vertical">
        <small>Choquer</small>
      </div>
    </div>
    <div class="overlay" data-k="overlay" hidden></div>
  </div>`;

  const $ = (k) => root.querySelector(`[data-k="${k}"]`);
  const canvas = root.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const race = createRace(mission, boatId, { wind, sea });
  const s = race.s, boat = race.boat;
  root.querySelector('[data-act="hike"]').textContent = boat.hike === 'trapèze' ? 'Trapèze' : 'Rappel';
  root.querySelector('[data-act="board"]').hidden = !boat.hasBoard;
  root.querySelector('[data-act="spi"]').hidden = !boat.hasSpi;

  const ctl = { rudder: 0, sheet: 0.5, hike: false, board: true, spi: false };
  const hold = { left: false, right: false, in: false, out: false };
  let autoHeading = null, demo = false, paused = false, zoom = 0.22, alive = true;
  const warps = [1, 3, 6, 10, 20];
  let wi = warps.indexOf(warp || 6); if (wi < 0) wi = 2;
  const ap = createAutopilot();
  let route = null, routeFor = -1, wp = 1, msgUntil = 0;

  function msg(text, ms = 2500, kind = '') {
    const el = $('msg'); el.textContent = text; el.className = `hud-msg show ${kind}`;
    msgUntil = performance.now() + ms;
  }
  msg(mission.story ? 'Bonne navigation ! Flèches pour barrer, haut/bas pour l\'écoute.' : '', 3500);

  // Commandes
  const keys = (e, down) => {
    const k = e.key;
    if (['ArrowLeft', 'a', 'q'].includes(k)) hold.left = down;
    else if (['ArrowRight', 'd'].includes(k)) hold.right = down;
    else if (['ArrowUp', 'w', 'z'].includes(k)) hold.in = down;
    else if (['ArrowDown', 's'].includes(k)) hold.out = down;
    else if (!down) return;
    else if (k === 't' || k === 'Enter') act('tack');
    else if (k === 'h') act('hike');
    else if (k === 'b') act('board');
    else if (k === 'p') act('spi');
    else if (k === ' ') act('pause');
    else if (k === '+' || k === '=') zoom = Math.min(1.2, zoom * 1.25);
    else if (k === '-') zoom = Math.max(0.04, zoom / 1.25);
    else if (k === ']') act('warp');
    else if (k === 'Escape') act('exit');
    else return;
    e.preventDefault();
  };
  const kd = (e) => { if (e.target.tagName !== 'INPUT' || e.key.startsWith('Arrow')) keys(e, true); };
  const ku = (e) => keys(e, false);
  addEventListener('keydown', kd); addEventListener('keyup', ku);
  root.querySelectorAll('[data-hold]').forEach((b) => {
    const k = b.dataset.hold;
    const on = (e) => { e.preventDefault(); hold[k] = true; demo = false; };
    const off = () => (hold[k] = false);
    b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
  });
  const sheetEl = $('sheet');
  sheetEl.addEventListener('input', () => { ctl.sheet = 1 - sheetEl.value / 100; });
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); zoom = Math.max(0.04, Math.min(1.2, zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15))); }, { passive: false });
  let pinch = null;
  canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length !== 2) return;
    const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    if (pinch) zoom = Math.max(0.04, Math.min(1.2, zoom * (d / pinch)));
    pinch = d; e.preventDefault();
  }, { passive: false });
  canvas.addEventListener('touchend', () => (pinch = null));

  function act(a) {
    if (a === 'exit') { destroy(); onExit?.(); return; }
    if (a === 'pause') { paused = !paused; root.querySelector('[data-act="pause"]').textContent = paused ? '▶' : '⏸'; return; }
    if (a === 'tack') { autoHeading = wrap360(2 * s.twd - s.heading); msg(Math.abs(s.twa) < 90 ? 'Paré à virer ? On vire !' : 'Paré à empanner ? Empannez !', 1500); return; }
    if (a === 'hike') ctl.hike = !ctl.hike;
    if (a === 'board') ctl.board = !ctl.board;
    if (a === 'spi') ctl.spi = !ctl.spi;
    if (a === 'demo') { demo = !demo; msg(demo ? 'Pilote automatique : regarde les bords et les réglages.' : 'À toi la barre !'); }
    if (a === 'warp') wi = (wi + 1) % warps.length;
    syncToggles();
  }
  root.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => act(b.dataset.act)));
  function syncToggles() {
    root.querySelector('[data-act="hike"]').classList.toggle('on', ctl.hike);
    root.querySelector('[data-act="board"]').classList.toggle('on', ctl.board);
    root.querySelector('[data-act="board"]').textContent = ctl.board ? 'Dérive basse' : 'Dérive haute';
    root.querySelector('[data-act="spi"]').classList.toggle('on', ctl.spi);
    root.querySelector('[data-act="demo"]').classList.toggle('on', demo);
    $('warp').textContent = `×${warps[wi]}`;
    root.querySelector('[data-act="warp"]').textContent = `Temps ×${warps[wi]}`;
  }
  syncToggles();

  // Boucle
  let last = performance.now(), hudT = 0;
  function frame(now) {
    if (!alive) return;
    const real = Math.min(0.1, (now - last) / 1000); last = now;
    if (!paused && !race.done) {
      let simT = real * warps[wi];
      while (simT > 0) {
        const dt = Math.min(0.1, simT); simT -= dt;
        control(dt);
        handle(race.step(dt, ctl));
        if (race.done) break;
      }
    }
    draw();
    if (now - hudT > 120) { hud(); hudT = now; }
    if (now > msgUntil) $('msg').classList.remove('show');
    requestAnimationFrame(frame);
  }

  function control(dt) {
    if (demo && race.target()) {
      const target = race.target();
      if (routeFor !== race.markIdx || !route) { route = routeTo({ x: s.x, y: s.y }, target); routeFor = race.markIdx; wp = 1; }
      let sub = route[Math.min(wp, route.length - 1)];
      while (wp < route.length - 1 && Math.hypot(s.x - sub.x, s.y - sub.y) < 120) sub = route[++wp];
      const c = ap(s, sub);
      Object.assign(ctl, { rudder: c.rudder, sheet: c.sheet, hike: c.hike, spi: c.spi, board: true });
      sheetEl.value = Math.round((1 - ctl.sheet) * 100);
      return;
    }
    if (autoHeading != null) {
      const err = wrap180(autoHeading - s.heading);
      ctl.rudder = Math.max(-1, Math.min(1, err / 20));
      if (Math.abs(err) < 4 || hold.left || hold.right) autoHeading = null;
    } else ctl.rudder = (hold.right ? 1 : 0) - (hold.left ? 1 : 0);
    if (hold.in || hold.out) {
      ctl.sheet = Math.max(0, Math.min(1, ctl.sheet + (hold.in ? 0.6 : -0.6) * dt / Math.max(1, warps[wi] / 2)));
      sheetEl.value = Math.round((1 - ctl.sheet) * 100);
    }
  }

  function handle(evs) {
    for (const e of evs) {
      onEvent?.(e);
      if (e.type === 'mark') msg(`✓ ${e.label}`, 1800, 'good');
      if (e.type === 'ground') msg(`Échoué sur ${e.where} ! Barre vers le large.`, 2500, 'bad');
      if (e.type === 'capsize') msg('Chavirage ! Redressage en cours… choque dans les rafales.', 3000, 'bad');
      if (e.type === 'broach') msg('Départ au lof : trop de toile, choque !', 2000, 'bad');
      if (e.type === 'finish') finish();
    }
  }

  function finish() {
    const ov = $('overlay');
    ov.hidden = false;
    const res = onFinish?.({ time: race.time, groundings: race.groundings, capsizes: race.capsizes, bandSpeeding: race.bandSpeeding, track: race.track, demo: race.usedDemo }) || {};
    ov.innerHTML = `<div class="card result">
      <h2>${res.title || 'Arrivée !'}</h2>
      <div class="stars">${'★'.repeat(res.stars || 0)}<span>${'★'.repeat(3 - (res.stars || 0))}</span></div>
      <p>Temps : <b>${fmtTime(race.time)}</b>${res.ref ? ` (référence ${fmtTime(res.ref)})` : ''}</p>
      <p>${race.groundings ? `${race.groundings} échouement(s). ` : 'Aucun échouement. '}${race.capsizes ? `${race.capsizes} chavirage(s).` : ''}</p>
      ${race.bandSpeeding > 5 ? '<p class="warn">Attention : plus de 5 nœuds dans la bande des 300 m.</p>' : ''}
      ${res.note ? `<p>${res.note}</p>` : ''}
      <div class="row"><button class="btn" data-r="retry">Rejouer</button><button class="btn primary" data-r="exit">Continuer</button></div>
    </div>`;
    ov.querySelector('[data-r="exit"]').onclick = () => act('exit');
    ov.querySelector('[data-r="retry"]').onclick = () => { destroy(); mountSim(root, arguments0); };
  }
  const arguments0 = { mission, boatId, wind, sea, ghost, warp: warps[wi], onFinish, onExit, onEvent };
  // Une mission terminée au pilote automatique ne compte pas.
  Object.defineProperty(race, 'usedDemo', { get: () => usedDemo });
  let usedDemo = false;
  const demoTimer = setInterval(() => { if (demo) usedDemo = true; }, 500);

  function hud() {
    $('time').textContent = fmtTime(race.time);
    $('speed').textContent = s.speed.toFixed(1);
    $('allure').textContent = s.capsized ? 'Chaviré' : allureName(s.twa, boat);
    $('amure').textContent = s.twa >= 0 ? 'tribord amures' : 'bâbord amures';
    $('tws').textContent = Math.round(s.tws);
    $('twd').textContent = `nds de ${cardinal(s.twd)}`;
    const hint = { ok: 'parfait', border: 'borde', choquer: 'choque', irons: 'vent debout' }[s.trimHint];
    $('trim').textContent = `${Math.round(s.trim * 100)}%`;
    $('trimhint').textContent = hint;
    $('trim').parentElement.dataset.state = s.trimHint;
    const m = race.target();
    if (m) {
      const d = Math.hypot(m.x - s.x, m.y - s.y);
      $('dist').textContent = d > 1000 ? `${(d / 1000).toFixed(1)} km` : `${Math.round(d)} m`;
      $('mark').textContent = m.label;
    } else { $('dist').textContent = '-'; $('mark').textContent = 'navigation libre'; }
    if (s.power > 1.1 && !s.capsized && performance.now() > msgUntil) msg(boat.capsizes ? 'Ça gîte ! Choque ou fais le rappel.' : 'Trop de gîte : choque un peu.', 1200, 'warn');
    else if (race.warnShoal && performance.now() > msgUntil) msg(`Hauts-fonds de ${race.warnShoal.name} !`, 1200, 'warn');
    else if (s.inBand && s.speed > 5.2 && performance.now() > msgUntil) msg('Bande des 300 m : 5 nœuds maximum.', 1200, 'warn');
  }

  // Rendu
  function resize() {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = r.width * dpr; canvas.height = r.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  const ro = new ResizeObserver(resize); ro.observe(canvas); resize();

  function draw() {
    const W = canvas.clientWidth, H = canvas.clientHeight;
    const cx = W / 2, cy = H * 0.48;
    const k = zoom;
    const X = (x) => cx + (x - s.x) * k, Y = (y) => cy - (y - s.y) * k;
    const t = race.time;

    // Mer
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#2c7fb0'); g.addColorStop(1, '#1f6a99');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // Risées
    for (const p of race.field.positions(t)) {
      const px = X(p.x), py = Y(p.y), pr = p.rad * k;
      if (px < -pr || py < -pr || px > W + pr || py > H + pr) continue;
      const rg = ctx.createRadialGradient(px, py, 0, px, py, pr);
      rg.addColorStop(0, `rgba(10,40,70,${0.28 * p.k})`); rg.addColorStop(1, 'rgba(10,40,70,0)');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill();
    }

    // Houle : lignes perpendiculaires à sa direction
    const sh = race.sea.swellH || 0;
    if (sh > 0.1) {
      const dir = (race.sea.swellDir ?? 250) * D2R;
      const ux = Math.cos(dir), uy = Math.sin(dir); // direction des crêtes à l'écran
      const spacing = Math.max(18, 90 * k);
      const off = ((t * 6 * k) % spacing);
      ctx.strokeStyle = `rgba(255,255,255,${Math.min(0.22, 0.08 + sh * 0.08)})`; ctx.lineWidth = 1.5;
      const L = Math.hypot(W, H);
      for (let d = -L; d < L; d += spacing) {
        const ox = cx + Math.sin(dir) * (d + off), oy = cy + Math.cos(dir) * (d + off);
        ctx.beginPath(); ctx.moveTo(ox - ux * L, oy + uy * L); ctx.lineTo(ox + ux * L, oy - uy * L); ctx.stroke();
      }
    }

    // Bande des 300 m puis terre
    const coastPath = () => { ctx.beginPath(); COAST.forEach((p, i) => (i ? ctx.lineTo(X(p.x), Y(p.y)) : ctx.moveTo(X(p.x), Y(p.y)))); ctx.closePath(); };
    ctx.save(); coastPath(); ctx.strokeStyle = 'rgba(255,230,120,.18)'; ctx.lineWidth = 600 * k; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore();
    coastPath(); ctx.strokeStyle = '#e9d7a8'; ctx.lineWidth = Math.max(4, 120 * k); ctx.stroke();
    coastPath(); ctx.fillStyle = '#7fae6a'; ctx.fill();
    ctx.fillStyle = '#5d8c4f';
    if (k > 0.08) for (const pl of Object.values(PLACES)) {
      ctx.font = '600 12px Poppins, sans-serif'; ctx.fillStyle = '#243150'; ctx.textAlign = 'center';
      ctx.fillText(pl.name, X(pl.x), Y(pl.y) - 26 - 300 * k * 0.2);
    }
    for (const i of ISLETS) {
      ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(X(i.x), Y(i.y), i.shoal * k, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#6b6258'; ctx.beginPath(); ctx.arc(X(i.x), Y(i.y), Math.max(3, i.r * k), 0, Math.PI * 2); ctx.fill();
      if (k > 0.08) { ctx.fillStyle = '#fff'; ctx.font = '11px Poppins, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(i.name, X(i.x), Y(i.y) - i.shoal * k - 4); }
    }

    // Bouées
    mission.marks.forEach((m, i) => {
      const cur = i === race.markIdx, done = i < race.markIdx;
      ctx.globalAlpha = done ? 0.35 : 1;
      if (cur) { ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X(m.x), Y(m.y), Math.max(10, m.r * k) + 3 * Math.sin(performance.now() / 200), 0, Math.PI * 2); ctx.stroke(); }
      ctx.fillStyle = cur ? '#ffb000' : '#f2d04b'; ctx.beginPath(); ctx.arc(X(m.x), Y(m.y), 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#243150'; ctx.font = '700 10px Poppins, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(i + 1, X(m.x), Y(m.y) + 3.5);
      ctx.globalAlpha = 1;
    });

    // Fantôme et sillage
    if (ghost?.length) {
      const gp = ghost.find((p) => p.t >= t) || ghost[ghost.length - 1];
      ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.arc(X(gp.x), Y(gp.y), 6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1.5; ctx.beginPath();
    race.track.slice(-200).forEach((p, i) => (i ? ctx.lineTo(X(p.x), Y(p.y)) : ctx.moveTo(X(p.x), Y(p.y))));
    ctx.lineTo(cx, cy); ctx.stroke();

    // Cap vers la bouée
    const m = race.target();
    if (m) {
      const b = Math.atan2(m.x - s.x, m.y - s.y);
      ctx.strokeStyle = 'rgba(255,210,63,.8)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx + Math.sin(b) * 40, cy - Math.cos(b) * 40); ctx.lineTo(cx + Math.sin(b) * 90, cy - Math.cos(b) * 90); ctx.stroke(); ctx.setLineDash([]);
    }

    drawBoat(ctx, boat, s, cx, cy, Math.max(1, Math.min(2.2, 0.8 + k * 2)));
    if (W < 760) drawCompass(ctx, W - 56, 250, s);
    else { drawCompass(ctx, W - 64, 120, s); drawMinimap(ctx, 12, H - 150, 170, 100, s, mission, race.markIdx); }
  }

  function destroy() {
    alive = false; ro.disconnect(); clearInterval(demoTimer);
    removeEventListener('keydown', kd); removeEventListener('keyup', ku);
  }
  requestAnimationFrame(frame);
  return { destroy, race };
}

// Bateau vu de dessus, dessin propre à chaque type.
export function drawBoat(ctx, boat, s, x, y, scale = 1) {
  const len = 14 + boat.length * 2.6;
  const L = len * scale;
  ctx.save(); ctx.translate(x, y); ctx.rotate(s.heading * D2R);
  const twa = s.twa ?? twaOf(s.heading, s.twd ?? 0);
  const side = twa > 0 ? -1 : 1; // signe x du côté sous le vent
  const ta = Math.abs(twa);
  const opt = optimalSheet(boat, ta);
  const boom = ta < boat.noGo ? 0 : Math.min((1 - s.sheet) * 88, (ta - 10)) + 4;
  const heelSkew = (s.heel || 0) / 90;
  const c = boat.colors;
  ctx.lineWidth = 1.5; ctx.strokeStyle = '#243150';
  if (s.capsized) ctx.globalAlpha = 0.7;
  if (boat.id === 'hobie16') {
    for (const dx of [-0.3, 0.3]) {
      ctx.fillStyle = c.hull; ctx.beginPath();
      ctx.ellipse(dx * L, 0, L * 0.07, L * 0.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = c.deck; ctx.globalAlpha *= 0.8; ctx.fillRect(-0.3 * L, -0.1 * L, 0.6 * L, 0.32 * L); ctx.globalAlpha = s.capsized ? 0.7 : 1;
  } else {
    const w = boat.id === 'optimist' ? 0.5 : boat.id === 'j80' ? 0.32 : 0.36;
    ctx.fillStyle = c.hull; ctx.beginPath();
    if (boat.id === 'optimist') {
      ctx.moveTo(-w * L * 0.7, -L / 2); ctx.lineTo(w * L * 0.7, -L / 2);
      ctx.quadraticCurveTo(w * L, 0, w * L * 0.8, L / 2); ctx.lineTo(-w * L * 0.8, L / 2); ctx.quadraticCurveTo(-w * L, 0, -w * L * 0.7, -L / 2);
    } else {
      ctx.moveTo(0, -L / 2); ctx.bezierCurveTo(w * L * 0.9, -L * 0.2, w * L, L * 0.25, w * L * 0.8, L / 2);
      ctx.lineTo(-w * L * 0.8, L / 2); ctx.bezierCurveTo(-w * L, L * 0.25, -w * L * 0.9, -L * 0.2, 0, -L / 2);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = c.deck; ctx.beginPath(); ctx.ellipse(0, L * 0.18, w * L * 0.5, L * 0.18, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = c.trim; ctx.fillRect(-1, -L / 2 + 2, 2, L * 0.25);
  }
  // Grand-voile (bôme)
  const mast = boat.id === 'optimist' ? -0.32 * L : boat.id === 'hobie16' ? -0.1 * L : -0.12 * L;
  ctx.save(); ctx.translate(0, mast); ctx.rotate(-side * boom * D2R);
  const luff = s.trimHint === 'border' ? Math.sin(performance.now() / 60) * 3 : 0;
  const belly = (s.trimHint === 'irons' ? 0 : side * L * 0.12) + luff;
  ctx.fillStyle = c.sail; ctx.strokeStyle = '#8aa'; ctx.beginPath();
  ctx.moveTo(0, 0); ctx.quadraticCurveTo(belly, L * 0.35, 0, L * 0.62 * (1 - heelSkew * 0.3)); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#243150'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, L * 0.62 * (1 - heelSkew * 0.3)); ctx.stroke();
  ctx.restore();
  // Foc
  if (boat.id !== 'optimist') {
    ctx.save(); ctx.translate(0, -0.42 * L); ctx.rotate(-side * Math.min(boom * 0.7, 60) * D2R);
    ctx.fillStyle = c.sail; ctx.strokeStyle = '#8aa'; ctx.lineWidth = 1; ctx.beginPath();
    ctx.moveTo(0, 0); ctx.quadraticCurveTo(belly * 0.6, L * 0.15, 0, L * 0.3); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  }
  // Spi
  if (s.spi && boat.hasSpi) {
    ctx.fillStyle = c.spi; ctx.globalAlpha = 0.9; ctx.beginPath();
    ctx.ellipse(side * 0.15 * L, -0.62 * L, L * 0.28, L * 0.16, -side * 0.4, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
  }
  // Équipier au rappel / trapèze
  if (s.hike) { ctx.fillStyle = '#e5484d'; ctx.beginPath(); ctx.arc(-side * L * (boat.id === 'hobie16' ? 0.42 : 0.32), L * 0.1, 3 * scale, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

function drawCompass(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = 'rgba(36,49,80,.75)'; ctx.beginPath(); ctx.arc(0, 0, 46, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = '600 10px Poppins, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('N', 0, -34);
  // Vent (flèche rouge pointant vers où il souffle)
  ctx.save(); ctx.rotate((s.twd + 180) * D2R);
  ctx.strokeStyle = '#ff6b6b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 30); ctx.lineTo(0, -26); ctx.stroke();
  ctx.fillStyle = '#ff6b6b'; ctx.beginPath(); ctx.moveTo(0, -32); ctx.lineTo(-6, -20); ctx.lineTo(6, -20); ctx.fill();
  ctx.restore();
  ctx.save(); ctx.rotate(s.heading * D2R); ctx.fillStyle = '#64C5F1'; ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(5, 8); ctx.lineTo(-5, 8); ctx.fill(); ctx.restore();
  ctx.fillStyle = '#fff'; ctx.fillText(`${Math.round(s.tws)} nds`, 0, 62);
  ctx.restore();
}

function drawMinimap(ctx, x, y, w, h, s, mission, idx) {
  const sx = w / (BOUNDS.maxX - BOUNDS.minX), sy = h / (BOUNDS.maxY - BOUNDS.minY);
  const k = Math.min(sx, sy);
  const X = (px) => x + (px - BOUNDS.minX) * k, Y = (py) => y + (BOUNDS.maxY - py) * k;
  ctx.save();
  ctx.fillStyle = 'rgba(31,106,153,.85)'; ctx.strokeStyle = 'rgba(255,255,255,.6)';
  ctx.fillRect(x, y, (BOUNDS.maxX - BOUNDS.minX) * k, (BOUNDS.maxY - BOUNDS.minY) * k);
  ctx.beginPath(); ctx.rect(x, y, (BOUNDS.maxX - BOUNDS.minX) * k, (BOUNDS.maxY - BOUNDS.minY) * k); ctx.clip();
  ctx.fillStyle = '#7fae6a'; ctx.beginPath(); COAST.forEach((p, i) => (i ? ctx.lineTo(X(p.x), Y(p.y)) : ctx.moveTo(X(p.x), Y(p.y)))); ctx.fill();
  ctx.fillStyle = '#6b6258'; for (const i of ISLETS) { ctx.beginPath(); ctx.arc(X(i.x), Y(i.y), 1.5, 0, Math.PI * 2); ctx.fill(); }
  mission.marks.forEach((m, i) => { ctx.fillStyle = i === idx ? '#ffb000' : 'rgba(242,208,75,.6)'; ctx.beginPath(); ctx.arc(X(m.x), Y(m.y), 2.5, 0, Math.PI * 2); ctx.fill(); });
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(X(s.x), Y(s.y), 3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
