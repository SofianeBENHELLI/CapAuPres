// Sauvegarde de la progression dans un fichier, et reprise depuis ce fichier.
// Sur iPad / iPhone, le partage ouvre AirDrop, Mail, Fichiers… ; ailleurs, le fichier se télécharge.
import { store } from '../store.js';

const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();

export const dateFr = (t) => new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

export async function saveBackup() {
  const backup = store.exportBackup();
  const name = `cap-au-pres-${slug(store.name) || 'marin'}-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File([JSON.stringify(backup, null, 1)], name, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Sauvegarde Cap au Près' });
      return 'shared';
    } catch (e) {
      if (e.name === 'AbortError') return 'cancelled';
      /* partage impossible : on télécharge */
    }
  }
  const url = URL.createObjectURL(file);
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return 'downloaded';
}

// Ouvre le sélecteur de fichier ; renvoie le profil lu (pas encore activé), ou null si annulé.
export function pickBackup() {
  return new Promise((resolve, reject) => {
    const input = Object.assign(document.createElement('input'), { type: 'file', accept: '.json,application/json' });
    input.addEventListener('change', async () => {
      const f = input.files?.[0];
      if (!f) return resolve(null);
      try {
        resolve(store.parseBackup(await f.text()));
      } catch (e) {
        reject(e);
      }
    });
    input.click();
  });
}

// Active un profil puis relance l'appli dessus (bateau, grade, chips… tout se recharge).
export function openProfile(apply) {
  apply();
  location.hash = '#/';
  location.reload();
}
