// Sauvegarde en ligne des profils (Cloudflare Pages Functions + KV).
//   GET /api/profil/:key   lit le profil
//   PUT /api/profil/:key   fusionne le profil envoyé avec celui du serveur, enregistre et renvoie le résultat
// `key` est l'empreinte SHA-256 (calculée dans le navigateur) du pseudo et de la date de naissance :
// le serveur ne voit jamais ni l'un ni l'autre. Il la re-hache avec un secret (PEPPER) avant de
// l'utiliser comme clé KV, pour qu'une copie de la base ne permette pas de retrouver les élèves.
import { mergeProfiles, cloudPayload } from '../../../app/js/core/merge.js';

const MAX_BYTES = 256 * 1024;
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

async function kvKey(env, key) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${env.PEPPER || ''}|${key}`));
  return 'p:' + [...new Uint8Array(h)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

export async function onRequest({ request, env, params }) {
  const key = String(params.key || '');
  if (!/^[a-f0-9]{64}$/.test(key)) return json({ error: 'clé invalide' }, 400);
  if (!env.PROFILS) return json({ error: 'stockage non configuré' }, 503);
  const k = await kvKey(env, key);

  if (request.method === 'GET') {
    const stored = await env.PROFILS.get(k, 'json');
    return stored ? json(stored) : json({ error: 'introuvable' }, 404);
  }

  if (request.method === 'PUT') {
    const text = await request.text();
    if (text.length > MAX_BYTES) return json({ error: 'profil trop volumineux' }, 413);
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      return json({ error: 'JSON invalide' }, 400);
    }
    if (!body || typeof body.profile !== 'object' || Array.isArray(body.profile)) return json({ error: 'profil manquant' }, 400);
    const incoming = cloudPayload(body.profile);
    const stored = body.replace ? null : await env.PROFILS.get(k, 'json');
    const profile = stored ? mergeProfiles(stored.profile, incoming) : incoming;
    const out = { profile, savedAt: Date.now() };
    await env.PROFILS.put(k, JSON.stringify(out));
    return json(out);
  }

  return json({ error: 'méthode non autorisée' }, 405);
}
