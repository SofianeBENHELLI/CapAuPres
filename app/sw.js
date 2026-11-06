// Service worker : app shell en cache, météo en réseau d'abord.
const VERSION = 'capaupres-v1';
const SHELL = [
  './', './index.html', './css/app.css', './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png',
  './js/main.js', './js/geo.js', './js/boats.js', './js/physics.js', './js/wind.js', './js/conditions.js',
  './js/missions.js', './js/race.js', './js/autopilot.js', './js/lessons.js', './js/svg.js', './js/progress.js',
  './js/sim-view.js', './js/refs.js',
];
self.addEventListener('install', (e) => e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL))));
self.addEventListener('activate', (e) => e.waitUntil(
  caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
));
self.addEventListener('message', (e) => { if (e.data === 'skip') self.skipWaiting(); });
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.hostname.endsWith('open-meteo.com')) return; // la page gère son propre cache météo
  if (url.origin === location.origin) {
    // Navigation : on sert la page en cache sans redirection.
    if (e.request.mode === 'navigate') {
      e.respondWith(fetch(e.request).catch(() => caches.match('./index.html')));
      return;
    }
    e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); }
      return res;
    })));
    return;
  }
  // Polices Google : cache puis réseau.
  if (url.hostname.includes('fonts.')) {
    e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      const copy = res.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); return res;
    })));
  }
});
