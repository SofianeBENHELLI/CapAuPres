// Sauvegarde en ligne : dès que le pseudo et la date de naissance sont renseignés, la progression
// est envoyée au serveur après chaque changement, et récupérée au démarrage. Le serveur fusionne
// (meilleur score de chaque côté) : plusieurs appareils peuvent jouer sans s'écraser.
import { store } from '../store.js';
import { cloudKey, cloudPayload, mergeProfiles } from './merge.js';
import { setBoat, getBoat } from './boats.js';

const API = 'api/profil/';
let timer = null;
let busy = false;
let again = false;
const status = { state: 'off', at: 0, error: '' };

function emit() {
  window.dispatchEvent(new CustomEvent('cloudstatus', { detail: { ...status } }));
}
function set(state, extra = {}) {
  Object.assign(status, { state, error: '' }, extra);
  emit();
}
export const cloudStatus = () => ({ ...status });

async function key() {
  if (!store.name || !store.birth) return null;
  return cloudKey(store.name, store.birth);
}

async function request(k, method, body) {
  const res = await fetch(API + k, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Envoie la progression locale ; le serveur renvoie la version fusionnée, qu'on adopte.
export async function push() {
  if (busy) {
    again = true;
    return;
  }
  const k = await key().catch(() => null);
  if (!k) return set('off');
  // Le pseudo ou la date ont changé : si ce nouveau couple appartient déjà à quelqu'un, on n'y
  // déverse pas la progression de ce profil (sur un appareil partagé, il faut « Nouveau marin »).
  busy = true;
  const prev = store.cloud?.key;
  if (prev && prev !== k) {
    let taken = null;
    try {
      taken = await request(k, 'GET');
    } catch {
      busy = false;
      return set('error', { error: 'hors ligne' });
    }
    if (taken) {
      busy = false;
      return set('taken');
    }
  }
  set('sync');
  try {
    const before = JSON.stringify(cloudPayload(store.snapshot()));
    const out = await request(k, 'PUT', { profile: cloudPayload(store.snapshot()) });
    if (out?.profile) {
      const merged = mergeProfiles(store.snapshot(), out.profile);
      if (JSON.stringify(cloudPayload(merged)) !== before) {
        store.adopt(merged);
        if (store.boat && store.boat !== getBoat().id) {
          setBoat(store.boat);
          window.dispatchEvent(new CustomEvent('boatchange'));
        }
        window.dispatchEvent(new CustomEvent('progress'));
      }
    }
    store.setCloud({ key: k, at: Date.now() });
    set('ok', { at: Date.now() });
  } catch (e) {
    set('error', { error: navigator.onLine === false ? 'hors ligne' : e.message });
  } finally {
    busy = false;
    if (again) {
      again = false;
      schedule();
    }
  }
}

export function schedule(ms = 2500) {
  clearTimeout(timer);
  timer = setTimeout(push, ms);
}

// Lit le profil en ligne sans rien envoyer : pour proposer de reprendre une progression.
export async function peek(name, birth) {
  const k = await cloudKey(name, birth);
  const out = await request(k, 'GET');
  return out?.profile || null;
}

export function startCloud() {
  store.onSave(() => {
    if (store.name && store.birth) schedule();
  });
  window.addEventListener('online', () => schedule(500));
  if (store.name && store.birth) schedule(800);
}
