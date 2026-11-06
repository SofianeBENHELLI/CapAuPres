import { boatSVG, windArrowSVG, idealBoom, boatIcon } from '../ui/boat.js';
import { ALLURES, NO_GO, twa, tackOf, allureOf, norm360, TACKS } from '../core/angles.js';
import { speedKn, WINDS, bestVmgAngles } from '../core/polar.js';
import { getTrim, TRIM_ALLURES, TRIM_WINDS, answerOk } from '../data/trim.js';
import { getBoat, boomless } from '../core/boats.js';

const P = (deg, r) => {
  const a = (deg * Math.PI) / 180;
  return [r * Math.sin(a), -r * Math.cos(a)];
};
const fx = (n) => Math.round(n * 10) / 10;

export function sectorPath(a1, a2, r1, r2) {
  const [x1, y1] = P(a1, r2);
  const [x2, y2] = P(a2, r2);
  const [x3, y3] = P(a2, r1);
  const [x4, y4] = P(a1, r1);
  const large = norm360(a2 - a1) > 180 ? 1 : 0;
  return `M${fx(x1)},${fx(y1)} A${r2},${r2} 0 ${large} 1 ${fx(x2)},${fx(y2)} L${fx(x3)},${fx(y3)} A${r1},${r1} 0 ${large} 0 ${fx(x4)},${fx(y4)} Z`;
}

// Anneau des allures autour d'un centre, orienté selon le vent.
export function allureRing(windFrom, r1, r2, labels = true) {
  let s = '';
  let t = '';
  for (const al of ALLURES) {
    for (const side of [1, -1]) {
      const a1 = windFrom + side * al.min;
      const a2 = windFrom + side * Math.min(al.max, 180);
      const [from, to] = side > 0 ? [a1, a2] : [a2, a1];
      s += `<path d="${sectorPath(from, to, r1, r2)}" fill="${al.color}" opacity="${al.id === 'debout' ? 0.75 : 0.9}"/>`;
      if (labels && !(al.id === 'arriere' && side < 0)) {
        const mid = al.id === 'arriere' ? windFrom + 180 : windFrom + side * ((al.min + Math.min(al.max, 180)) / 2);
        const [x, y] = P(mid, (r1 + r2) / 2);
        const rot = norm360(mid);
        const flip = rot > 90 && rot < 270 ? rot + 180 : rot;
        t += `<text x="${fx(x)}" y="${fx(y)}" transform="rotate(${fx(flip)} ${fx(x)} ${fx(y)})" font-size="11" font-weight="800" fill="#fff" text-anchor="middle" dominant-baseline="central">${al.short}</text>`;
      }
    }
  }
  return s + t;
}

// ------------------------------------------------------------------ Allures
function allures(el) {
  let wind = 0;
  let heading = 60;
  let windLevel = 'medium';
  el.innerHTML = `
  <div class="theory-grid">
    <div class="card dial-wrap">
      <svg class="dial" viewBox="-235 -235 470 470" aria-label="Cadran des allures : fais tourner le bateau">
        <circle r="232" fill="var(--card-2)"/>
        <g id="ring"></g>
        <circle r="148" fill="url(#dialSea)"/>
        <defs><radialGradient id="dialSea"><stop offset="0" stop-color="#1b8fd0"/><stop offset="1" stop-color="#0a5a8a"/></radialGradient></defs>
        <g id="windInd"></g>
        <line id="headLine" stroke="rgba(255,255,255,.5)" stroke-width="2" stroke-dasharray="4 6"/>
        <g id="boat" transform="scale(1.3)"></g>
      </svg>
      <p class="muted" style="text-align:center;margin:6px 0 0">👆 Fais glisser ton doigt (ou la souris) autour du cadran pour orienter le bateau. Flèches ← → au clavier.</p>
    </div>
    <div>
      <div class="card">
        <div class="readout">
          <div class="box"><small>Allure</small><b id="rAllure"></b></div>
          <div class="box"><small>Amure</small><b id="rAmure"></b></div>
          <div class="box"><small>Angle au vent</small><b id="rAngle"></b></div>
          <div class="box"><small>Vitesse</small><b id="rSpeed"></b><div class="speedbar" style="margin-top:6px"><i id="rBar"></i></div></div>
        </div>
        <div class="row" style="justify-content:space-between">
          <div class="seg" id="windSeg">${Object.values(WINDS).map((w) => `<button data-w="${w.id}" class="${w.id === windLevel ? 'active' : ''}">${w.label}</button>`).join('')}</div>
          <button class="btn small" id="spinWind">🌀 Faire tourner le vent</button>
        </div>
        <p id="rText" style="margin:14px 0 0"></p>
      </div>
      <div class="card" style="margin-top:16px">
        <h2 class="h3">Les allures</h2>
        <div class="allure-list" id="alist"></div>
        <div class="callout">La <b>zone interdite</b> (≈ ${NO_GO}° de chaque côté du vent pour ${getBoat().article}, ${getBoat().id === 'catamaran' ? 'plus large que pour un monocoque' : getBoat().id === 'j80' ? 'un quillard de régate serre mieux le vent' : 'environ 40° pour un dériveur'}) : aucun voilier ne peut y avancer. Pour aller face au vent, on tire des <b>bords de près</b> en zigzag.</div>
      </div>
    </div>
  </div>`;

  const ring = el.querySelector('#ring');
  const boat = el.querySelector('#boat');
  const svg = el.querySelector('.dial');
  const maxSpeed = Math.max(...WINDS.strong.speeds);
  const DESCR = {
    debout: 'Le bateau est face au vent : les voiles faseyent (elles battent comme un drapeau) et le bateau s’arrête. On ne peut pas naviguer ici.',
    get pres() {
      return `Le plus près possible du vent (≈ ${Math.round(bestVmgAngles(windLevel).up.angle)}° pour ${getBoat().article}). Voiles bordées à fond. C’est l’allure pour remonter au vent.`;
    },
    bonplein: 'Un peu plus abattu (barre tirée) que le près serré : on choque légèrement, le bateau accélère.',
    travers: 'Le vent arrive perpendiculairement au bateau. Voiles à moitié choquées. Allure rapide et confortable.',
    petitlargue: 'Le vent vient de l’arrière du travers. Souvent l’allure la plus rapide !',
    grandlargue: 'Le vent vient de trois-quarts arrière. Voiles bien choquées. Pour descendre vite, on enchaîne des bords de grand largue.',
    arriere: boomless('Le vent vient pile de derrière. Bôme presque perpendiculaire. Attention à l’empannage involontaire !'),
  };

  el.querySelector('#alist').innerHTML = ALLURES.map((a) => `
    <div class="allure-item" data-id="${a.id}" style="color:${a.color}">
      <span class="dot" style="background:${a.color}"></span>
      <div><b>${a.label}</b><br/><span>${a.min === 0 ? '0' : a.min}° – ${Math.round(Math.min(a.max, 180))}° du vent</span></div>
      <span class="muted" style="font-size:13px">${a.id === 'debout' ? '⛔' : speedKn((a.min + Math.min(a.max, 180)) / 2, windLevel).toFixed(1) + ' nd'}</span>
    </div>`).join('');

  const draw = () => {
    ring.innerHTML = allureRing(wind, 150, 205);
    const [wx, wy] = P(wind, 222);
    el.querySelector('#windInd').innerHTML = `<g transform="translate(${fx(wx)},${fx(wy)})" style="color:var(--ink)">${windArrowSVG(wind, 14)}</g><text x="${fx(P(wind, 222)[0])}" y="${fx(P(wind, 222)[1])}" dx="${wx > 0 ? -34 : 34}" font-size="13" font-weight="900" fill="var(--ink)" text-anchor="middle">VENT</text>`;
    const [hx, hy] = P(heading, 148);
    const hl = el.querySelector('#headLine');
    hl.setAttribute('x2', fx(hx));
    hl.setAttribute('y2', fx(hy));
    boat.innerHTML = boatSVG({ heading, windFrom: wind });
    const t = twa(heading, wind);
    const al = allureOf(t);
    const tk = TACKS[tackOf(heading, wind)];
    el.querySelector('#rAllure').innerHTML = `<span class="tagc" style="--c:${al.color}">${al.label}</span>`;
    el.querySelector('#rAmure').innerHTML = Math.abs(t) < NO_GO ? '<span class="muted">—</span>' : `<span class="tagc" style="--c:${tk.color}">${tk.label}</span>`;
    el.querySelector('#rAngle').textContent = `${Math.round(Math.abs(t))}°`;
    const sp = speedKn(t, windLevel);
    el.querySelector('#rSpeed').textContent = `${sp.toFixed(1)} nœuds`;
    el.querySelector('#rBar').style.width = `${(sp / maxSpeed) * 100}%`;
    const side = t > 0 ? 'par la <b>droite</b> (tribord)' : 'par la <b>gauche</b> (bâbord)';
    el.querySelector('#rText').innerHTML = `${DESCR[al.id]}${Math.abs(t) >= NO_GO ? ` <br/><br/>Le vent arrive ${side} : ${boomless('la bôme')} est de l’autre côté. Grand-voile ouverte à environ <b>${Math.round(idealBoom(Math.abs(t)))}°</b>.` : ''}`;
    el.querySelectorAll('.allure-item').forEach((n) => n.classList.toggle('active', n.dataset.id === al.id));
  };

  const fromPointer = (e) => {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    heading = norm360((Math.atan2(p.x, -p.y) * 180) / Math.PI);
    draw();
  };
  let dragging = false;
  svg.addEventListener('pointerdown', (e) => {
    dragging = true;
    svg.setPointerCapture(e.pointerId);
    fromPointer(e);
  });
  svg.addEventListener('pointermove', (e) => dragging && fromPointer(e));
  svg.addEventListener('pointerup', () => (dragging = false));
  const onKey = (e) => {
    if (e.key === 'ArrowLeft') heading = norm360(heading - 5);
    else if (e.key === 'ArrowRight') heading = norm360(heading + 5);
    else return;
    e.preventDefault();
    draw();
  };
  window.addEventListener('keydown', onKey);
  el.querySelectorAll('.allure-item').forEach((n) =>
    n.addEventListener('click', () => {
      const a = ALLURES.find((x) => x.id === n.dataset.id);
      const side = twa(heading, wind) >= 0 ? -1 : 1;
      heading = norm360(wind + side * ((a.min + Math.min(a.max, 180)) / 2));
      draw();
    }),
  );
  el.querySelector('#windSeg').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    windLevel = b.dataset.w;
    el.querySelectorAll('#windSeg button').forEach((x) => x.classList.toggle('active', x === b));
    draw();
  });
  let anim;
  el.querySelector('#spinWind').addEventListener('click', () => {
    const target = wind + 60 + Math.random() * 240;
    const start = wind;
    const t0 = performance.now();
    cancelAnimationFrame(anim);
    const step = (now) => {
      const k = Math.min(1, (now - t0) / 900);
      const e = 1 - (1 - k) ** 3;
      wind = norm360(start + (target - start) * e);
      draw();
      if (k < 1) anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
  });
  draw();
  return () => {
    window.removeEventListener('keydown', onKey);
    cancelAnimationFrame(anim);
  };
}

// ------------------------------------------------------------------ Amures
function amures(el) {
  const fig = (heading, label, color, text) => `
    <figure>
      <svg viewBox="-120 -130 240 250">
        <circle r="112" fill="url(#seaA)"/>
        <defs><radialGradient id="seaA"><stop offset="0" stop-color="#1b8fd0"/><stop offset="1" stop-color="#0a5a8a"/></radialGradient></defs>
        <g transform="translate(0,-118)" style="color:#fff">${windArrowSVG(0, 16)}</g>
        <g transform="scale(1.05)">${boatSVG({ heading, windFrom: 0 })}</g>
      </svg>
      <figcaption><span class="pill" style="background:${color};color:#fff;border:0">${label}</span><p class="muted" style="margin:8px 0 0">${text}</p></figcaption>
    </figure>`;
  el.innerHTML = `
  <div class="theory-grid">
    <div class="card">
      <h2>Bâbord ou tribord amure ?</h2>
      <p>L’<b>amure</b> dit de quel côté le bateau reçoit le vent. Le vent vient du haut sur ces dessins.</p>
      <div class="two-boats">
        ${fig(300, 'Tribord amure', 'var(--starboard)', boomless('Le vent arrive par la <b>droite</b> (tribord). La bôme est à <b>gauche</b>.'))}
        ${fig(60, 'Bâbord amure', 'var(--port)', boomless('Le vent arrive par la <b>gauche</b> (bâbord). La bôme est à <b>droite</b>.'))}
      </div>
      <div class="callout"><b>Astuce :</b> ${boomless('regarde où est la bôme. Elle est toujours du côté <b>opposé</b> au vent. Bôme à gauche → tribord amure. Bôme à droite → bâbord amure.')}</div>
    </div>
    <div>
      <div class="card">
        <h2 class="h3">Pour s’en souvenir</h2>
        <ul class="help-list" style="font-size:15px;color:var(--ink)">
          <li><b>Bâbord = gauche</b>, <b>tribord = droite</b> (en regardant vers l’avant). Moyen mnémotechnique : « <b>BA</b>-<b>TRI</b>-e » (batterie) : <b>BA</b>bord à gauche, <b>TRI</b>bord à droite.</li>
          <li>Les feux de navigation : <span class="pill port">rouge à bâbord</span> <span class="pill starboard">vert à tribord</span>. Ce code couleur est utilisé partout dans l’application.</li>
          <li>Changer d’amure, c’est faire une <b>manœuvre</b> : un virement de bord (par devant le vent) ou un empannage (par l’arrière).</li>
        </ul>
      </div>
      <div class="card" style="margin-top:16px">
        <h2 class="h3">⚠️ Les priorités entre voiliers</h2>
        <div class="steps">
          <div class="step on"><div><b>Amures opposées :</b> le bateau <b>tribord amure est prioritaire</b>. Bâbord amure doit s’écarter.</div></div>
          <div class="step on"><div><b>Même amure, bord à bord (engagés) :</b> le bateau <b>sous le vent</b> est prioritaire sur celui au vent.</div></div>
          <div class="step on"><div><b>Rattrapage :</b> le bateau qui rattrape s’écarte de celui qui est devant.</div></div>
          <div class="step on"><div><b>À la bouée (règle 18) :</b> dans la zone de 3 longueurs autour d’une marque, si deux bateaux sont engagés, celui de l’<b>extérieur</b> laisse la place de contourner à celui de l’<b>intérieur</b>. Exception : deux bateaux d’amures opposées au près restent sous la règle 10.</div></div>
        </div>
        <p style="margin-bottom:0"><a class="btn sea small" href="#/reflexes/amure">⚡ S’entraîner : bâbord ou tribord ?</a></p>
      </div>
    </div>
  </div>`;
}

// ------------------------------------------------------------------ Lire la voile
function voiles(el) {
  let heading = 70;
  let boom = 20;
  el.innerHTML = `
  <div class="theory-grid">
    <div class="card dial-wrap">
      <svg class="dial" viewBox="-170 -170 340 340" style="cursor:default">
        <circle r="165" fill="url(#seaV)"/>
        <defs><radialGradient id="seaV"><stop offset="0" stop-color="#1b8fd0"/><stop offset="1" stop-color="#0a5a8a"/></radialGradient></defs>
        <g transform="translate(0,-150)" style="color:#fff">${windArrowSVG(0, 14)}</g>
        <g id="vb" transform="scale(1.55)"></g>
      </svg>
    </div>
    <div class="card">
      <h2>Régler à la voile et aux penons</h2>
      <p>Les <b>penons</b> sont des petits brins de laine collés des deux côtés ${getBoat().jib ? 'du foc' : 'de la voile'}. Sur ce schéma, le <b class="tagc" style="--c:var(--starboard)">vert</b> est côté au vent et le <b class="tagc" style="--c:var(--port)">rouge</b> côté sous le vent. Sur un vrai bateau, les couleurs repèrent souvent le côté (vert à tribord, rouge à bâbord) : ce qui compte, c’est de savoir lequel est au vent. Quand la voile est bien réglée, ils filent tous les deux à l’horizontale.</p>
      <label for="sh"><b>Cap du bateau</b> <span class="muted" id="vh"></span></label>
      <input type="range" id="sh" min="30" max="175" value="${heading}" style="width:100%"/>
      <label for="sb"><b>Écoute</b> (ouverture de la voile) <span class="muted" id="vbv"></span></label>
      <input type="range" id="sb" min="2" max="88" value="${boom}" style="width:100%"/>
      <div class="readout">
        <div class="box"><small>Diagnostic</small><b id="vd"></b></div>
        <div class="box"><small>Vitesse</small><b id="vs"></b><div class="speedbar" style="margin-top:6px"><i id="vbar"></i></div></div>
      </div>
      <div class="callout" id="vt"></div>
      <div class="callout warn"><b>Règle d’or :</b> on choque jusqu’à ce que le guindant (avant de la voile) commence à faseyer, puis on borde juste assez pour qu’il arrête.</div>
    </div>
  </div>`;
  const vb = el.querySelector('#vb');
  const draw = () => {
    const a = Math.abs(twa(heading, 0));
    const ideal = idealBoom(a);
    const err = boom - ideal;
    let state = 'ok';
    let diag = '✅ Bien réglé';
    let tip = 'Les deux penons filent droit : le vent glisse bien des deux côtés de la voile.';
    if (a < NO_GO) {
      state = 'irons';
      diag = '⛔ Vent debout';
      tip = 'Dans la zone interdite, aucun réglage ne marche : abats : tire la barre pour t’éloigner du vent !';
    } else if (err > 8) {
      state = 'windward';
      diag = '↗️ Trop choqué';
      tip = 'Le penon au vent (vert) s’agite et la voile faseye à l’avant : <b>borde</b> (ou abats : tire la barre).';
    } else if (err < -8) {
      state = 'leeward';
      diag = '↙️ Trop bordé';
      tip = 'Le penon sous le vent (rouge) décroche : l’air ne suit plus la voile. <b>Choque</b> (ou lofe : pousse la barre).';
    }
    const eff = state === 'irons' ? 0 : Math.max(0.15, 1 - (err / 35) ** 2);
    const sp = speedKn(a, 'medium') * eff;
    vb.innerHTML = boatSVG({ heading, windFrom: 0, boom, jibAngle: Math.max(5, boom * 0.85), telltales: state === 'irons' ? null : state, flap: state === 'irons' || err > 18 });
    el.querySelector('#vh').textContent = `${Math.round(a)}° du vent — ${allureOf(a).label}`;
    el.querySelector('#vbv').textContent = `${Math.round(boom)}° (idéal ≈ ${Math.round(ideal)}°)`;
    el.querySelector('#vd').textContent = diag;
    el.querySelector('#vs').textContent = `${sp.toFixed(1)} nœuds`;
    el.querySelector('#vbar').style.width = `${(sp / 6) * 100}%`;
    el.querySelector('#vt').innerHTML = tip;
  };
  el.querySelector('#sh').addEventListener('input', (e) => {
    heading = +e.target.value;
    draw();
  });
  el.querySelector('#sb').addEventListener('input', (e) => {
    boom = +e.target.value;
    draw();
  });
  draw();
}

// ------------------------------------------------------------------ Réglages
function gauge(v, scale) {
  let s = '<div class="gauge">';
  for (let i = 1; i <= 5; i++) s += `<i class="${i <= v ? 'on' : ''}"></i>`;
  return `${s}</div><div class="gauge-labels"><span>${scale[0]}</span><span>${scale[1]}</span><span>${scale[2]}</span></div>`;
}

function reglages(el) {
  let al = 'pres';
  let w = 'medium';
  el.innerHTML = `
  <div class="card" style="margin-bottom:16px">
    <div class="row">
      <div class="seg" id="sa">${TRIM_ALLURES.map((a) => `<button data-v="${a.id}">${a.label}</button>`).join('')}</div>
      <div class="seg" id="sw">${TRIM_WINDS.map((x) => `<button data-v="${x.id}">${x.emoji} ${x.label}</button>`).join('')}</div>
    </div>
  </div>
  <div class="theory-grid">
    <div>
      <div class="card">
        <svg viewBox="-150 -150 300 300" style="width:100%;max-width:420px;display:block;margin:0 auto">
          <circle r="145" fill="url(#seaR)"/>
          <defs><radialGradient id="seaR"><stop offset="0" stop-color="#1b8fd0"/><stop offset="1" stop-color="#0a5a8a"/></radialGradient></defs>
          <g transform="translate(0,-128)" style="color:#fff">${windArrowSVG(0, 14)}</g>
          <g id="rb" transform="scale(1.35)"></g>
        </svg>
        <h2 class="h3" id="rtitle" style="margin-top:10px"></h2>
        <div class="callout" id="rkey"></div>
        <p><b>👥 Équipage :</b> <span id="rcrew"></span></p>
      </div>
      <div class="card" style="margin-top:16px">
        <h2 class="h3">❓ Gros temps : on tire ou on relâche ?</h2>
        <p style="margin:0">${getBoat().heavyWeather}</p>
      </div>
    </div>
    <div class="card" id="rlist"></div>
  </div>`;
  const { controls: CONTROLS, table: TRIM } = getTrim();
  const draw = () => {
    const t = TRIM[al][w];
    const A = TRIM_ALLURES.find((x) => x.id === al);
    const W = TRIM_WINDS.find((x) => x.id === w);
    el.querySelectorAll('#sa button').forEach((b) => b.classList.toggle('active', b.dataset.v === al));
    el.querySelectorAll('#sw button').forEach((b) => b.classList.toggle('active', b.dataset.v === w));
    const boom = { 1: 80, 2: 55, 3: 35, 4: 18, 5: 10 }[t.v.ecoute];
    el.querySelector('#rb').innerHTML = boatSVG({ heading: -A.heading, windFrom: 0, boom: Math.min(boom, idealBoom(A.heading) + 6), depth: t.depth });
    el.querySelector('#rtitle').textContent = `${A.label} · ${W.label}`;
    el.querySelector('#rkey').innerHTML = `<b>L’essentiel :</b> ${t.key}`;
    el.querySelector('#rcrew').textContent = t.crew;
    el.querySelector('#rlist').innerHTML = `<h2 class="h3">Les réglages</h2>${CONTROLS.map((c) => `
      <div class="trim-row">
        <div class="name">${c.name}<small>${c.what}</small></div>
        <div>${gauge(t.v[c.id], c.scale)}<p class="muted">${c.rule}</p></div>
      </div>`).join('')}
      <p class="muted" style="font-size:13px">${getBoat().trimNote}</p>`;
  };
  el.querySelector('#sa').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b) { al = b.dataset.v; draw(); }
  });
  el.querySelector('#sw').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b) { w = b.dataset.v; draw(); }
  });
  draw();
}

// ------------------------------------------------------------------ Manœuvres
const MANEUVERS = {
  virement: {
    label: 'Virement de bord', from: 45, to: -45, dir: -1,
    intro: 'On change d’amure en passant <b>face au vent</b>. C’est la manœuvre pour remonter au vent.',
    steps: [
      ['« Paré à virer ? »', 'Le barreur vérifie que la voie est libre. L’équipier prépare l’écoute de foc et répond « Paré ! ».', 'Le barreur vérifie que la voie est libre et prépare son écoute en main.'],
      ['« On vire ! »', 'Le barreur pousse la barre vers la voile : le bateau lofe (remonte vers le vent).'],
      ['Face au vent', 'Les voiles faseyent. L’équipage change de bord en passant sous la bôme.', 'La voile faseye. Le barreur change de bord en passant sous la bôme.'],
      ['Nouvelle amure', 'On choque l’ancienne écoute de foc, on borde la nouvelle, on redresse la barre au près.', 'On change de main pour la barre et l’écoute, on borde et on redresse la barre au près.'],
    ],
  },
  empannage: {
    label: 'Empannage', from: 160, to: 200, dir: 1,
    intro: 'On change d’amure en passant <b>vent arrière</b>. La bôme traverse brusquement : attention aux têtes !',
    steps: [
      ['« Paré à empanner ? »', 'Le barreur vérifie que la voie est libre, l’équipage se prépare à baisser la tête. « Paré ! »'],
      ['« Empannez ! »', 'Le barreur tire la barre vers lui : le bateau abat jusqu’au vent arrière.'],
      ['La bôme passe', 'On accompagne la bôme d’un bord à l’autre en tenant l’écoute (ou le palan), tête baissée.'],
      ['Contre-barrer', 'On redresse vite la barre pour ne pas partir au lof, on passe le foc et l’équipage se replace.', 'On redresse vite la barre pour ne pas partir au lof, et on se replace au vent.'],
    ],
  },
  lof: {
    label: 'Virement lof pour lof', from: 150, to: 210, dir: -1,
    intro: 'Par vent fort, plutôt qu’un empannage risqué, on <b>remonte au vent (on lofe en poussant la barre), on vire, puis on abat (en tirant la barre)</b>. Plus long mais plus sûr. Dans le jeu, clique sur un point de manœuvre pour choisir ce sens de virage.',
    steps: [
      ['On lofe (on pousse la barre)', 'Le bateau remonte progressivement jusqu’au près en bordant les voiles.', 'Le bateau remonte progressivement jusqu’au près en bordant la voile.'],
      ['« On vire ! »', 'Virement de bord classique, face au vent.'],
      ['On abat (on tire la barre)', 'Le bateau s’éloigne du vent sur la nouvelle amure en choquant.'],
      ['Nouvelle route', 'On retrouve le grand largue sur l’autre amure, sans empannage.'],
    ],
  },
};

function manoeuvres(el) {
  let cur = 'virement';
  let anim;
  el.innerHTML = `
  <div class="card" style="margin-bottom:16px"><div class="seg" id="ms">${Object.entries(MANEUVERS).map(([k, m]) => `<button data-v="${k}">${m.label}</button>`).join('')}</div></div>
  <div class="theory-grid">
    <div class="card">
      <svg viewBox="-160 -160 320 320" style="width:100%;max-width:480px;display:block;margin:0 auto">
        <circle r="155" fill="url(#seaM)"/>
        <defs><radialGradient id="seaM"><stop offset="0" stop-color="#1b8fd0"/><stop offset="1" stop-color="#0a5a8a"/></radialGradient></defs>
        <g transform="translate(0,-140)" style="color:#fff">${windArrowSVG(0, 14)}</g>
        <path id="marc" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="3" stroke-dasharray="5 7"/>
        <g id="mb" transform="scale(1.4)"></g>
        <text id="mlab" y="140" text-anchor="middle" fill="#fff" font-weight="900" font-size="16"></text>
      </svg>
      <div class="row" style="justify-content:center;margin-top:8px">
        <button class="btn primary" id="mplay">▶ Rejouer</button>
        <input type="range" id="mt" min="0" max="1000" value="0" aria-label="Avancer dans la manœuvre" style="flex:1;max-width:260px"/>
      </div>
    </div>
    <div class="card">
      <h2 id="mtitle"></h2>
      <p id="mintro"></p>
      <div class="steps" id="msteps"></div>
      ${getBoat().maneuverNote ? `<div class="callout" style="margin-top:16px">${boatIcon()} <b>${getBoat().name} :</b> ${getBoat().maneuverNote}</div>` : ''}
    </div>
  </div>`;
  const mb = el.querySelector('#mb');
  const setT = (k) => {
    const m = MANEUVERS[cur];
    // le lof pour lof passe par le près : trajectoire de cap en trois temps
    let h;
    if (cur === 'lof') {
      const path = [150, 45, -45, -150];
      const seg = Math.min(2, Math.floor(k * 3));
      const kk = k * 3 - seg;
      h = path[seg] + (path[seg + 1] - path[seg]) * kk;
    } else h = m.from + (m.to - m.from) * k;
    mb.innerHTML = boatSVG({ heading: h, windFrom: 0 });
    const t = twa(h, 0);
    const lab = Math.abs(t) < NO_GO ? 'Face au vent : ça faseye !' : `${TACKS[tackOf(h, 0)].label} · ${allureOf(t).label}`;
    el.querySelector('#mlab').textContent = lab;
    const idx = Math.min(3, Math.floor(k * 4));
    el.querySelectorAll('#msteps .step').forEach((s, i) => s.classList.toggle('on', i <= idx));
    el.querySelector('#mt').value = Math.round(k * 1000);
  };
  const play = () => {
    cancelAnimationFrame(anim);
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / 5000);
      setT(k);
      if (k < 1) anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
  };
  const load = () => {
    const m = MANEUVERS[cur];
    el.querySelectorAll('#ms button').forEach((b) => b.classList.toggle('active', b.dataset.v === cur));
    el.querySelector('#mtitle').textContent = m.label;
    el.querySelector('#mintro').innerHTML = boomless(m.intro);
    el.querySelector('#msteps').innerHTML = m.steps.map(([a, b, solo]) => `<div class="step"><div><span class="say">${boomless(a)}</span><br/>${boomless(!getBoat().jib && solo ? solo : b)}</div></div>`).join('');
    const a1 = cur === 'lof' ? 150 : m.from;
    const a2 = cur === 'lof' ? 210 : m.to;
    // arc indicatif du virage
    const pts = [];
    const n = 24;
    for (let i = 0; i <= n; i++) {
      let h;
      if (cur === 'lof') h = 150 - (300 * i) / n;
      else h = a1 + ((a2 - a1) * i) / n;
      const [x, y] = P(h, 120);
      pts.push(`${fx(x)},${fx(y)}`);
    }
    el.querySelector('#marc').setAttribute('d', `M${pts.join(' L')}`);
    setT(0);
    play();
  };
  el.querySelector('#ms').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b) { cur = b.dataset.v; load(); }
  });
  el.querySelector('#mplay').addEventListener('click', play);
  el.querySelector('#mt').addEventListener('input', (e) => {
    cancelAnimationFrame(anim);
    setT(+e.target.value / 1000);
  });
  load();
  return () => cancelAnimationFrame(anim);
}

// ------------------------------------------------------------------ Atelier réglages (quiz)
function atelier(el) {
  const { controls: CONTROLS, table: TRIM } = getTrim();
  let scenario;
  let answers = {};
  let score = 0;
  let rounds = 0;
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const next = () => {
    scenario = { al: pick(TRIM_ALLURES), w: pick(TRIM_WINDS) };
    answers = {};
    draw(false);
  };
  const draw = (checked) => {
    const t = TRIM[scenario.al.id][scenario.w.id];
    el.innerHTML = `
    <div class="theory-grid">
      <div class="card">
        <div class="row" style="justify-content:space-between"><h2 style="margin:0">🎯 Règle ton bateau</h2><span class="pill">Score : ${score} / ${rounds * CONTROLS.length}</span></div>
        <p>Situation : <b>${scenario.al.label}</b> (${scenario.al.sub}), <b>${scenario.w.emoji} ${scenario.w.label}</b> (${scenario.w.sub}).</p>
        <svg viewBox="-150 -150 300 300" style="width:100%;max-width:340px;display:block;margin:0 auto">
          <circle r="145" fill="url(#seaQ)"/>
          <defs><radialGradient id="seaQ"><stop offset="0" stop-color="#1b8fd0"/><stop offset="1" stop-color="#0a5a8a"/></radialGradient></defs>
          <g transform="translate(0,-128)" style="color:#fff">${windArrowSVG(0, 14)}</g>
          <g transform="scale(1.35)">${boatSVG({ heading: scenario.al.heading, windFrom: 0, depth: checked ? t.depth : 0.12 })}</g>
        </svg>
        ${checked ? `<div class="callout"><b>L’essentiel :</b> ${t.key}</div><button class="btn primary" id="qnext" style="width:100%">Situation suivante →</button>` : `<button class="btn primary" id="qcheck" style="width:100%" disabled>Valider mes réglages</button>`}
      </div>
      <div class="card">
        ${CONTROLS.map((c) => {
          const v = t.v[c.id];
          return `<div class="trim-row">
            <div class="name">${c.name}<small>${c.what}</small></div>
            <div>
              <div class="quiz-opts" data-c="${c.id}">${c.scale.map((s, i) => {
                let cls = answers[c.id] === i ? 'active' : '';
                if (checked) {
                  if (answers[c.id] === i) cls = answerOk(i, v) ? 'right' : 'wrong';
                  else if (answerOk(i, v) && !answerOk(answers[c.id], v)) cls = 'right';
                }
                return `<button data-i="${i}" class="${cls}" ${checked ? 'disabled' : ''}>${s}</button>`;
              }).join('')}</div>
              ${checked ? `${gauge(v, c.scale)}<p class="muted">${c.rule}</p>` : ''}
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
    el.querySelectorAll('.quiz-opts').forEach((g) =>
      g.addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (!b || checked) return;
        answers[g.dataset.c] = +b.dataset.i;
        g.querySelectorAll('button').forEach((x) => x.classList.toggle('active', x === b));
        el.querySelector('#qcheck').disabled = Object.keys(answers).length < CONTROLS.length;
      }),
    );
    el.querySelector('#qcheck')?.addEventListener('click', () => {
      rounds++;
      CONTROLS.forEach((c) => {
        if (answerOk(answers[c.id], t.v[c.id])) score++;
      });
      draw(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    el.querySelector('#qnext')?.addEventListener('click', next);
  };
  next();
}

// Écrans de théorie réutilisés par les leçons (views/learn.js).
export const LESSON_VIEWS = { allures, amures, voiles, reglages, manoeuvres, atelier };
