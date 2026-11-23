// Installable, offline-capable Noor. The service worker caches the interface
// and every passage, photograph and recitation once it has been viewed.
let deferredInstall = null;

export function registerOffline({ toast }) {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) toast('A new version of Noor is ready.', 'Refresh', () => location.reload());
          else if (worker.state === 'activated' && !navigator.serviceWorker.controller) toast('Noor now works offline on this device.');
        });
      });
    }).catch(() => {});
  });
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredInstall = event;
    document.body.classList.add('can-install');
  });
  window.addEventListener('appinstalled', () => { deferredInstall = null; document.body.classList.remove('can-install'); toast('Noor is on your home screen.'); });
}

export async function promptInstall() {
  if (!deferredInstall) return false;
  deferredInstall.prompt();
  await deferredInstall.userChoice.catch(() => null);
  deferredInstall = null;
  document.body.classList.remove('can-install');
  return true;
}
