// Fiche météo A4 : dessinée sur un canvas, puis emballée dans un vrai fichier PDF d'une page.
// On ne passe pas par l'impression du navigateur : elle n'existe pas sur tablette quand l'appli
// est installée sur l'écran d'accueil. Le PDF s'affiche dans l'appli, puis se partage, s'imprime
// ou s'enregistre.

const S = 200 / 25.4; // pixels par millimètre (200 dpi)
const PAGE = { w: 210, h: 297, m: 9 };
const PT = 0.3528; // millimètres par point
const NAVY = '#243150';
const MUTED = '#566179';
const SOFT = '#eef4f9';
const LINE = '#c9d3df';
const FLAG_COLORS = { green: '#308446', yellow: '#f7b500', red: '#cc0605', black: '#0e0e10', night: '#8a8f99', none: '#c9d3df' };
const FONT = 'Poppins, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';

const loadImage = (src) =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

// Un SVG de la page devient une image : on recopie dans chaque élément le style calculé, car une
// image SVG ne voit plus la feuille de style de la page.
const SVG_PROPS = ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin', 'opacity', 'fill-opacity', 'stroke-opacity', 'font-size', 'font-weight', 'font-style', 'text-anchor', 'dominant-baseline', 'paint-order', 'letter-spacing', 'display', 'visibility'];
export async function svgToImage(svg, wPx, hPx, { slice = false, drop = [] } = {}) {
  if (!svg) return null;
  const clone = svg.cloneNode(true);
  const src = [svg, ...svg.querySelectorAll('*')];
  const dst = [clone, ...clone.querySelectorAll('*')];
  src.forEach((el, i) => {
    if (['defs', 'linearGradient', 'radialGradient', 'stop', 'pattern', 'clipPath'].includes(el.tagName)) return;
    const cs = getComputedStyle(el);
    let style = '';
    for (const p of SVG_PROPS) {
      const v = cs.getPropertyValue(p);
      if (v) style += `${p}:${v};`;
    }
    dst[i].setAttribute('style', `${style}font-family:Arial,Helvetica,sans-serif;animation:none;`);
    dst[i].removeAttribute('class');
  });
  // éléments d'habillage qu'on ne veut pas sur le papier (voile de nuit, traînées animées)
  drop.forEach((sel) => svg.querySelectorAll(sel).forEach((el) => dst[src.indexOf(el)]?.remove()));
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', wPx);
  clone.setAttribute('height', hPx);
  if (slice) clone.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  const xml = new XMLSerializer().serializeToString(clone);
  return loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`);
}

// ---------------------------------------------------------------- Dessin de la page
function painter(ctx) {
  const mm = (v) => v * S;
  const font = (pt, weight = 400) => (ctx.font = `${weight} ${pt * PT * S}px ${FONT}`);
  const text = (t, x, y, { pt = 9.5, weight = 400, color = '#1d2639', align = 'left', maxW = 0, fit = false } = {}) => {
    font(pt, weight);
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    let s = String(t);
    // trop long : on réduit d'abord la taille (jusqu'à 70 %), on ne coupe qu'en dernier recours
    if (maxW && fit) for (let k = pt; k > pt * 0.7 && ctx.measureText(s).width > mm(maxW); k -= 0.25) font(k, weight);
    if (maxW) while (s.length > 3 && ctx.measureText(s).width > mm(maxW)) s = `${s.slice(0, -2).trimEnd()}…`;
    ctx.fillText(s, mm(x), mm(y));
  };
  const wrap = (t, maxW, pt, weight = 400) => {
    font(pt, weight);
    const lines = [];
    let cur = '';
    for (const w of String(t).split(/\s+/)) {
      const tryLine = cur ? `${cur} ${w}` : w;
      if (ctx.measureText(tryLine).width > mm(maxW) && cur) {
        lines.push(cur);
        cur = w;
      } else cur = tryLine;
    }
    if (cur) lines.push(cur);
    return lines;
  };
  const para = (t, x, y, maxW, { pt = 9, weight = 400, color = '#1d2639', lh = 1.3, maxLines = 9, align = 'left' } = {}) => {
    const lines = wrap(t, maxW, pt, weight).slice(0, maxLines);
    lines.forEach((l, i) => text(l, x, y + i * pt * PT * lh, { pt, weight, color, align }));
    return lines.length * pt * PT * lh;
  };
  const box = (x, y, w, h, r, fill, stroke = null, lw = 0.25) => {
    ctx.beginPath();
    ctx.roundRect(mm(x), mm(y), mm(w), mm(h), mm(r));
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = mm(lw);
      ctx.stroke();
    }
  };
  const rule = (y, color = NAVY, lw = 0.6) => {
    ctx.fillStyle = color;
    ctx.fillRect(mm(PAGE.m), mm(y), mm(PAGE.w - 2 * PAGE.m), mm(lw));
  };
  // drapeau sur sa hampe, coin haut-gauche en (x, y), hauteur `size`
  const flag = (x, y, size, color) => {
    const k = (mm(size) / 32);
    ctx.save();
    ctx.translate(mm(x), mm(y));
    ctx.scale(k, k);
    ctx.fillStyle = '#6b7280';
    ctx.fillRect(4, 2, 2.5, 28);
    ctx.beginPath();
    ctx.moveTo(6.5, 4);
    ctx.bezierCurveTo(12, 1, 17, 7, 23, 4);
    ctx.bezierCurveTo(26, 2.5, 29, 4, 29, 4);
    ctx.lineTo(29, 17);
    ctx.bezierCurveTo(23, 20, 18, 14, 12.5, 17);
    ctx.bezierCurveTo(9.5, 18.5, 6.5, 17, 6.5, 17);
    ctx.closePath();
    ctx.fillStyle = FLAG_COLORS[color] || FLAG_COLORS.none;
    ctx.fill();
    ctx.restore();
  };
  // flèche qui part dans le sens où va le vent
  const arrow = (cx, cy, size, from, color = '#1b6f9e') => {
    const k = mm(size) / 24;
    ctx.save();
    ctx.translate(mm(cx), mm(cy));
    ctx.rotate(((from + 180) * Math.PI) / 180);
    ctx.scale(k, k);
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(6, 6);
    ctx.lineTo(0, 2);
    ctx.lineTo(-6, 6);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  };
  return { mm, font, text, wrap, para, box, rule, flag, arrow };
}

// model : { title, club, when, flag: {color, label, text}, kpis: [{label, big, small}],
//   slots: [{time, flag: {color, label}, kn, gust, from, dir, waves, sky}],
//   mapTitle, mapSvg, mapCaption, tideTitle, tideSvg, notes: [], disclaimer, small }
export async function drawSheet(model) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(PAGE.w * S);
  canvas.height = Math.round(PAGE.h * S);
  const ctx = canvas.getContext('2d');
  // anciens navigateurs : pas de coins arrondis, des rectangles
  if (!ctx.roundRect) ctx.roundRect = function (x, y, w, h) { this.rect(x, y, w, h); };
  const p = painter(ctx);
  const { mm, text, para, box, rule } = p;
  const X = PAGE.m;
  const W = PAGE.w - 2 * PAGE.m;
  await document.fonts?.ready;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // ---- en-tête : logo, titre, créneau, drapeau
  const logo = await loadImage('assets/cnbpp-logo.png');
  let lx = X;
  if (logo) {
    const lh = 19;
    const lw = (logo.naturalWidth / logo.naturalHeight) * lh;
    ctx.drawImage(logo, mm(X), mm(10), mm(lw), mm(lh));
    lx = X + lw + 5;
  }
  const FW = 46;
  text(model.title, lx, 17, { pt: 16.5, weight: 800, color: NAVY, maxW: W - (lx - X) - FW - 4, fit: true });
  text(model.club, lx, 22.5, { pt: 10, color: '#1d2639', maxW: W - (lx - X) - FW - 4 });
  text(model.when, lx, 29, { pt: 12, weight: 800, color: '#1b6f9e', maxW: W - (lx - X) - FW - 4, fit: true });
  const fx = X + W - FW;
  box(fx, 9, FW, 23, 3, '#fff', LINE, 0.4);
  ctx.fillStyle = FLAG_COLORS[model.flag.color] || FLAG_COLORS.none;
  ctx.beginPath();
  ctx.roundRect(mm(fx), mm(9), mm(2.2), mm(23), [mm(3), 0, 0, mm(3)]);
  ctx.fill();
  p.flag(fx + FW / 2 - 4.5, 10, 9.5, model.flag.color);
  text(model.flag.label, fx + FW / 2 + 1, 24.5, { pt: 12, weight: 800, color: NAVY, align: 'center' });
  para(model.flag.text, fx + FW / 2 + 1, 28.3, FW - 6, { pt: 7.2, color: MUTED, align: 'center', maxLines: 1 });
  rule(34);

  // ---- chiffres clés
  const n = model.kpis.length || 1;
  const kw = (W - 2 * (n - 1)) / n;
  model.kpis.forEach((k, i) => {
    const x = X + i * (kw + 2);
    box(x, 37.5, kw, 19, 2.5, SOFT);
    text(k.label.toUpperCase(), x + 2.5, 42, { pt: 6.8, weight: 700, color: MUTED });
    text(k.big, x + 2.5, 48.3, { pt: 13.5, weight: 800, color: NAVY, maxW: kw - 5 });
    para(k.small, x + 2.5, 52, kw - 5, { pt: 6.8, color: MUTED, lh: 1.2, maxLines: 2 });
  });

  // ---- tableau d'évolution
  text('Évolution sur le créneau', X, 62.5, { pt: 10.5, weight: 800, color: NAVY });
  const ty = 64.5;
  const c0 = 30;
  const cw = (W - c0) / model.slots.length;
  const rows = [
    ['Drapeau', (s, cx, cy) => { p.flag(cx - 13, cy - 3.6, 5.2, s.flag.color); text(s.flag.label, cx - 6.5, cy + 0.2, { pt: 9.5 }); }],
    ['Vent moyen', (s, cx, cy) => text(`${s.kn} nds`, cx, cy + 0.2, { pt: 10, weight: 800, align: 'center', color: NAVY })],
    ['Rafales', (s, cx, cy) => text(`${s.gust} nds`, cx, cy + 0.2, { pt: 9.5, align: 'center' })],
    ['Direction', (s, cx, cy) => { p.arrow(cx - 6, cy - 1.1, 4.2, s.from); text(s.dir, cx - 2.5, cy + 0.2, { pt: 9.5 }); }],
    ['Vagues', (s, cx, cy) => text(s.waves, cx, cy + 0.2, { pt: 9.5, align: 'center' })],
    ['Ciel', (s, cx, cy) => text(s.sky, cx, cy + 0.2, { pt: 9.5, align: 'center' })],
  ];
  const hh = 7;
  const rh = 6.1;
  ctx.fillStyle = NAVY;
  ctx.fillRect(mm(X), mm(ty), mm(W), mm(hh));
  model.slots.forEach((s, i) => text(s.time, X + c0 + cw * (i + 0.5), ty + 4.9, { pt: 11, weight: 800, color: '#fff', align: 'center' }));
  rows.forEach(([label, draw], r) => {
    const y = ty + hh + r * rh;
    ctx.fillStyle = SOFT;
    ctx.fillRect(mm(X), mm(y), mm(c0), mm(rh));
    text(label, X + 2, y + 4.2, { pt: 9.5, weight: 800, color: NAVY });
    model.slots.forEach((s, i) => draw(s, X + c0 + cw * (i + 0.5), y + 4));
  });
  const tEnd = ty + hh + rows.length * rh;
  ctx.strokeStyle = LINE;
  ctx.lineWidth = mm(0.25);
  ctx.beginPath();
  for (let r = 0; r <= rows.length; r++) {
    ctx.moveTo(mm(X), mm(ty + hh + r * rh));
    ctx.lineTo(mm(X + W), mm(ty + hh + r * rh));
  }
  for (let c = 0; c <= model.slots.length; c++) {
    ctx.moveTo(mm(X + c0 + c * cw), mm(ty + hh));
    ctx.lineTo(mm(X + c0 + c * cw), mm(tEnd));
  }
  ctx.moveTo(mm(X), mm(ty + hh));
  ctx.lineTo(mm(X), mm(tEnd));
  ctx.stroke();

  // ---- du bas vers le haut : pied de page, à savoir, marée ; la carte prend ce qui reste
  const footTop = PAGE.h - PAGE.m - 17;
  rule(footTop);
  const dh = para(model.disclaimer, X, footTop + 5.2, W, { pt: 10, weight: 800, color: '#cc2f35', lh: 1.25, maxLines: 2 });
  para(model.small, X, footTop + 5.2 + dh + 0.6, W, { pt: 6.6, color: MUTED, lh: 1.25, maxLines: 2 });

  let y = footTop - 2;
  if (model.notes.length) {
    const lines = model.notes.slice(0, 3);
    y -= lines.length * 4 + 6;
    text('À savoir', X, y + 3.6, { pt: 10.5, weight: 800, color: NAVY });
    lines.forEach((nt, i) => text(`•  ${nt}`, X + 1, y + 8.2 + i * 4, { pt: 8.3, maxW: W - 2 }));
    y -= 2;
  }
  if (model.tideSvg) {
    const th = 31;
    y -= th + 5.5;
    text(model.tideTitle, X, y + 3.8, { pt: 10.5, weight: 800, color: NAVY, maxW: W });
    const tw = Math.min(W, th * (600 / 176));
    const img = await svgToImage(model.tideSvg, Math.round(mm(tw)), Math.round(mm(th)));
    if (img) ctx.drawImage(img, mm(X + (W - tw) / 2), mm(y + 5.5), mm(tw), mm(th));
    y -= 2;
  }
  const mapTop = tEnd + 5;
  text(model.mapTitle, X, mapTop + 3.8, { pt: 10.5, weight: 800, color: NAVY, maxW: W });
  const my = mapTop + 5.5;
  const mh = Math.max(30, y - 5 - my);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(mm(X), mm(my), mm(W), mm(mh), mm(3));
  ctx.clip();
  ctx.fillStyle = '#1f86c0';
  ctx.fillRect(mm(X), mm(my), mm(W), mm(mh));
  const map = await svgToImage(model.mapSvg, Math.round(mm(W)), Math.round(mm(mh)), { drop: ['.wm-night'] });
  if (map) ctx.drawImage(map, mm(X), mm(my), mm(W), mm(mh));
  ctx.restore();
  text(model.mapCaption, X, my + mh + 3.4, { pt: 7.2, color: MUTED, maxW: W });
  return canvas;
}

// ---------------------------------------------------------------- PDF d'une page contenant l'image
export function jpegToPdf(jpeg, wPx, hPx) {
  const enc = new TextEncoder();
  const Wp = (PAGE.w / 25.4) * 72;
  const Hp = (PAGE.h / 25.4) * 72;
  const content = `q ${Wp.toFixed(2)} 0 0 ${Hp.toFixed(2)} 0 0 cm /Im0 Do Q`;
  const parts = [];
  const offsets = [];
  let size = 0;
  const push = (chunk) => {
    const bytes = typeof chunk === 'string' ? enc.encode(chunk) : chunk;
    parts.push(bytes);
    size += bytes.length;
  };
  const obj = (n, body, stream = null) => {
    offsets[n] = size;
    push(`${n} 0 obj\n${body}\n`);
    if (stream) {
      push('stream\n');
      push(stream);
      push('\nendstream\n');
    }
    push('endobj\n');
  };
  push('%PDF-1.4\n%âãÏÓ\n');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${Wp.toFixed(2)} ${Hp.toFixed(2)}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
  obj(4, `<< /Type /XObject /Subtype /Image /Width ${wPx} /Height ${hPx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>`, jpeg);
  obj(5, `<< /Length ${content.length} >>`, enc.encode(content));
  const xref = size;
  push(`xref\n0 6\n0000000000 65535 f \n${[1, 2, 3, 4, 5].map((n) => `${String(offsets[n]).padStart(10, '0')} 00000 n \n`).join('')}`);
  push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(parts, { type: 'application/pdf' });
}

// ---------------------------------------------------------------- Ouverture du PDF
// Un seul geste : « Imprimer » ouvre le PDF.
// - Dans un navigateur : un onglet s'ouvre tout de suite (pendant le clic, sinon il serait bloqué)
//   et reçoit le PDF dès qu'il est prêt ; la visionneuse du navigateur sait l'imprimer.
// - Appli installée sur l'écran d'accueil (tablette, téléphone) : pas d'onglet possible, on passe
//   par la feuille de partage du système, qui affiche le PDF et propose Imprimer.
const isStandalone = () => navigator.standalone === true || window.matchMedia?.('(display-mode: standalone)').matches;

async function buildPdf(model, fileName) {
  const canvas = await drawSheet(model);
  const jpegBlob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.92));
  const jpeg = new Uint8Array(await jpegBlob.arrayBuffer());
  const pdf = jpegToPdf(jpeg, canvas.width, canvas.height);
  return { pdf, jpegBlob, file: new File([pdf], fileName, { type: 'application/pdf' }), url: URL.createObjectURL(pdf) };
}

// `makeModel` est appelé après l'ouverture de l'onglet : rien ne doit retarder window.open.
export async function openPdf(makeModel, fileName) {
  let tab = null;
  if (!isStandalone()) {
    tab = window.open('', '_blank');
    if (tab) {
      tab.document.title = 'Fiche météo';
      tab.document.body.innerHTML = '<p style="font:600 18px system-ui,sans-serif;color:#243150;text-align:center;margin-top:40vh">Préparation de la fiche météo…</p>';
    }
  }
  const wait = tab ? null : waitBox();
  try {
    const out = await buildPdf(await makeModel(), fileName);
    setTimeout(() => URL.revokeObjectURL(out.url), 10 * 60 * 1000);
    if (tab && !tab.closed) {
      // si l'appareil télécharge le PDF au lieu de l'afficher, l'onglet garde ce message et un lien
      tab.document.body.innerHTML = '<p style="font:600 18px system-ui,sans-serif;color:#243150;text-align:center;margin-top:40vh">La fiche météo est prête.<br><br><a id="f">Ouvrir la fiche (PDF)</a><br><br><small>Si elle ne s’affiche pas, elle est dans vos téléchargements.</small></p>';
      Object.assign(tab.document.getElementById('f'), { href: out.url, download: fileName });
      tab.location.replace(out.url);
      return out.pdf;
    }
    // pas d'onglet : feuille de partage, ou à défaut téléchargement
    const share = () => navigator.share({ files: [out.file], title: 'Fiche météo · baie de La Baule' });
    const download = () => {
      const a = Object.assign(document.createElement('a'), { href: out.url, download: fileName });
      document.body.appendChild(a);
      a.click();
      a.remove();
    };
    if (navigator.canShare?.({ files: [out.file] })) {
      try {
        await share();
        wait.close();
      } catch (e) {
        if (e.name === 'AbortError') wait.close();
        // le système exige un nouveau geste : la fiche est prête, un toucher l'ouvre
        else wait.ready(out.jpegBlob, () => share().then(wait.close).catch(() => {}));
      }
    } else {
      download();
      wait.close();
    }
    return out.pdf;
  } catch (e) {
    console.error(e);
    if (tab && !tab.closed) tab.close();
    (wait || waitBox()).fail();
    return null;
  }
}

// Petit écran d'attente (appli installée) : « Préparation… », puis au besoin la fiche à toucher.
function waitBox() {
  document.querySelector('.pdf-view')?.remove();
  const view = document.createElement('div');
  view.className = 'pdf-view';
  view.innerHTML = '<div class="pv-page"><p class="pv-wait">Préparation de la fiche météo…</p></div>';
  document.body.appendChild(view);
  document.body.classList.add('pdf-open');
  const close = () => {
    view.remove();
    document.body.classList.remove('pdf-open');
  };
  return {
    close,
    ready(jpegBlob, open) {
      view.innerHTML = `<div class="pv-bar"><button class="btn primary" data-a="open">📄 Ouvrir la fiche</button><button class="btn small" data-a="close">✕</button></div><div class="pv-page"><img alt="Fiche météo du créneau choisi"/></div>`;
      view.querySelector('img').src = URL.createObjectURL(jpegBlob);
      view.querySelector('[data-a="open"]').onclick = open;
      view.querySelector('img').onclick = open;
      view.querySelector('[data-a="close"]').onclick = close;
    },
    fail() {
      view.innerHTML = '<div class="pv-page"><p class="pv-wait">Impossible de préparer la fiche sur cet appareil.</p><button class="btn" data-a="close">Fermer</button></div>';
      view.querySelector('[data-a="close"]').onclick = close;
    },
  };
}
