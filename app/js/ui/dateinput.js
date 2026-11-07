// Saisie rapide d'une date de naissance : on tape les chiffres (clavier numérique sur téléphone),
// les barres s'ajoutent toutes seules : 27121980 → 27/12/1980. Pas de calendrier à faire défiler.

const pad = (n) => String(n).padStart(2, '0');

// « 27/12/1980 » (ou des chiffres seuls) → « 1980-12-27 », ou '' si la date n'existe pas.
export function parseDate(text, now = new Date()) {
  const d = String(text || '').replace(/\D/g, '');
  if (d.length !== 8) return '';
  const day = +d.slice(0, 2);
  const month = +d.slice(2, 4);
  const year = +d.slice(4);
  const dt = new Date(year, month - 1, day);
  if (dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day) return '';
  if (year < 1920 || dt > now) return '';
  return `${year}-${pad(month)}-${pad(day)}`;
}

// Met en forme ce qui est tapé : chiffres seulement, barres après le jour et le mois.
export function formatDigits(text) {
  const d = String(text || '').replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

export const isoToText = (iso) => (/^\d{4}-\d{2}-\d{2}$/.test(iso || '') ? iso.split('-').reverse().join('/') : '');

export function dateInputHTML(id, iso = '', label = 'Date de naissance') {
  return `<label class="name-field">${label}
    <input id="${id}" class="date-input" type="text" inputmode="numeric" autocomplete="bday" placeholder="JJ/MM/AAAA" maxlength="10" value="${isoToText(iso)}" />
  </label>`;
}

// Branche la mise en forme ; `onChange(iso)` reçoit la date valide, ou '' tant qu'elle ne l'est pas.
export function bindDateInput(input, onChange) {
  if (!input) return;
  const update = () => {
    const before = input.value;
    const f = formatDigits(before);
    if (f !== before) input.value = f;
    const iso = parseDate(f);
    const full = f.replace(/\D/g, '').length === 8;
    input.classList.toggle('ok', !!iso);
    input.classList.toggle('bad', full && !iso);
    input.setAttribute('aria-invalid', full && !iso ? 'true' : 'false');
    onChange?.(iso);
  };
  input.addEventListener('input', update);
  update();
}
