const SHELL_CACHE = 'produktwahr-v34';
const LIBS_CACHE = 'produktwahr-libs-v21';

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(SHELL_CACHE).then(c => c.addAll([
    './pw-index.html','./pw-style.css','./additive-engine.js','./inci-database.js',
    './pw-check-engine.js','./pw-app.js','./pw-manifest.json',
    './pw-icon-180.png','./pw-icon-192.png','./pw-icon-512.png','./pw-icon-512-dark.png',
    './pw-impressum.html','./pw-datenschutz.html'
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
  // Externe Bibliotheken (Tesseract.js, ZXing) werden von jsDelivr geladen.
  // Einmal erfolgreich geladen, dauerhaft im eigenen Cache ablegen, damit sie
  // danach auch ohne Internetverbindung funktionieren.
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
  // Barcode-Produktabfragen (Open Food Facts / Open Beauty Facts / Open Products Facts)
  // müssen immer live abgefragt werden dürfen und werden bewusst NICHT gecacht.
  if (url.indexOf('openfoodfacts.org') !== -1 || url.indexOf('openbeautyfacts.org') !== -1 || url.indexOf('openproductsfacts.org') !== -1) {
    e.respondWith(fetch(e.request));
    return;
  }
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
