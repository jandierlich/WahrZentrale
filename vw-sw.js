const SHELL_CACHE = 'vorratswahr-v24';
const LIBS_CACHE = 'vorratswahr-libs-v5';

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(SHELL_CACHE).then(c => c.addAll([
    './vw-index.html','./vw-style.css','./vw-app.js','./vw-manifest.json',
    './vw-icon-180.png','./vw-icon-192.png','./vw-icon-512.png','./vw-icon-512-dark.png',
    './vw-impressum.html','./vw-datenschutz.html'
  ])));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== SHELL_CACHE && k !== LIBS_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  var url = e.request.url;
  // Tesseract.js wird von jsDelivr geladen. Einmal erfolgreich geladen,
  // dauerhaft im eigenen Cache ablegen, damit es danach auch ohne
  // Internetverbindung funktioniert.
  if (url.indexOf('cdn.jsdelivr.net') !== -1) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(response => {
          var copy = response.clone();
          caches.open(LIBS_CACHE).then(cache => cache.put(e.request, copy)).catch(() => {});
          return response;
        });
      })
    );
    return;
  }
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
