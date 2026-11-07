// Service worker de Cap au Près : application disponible hors ligne.
// La liste des fichiers et la version sont générées par `npm run build` (tools/build-sw.mjs).

// <precache>
const VERSION = 'b11-carte-reduire';
const ASSETS = [
  './',
  './assets/cnbpp-logo.png',
  './assets/cnbpp-rond.png',
  './assets/fonts/poppins-400.woff2',
  './assets/fonts/poppins-500.woff2',
  './assets/fonts/poppins-600.woff2',
  './assets/fonts/poppins-700.woff2',
  './assets/fonts/poppins-800.woff2',
  './assets/fonts/poppins.css',
  './css/style.css',
  './favicon.ico',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon.svg',
  './icons/maskable-192.png',
  './icons/maskable-512.png',
  './icons/maskable.svg',
  './js/core/angles.js',
  './js/core/boats.js',
  './js/core/challenge.js',
  './js/core/cloud.js',
  './js/core/conditions.js',
  './js/core/course.js',
  './js/core/heel.js',
  './js/core/land.js',
  './js/core/levels.js',
  './js/core/live.js',
  './js/core/look.js',
  './js/core/maneuver.js',
  './js/core/merge.js',
  './js/core/polar.js',
  './js/core/progress.js',
  './js/core/rules.js',
  './js/core/sim.js',
  './js/core/solver.js',
  './js/core/srs.js',
  './js/core/weather.js',
  './js/data/bay.js',
  './js/data/climate.js',
  './js/data/glossary.js',
  './js/data/knots.js',
  './js/data/lessons.js',
  './js/data/trim.js',
  './js/main.js',
  './js/pwa.js',
  './js/store.js',
  './js/ui/backup.js',
  './js/ui/boat.js',
  './js/ui/dateinput.js',
  './js/ui/fx.js',
  './js/ui/gear.js',
  './js/ui/lookpicker.js',
  './js/ui/map.js',
  './js/ui/rope.js',
  './js/ui/windmap.js',
  './js/views/boat.js',
  './js/views/conditions.js',
  './js/views/game.js',
  './js/views/games.js',
  './js/views/heel.js',
  './js/views/home.js',
  './js/views/learn.js',
  './js/views/live.js',
  './js/views/matelotage.js',
  './js/views/play.js',
  './js/views/profile.js',
  './js/views/reflexes.js',
  './js/views/theory.js',
  './manifest.webmanifest',
];
// </precache>

const CACHE = `capaupres-${VERSION}`;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('capaupres-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// La page demande d'activer tout de suite la nouvelle version (bouton « Mettre à jour »).
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

// Une réponse issue d'une redirection est refusée pour une navigation : on la recopie telle quelle.
const unredirect = (res) =>
  res.redirected ? res.blob().then((body) => new Response(body, { status: res.status, headers: res.headers })) : res;

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes('/api/')) return; // sauvegarde en ligne : toujours le réseau

  // Navigation vers l'application (routes après le #) : page servie depuis le cache.
  // Les autres pages (outils de test…) passent par le réseau.
  const isApp = url.pathname.endsWith('/') || url.pathname.endsWith('/index.html');
  if (req.mode === 'navigate' && isApp) {
    event.respondWith(
      caches.match('./').then((cached) => (cached ? unredirect(cached) : fetch(req))),
    );
    return;
  }

  // Fichiers : cache d'abord, réseau sinon (et on garde une copie).
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(
      (cached) =>
        cached ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
