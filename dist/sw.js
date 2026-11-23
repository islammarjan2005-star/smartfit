// Noor service worker: app shell precache, then cache-as-you-read.
const VERSION = 'noor-v11-1';
const SHELL = [
  '/', '/index.html', '/manifest.webmanifest',
  '/app.js', '/content.js', '/hadith-content.js', '/library.js', '/feed-window.js', '/reader.js', '/recitation.js',
  '/personal-library.js', '/personal-ui.js', '/photography.js', '/photo-library.js', '/photo-topics.js', '/reading-keyboard.js',
  '/icons.js', '/prayer.js', '/today.js', '/share-image.js', '/offline.js',
  '/styles.css', '/reader.css', '/editorial.css', '/photography.css', '/personal-library.css', '/today.css',
  '/assets/noor.svg', '/assets/icon-192.png', '/assets/icon-512.png',
  '/data/quran/manifest.json',
];
const RUNTIME = `${VERSION}-runtime`;
const MEDIA = 'noor-media';

self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== RUNTIME && k !== MEDIA).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

const limit = async (name, max) => {
  const cache = await caches.open(name), keys = await cache.keys();
  for (const key of keys.slice(0, Math.max(0, keys.length - max))) await cache.delete(key);
};

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Pages: network first so updates arrive, cached shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      const copy = response.clone(); caches.open(VERSION).then(c => c.put('/index.html', copy));
      return response;
    }).catch(() => caches.match('/index.html')));
    return;
  }

  // Recitations from the CDN: cache what has been heard (bounded).
  if (url.hostname === 'cdn.islamic.network' || url.pathname.endsWith('.mp3')) {
    if (request.headers.has('range')) return; // let the browser stream partial content
    event.respondWith(caches.open(MEDIA).then(async cache => {
      const hit = await cache.match(request); if (hit) return hit;
      const response = await fetch(request);
      if (response.ok && response.status === 200) { cache.put(request, response.clone()); limit(MEDIA, 400); }
      return response;
    }));
    return;
  }

  // Google Fonts: stale-while-revalidate.
  if (url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com')) {
    event.respondWith(caches.open(RUNTIME).then(async cache => {
      const hit = await cache.match(request);
      const network = fetch(request).then(r => { if (r.ok || r.type === 'opaque') cache.put(request, r.clone()); return r; }).catch(() => hit);
      return hit || network;
    }));
    return;
  }

  if (url.origin !== location.origin) return;

  // Same-origin code and styles: stale-while-revalidate keeps it fast and fresh.
  if (/\.(js|css|webmanifest)$/.test(url.pathname)) {
    event.respondWith(caches.open(VERSION).then(async cache => {
      const hit = await cache.match(request);
      const network = fetch(request).then(r => { if (r.ok) cache.put(request, r.clone()); return r; }).catch(() => hit);
      return hit || network;
    }));
    return;
  }

  // Verse batches, photographs and other assets: cache first, fill on read.
  event.respondWith(caches.open(RUNTIME).then(async cache => {
    const hit = await cache.match(request); if (hit) return hit;
    const response = await fetch(request);
    if (response.ok) { cache.put(request, response.clone()); if (/\.(webp|jpg|png)$/.test(url.pathname)) limit(RUNTIME, 600); }
    return response;
  }));
});
