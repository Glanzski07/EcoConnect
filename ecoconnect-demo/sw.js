/* EcoConnect demo service worker — caches the app shell for offline use. */
const CACHE = 'ecoconnect-v9';
const FILES = [
  './',
  './index.html',
  './styles.css',
  './mockData.js',
  './app.js',
  './manifest.json',
  './icon.svg',
  './vendor/tailwind.js',
  './vendor/chart.umd.min.js',
  './vendor/lucide.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copy)).catch(() => {});
        return response;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
