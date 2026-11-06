// Choix des couleurs du bateau (coque, grand-voile, numéro), utilisé dans le Profil et directement
// dans la cérémonie de grade : on personnalise sur place, sans quitter la partie en cours.
import { store } from '../store.js';
import { GRADES } from '../core/progress.js';
import { HULLS, SAILS, NUMBER_GRADE, resolveLook, setLook } from '../core/look.js';
import { boatSVG, setMyLook } from './boat.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const swatch = (x, grade) => {
  const locked = x.grade > grade;
  const why = locked ? ` (débloqué au grade ${GRADES[x.grade].name})` : '';
  const fresh = x.grade === grade && grade > 0 ? ' fresh' : '';
  return `<button type="button" class="swatch${fresh}" style="background:${x.color}" data-id="${x.id}" data-color="${x.color}" title="${x.name}${why}" aria-label="${x.name}${why}"${locked ? ' disabled' : ''}></button>`;
};

export function lookPickerHTML(grade) {
  return `
    <svg class="look-preview" viewBox="-75 -75 150 150" aria-label="Aperçu de ton bateau"><g class="look-boat" transform="scale(1.05)"></g></svg>
    <h4>Coque</h4>
    <div class="swatches" data-part="hull">${HULLS.map((h) => swatch(h, grade)).join('')}</div>
    <h4>Grand-voile</h4>
    <div class="swatches" data-part="sail">${SAILS.map((x) => swatch(x, grade)).join('')}</div>
    <h4>Numéro de voile</h4>
    ${grade >= NUMBER_GRADE
      ? `<input class="look-num" maxlength="4" inputmode="numeric" placeholder="123" value="${esc(store.pref.look?.number || '')}" aria-label="Numéro de voile" />`
      : `<p class="muted" style="margin:0">🔒 Au grade ${GRADES[NUMBER_GRADE].icon} ${GRADES[NUMBER_GRADE].name}.</p>`}`;
}

// Branche les boutons d'un sélecteur déjà inséré dans `el`.
export function bindLookPicker(el, grade) {
  const draw = () => {
    const l = resolveLook(grade);
    setMyLook(l);
    el.querySelector('.look-boat').innerHTML = boatSVG({ heading: 95, windFrom: 0, wake: false });
    el.querySelectorAll('.swatch').forEach((b) => {
      const part = b.closest('[data-part]').dataset.part;
      const on = b.dataset.color === (part === 'hull' ? l.hull : l.sail);
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on);
    });
  };
  draw();
  el.addEventListener('click', (e) => {
    const b = e.target.closest('.swatch');
    if (!b || b.disabled) return;
    setLook({ [b.closest('[data-part]').dataset.part]: b.dataset.id });
    draw();
    window.dispatchEvent(new CustomEvent('progress'));
  });
  const num = el.querySelector('.look-num');
  num?.addEventListener('input', () => {
    setLook({ number: num.value });
    draw();
  });
  num?.addEventListener('change', () => window.dispatchEvent(new CustomEvent('progress')));
}
