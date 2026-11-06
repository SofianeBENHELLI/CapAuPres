// Installation (PWA), mises à jour du service worker et indicateur hors ligne.

const banner = document.getElementById('appBanner');
const installBtn = document.getElementById('installBtn');

function showBanner(html, { actions = [], timeout = 0 } = {}) {
  banner.innerHTML = `<span>${html}</span>${actions.map((a, i) => `<button class="btn small${a.primary ? ' primary' : ''}" data-i="${i}">${a.label}</button>`).join('')}`;
  banner.hidden = false;
  banner.querySelectorAll('button').forEach((b) =>
    b.addEventListener('click', () => {
      const a = actions[+b.dataset.i];
      if (a.run) a.run();
      if (a.close !== false) banner.hidden = true;
    }),
  );
  clearTimeout(showBanner.t);
  if (timeout) showBanner.t = setTimeout(() => (banner.hidden = true), timeout);
}

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// ---------- Installation
let deferredPrompt = null;

function refreshInstallButton() {
  const canPrompt = !!deferredPrompt;
  const iosHint = isIOS() && !isStandalone();
  installBtn.hidden = isStandalone() || !(canPrompt || iosHint);
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  refreshInstallButton();
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  refreshInstallButton();
  showBanner('⛵ Cap au Près est installée ! Tu la retrouves avec tes autres applications.', { timeout: 5000 });
});

installBtn.addEventListener('click', async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    await deferredPrompt.userChoice.catch(() => null);
    deferredPrompt = null;
    refreshInstallButton();
    return;
  }
  if (isIOS()) {
    showBanner('Pour installer : touche <b>Partager</b> <span aria-hidden="true">⬆️</span> puis <b>« Sur l’écran d’accueil »</b>.', {
      actions: [{ label: 'OK' }],
    });
  }
});

refreshInstallButton();

// ---------- Service worker et mises à jour
function promptUpdate(worker) {
  showBanner('🆕 Une nouvelle version est disponible.', {
    actions: [
      { label: 'Mettre à jour', primary: true, run: () => worker.postMessage('SKIP_WAITING') },
      { label: 'Plus tard' },
    ],
  });
}

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    location.reload();
  });

  navigator.serviceWorker
    .register('sw.js')
    .then((reg) => {
      if (reg.waiting && navigator.serviceWorker.controller) promptUpdate(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        if (!w) return;
        w.addEventListener('statechange', () => {
          if (w.state !== 'installed') return;
          // première installation : rien à proposer, l'app est simplement prête hors ligne
          if (navigator.serviceWorker.controller) promptUpdate(w);
          else showBanner('✅ Application prête à fonctionner hors ligne.', { timeout: 4000 });
        });
      });
      // vérifie régulièrement s'il existe une nouvelle version
      const check = () => reg.update().catch(() => {});
      document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check());
      setInterval(check, 30 * 60 * 1000);
    })
    .catch(() => {});

  // Demande au navigateur de ne pas effacer la progression (étoiles, records).
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
}

// ---------- Hors ligne
window.addEventListener('offline', () => showBanner('📴 Hors ligne : pas de souci, tout fonctionne sans réseau.', { timeout: 5000 }));
window.addEventListener('online', () => showBanner('📶 De nouveau en ligne.', { timeout: 2500 }));
