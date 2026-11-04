/* Service worker: όλη η εφαρμογή αποθηκεύεται τοπικά για πλήρη offline λειτουργία. */
const CACHE = 'polyglossos-v1';
const ASSETS = [
  './', './index.html', './manifest.webmanifest', './css/app.css',
  './js/data/vocab.js', './js/data/grammar.js', './js/data/placement.js', './js/data/greek.js',
  './js/core.js', './js/content.js', './js/exercises.js', './js/session.js', './js/tests.js',
  './js/speechlab.js', './js/screens.js', './js/app.js',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png'
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
/* Δίκτυο πρώτα (για ενημερώσεις), αλλιώς cache — η εφαρμογή ανοίγει πάντα, ακόμη και χωρίς σήμα. */
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then((res) => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('./index.html')))
  );
});
