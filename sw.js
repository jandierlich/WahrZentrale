/* Gemeinsamer Service Worker für die gesamte WahrZentrale (Hub + alle Apps).
   Alle Apps liegen technisch im selben Ordner und damit im selben
   Geltungsbereich ("/") – ein gemeinsamer Service Worker verhindert, dass
   sich mehrere pro-App-Service-Worker gegenseitig ablösen und dabei
   jeweils den Offline-Cache der anderen Apps löschen. */

const SHELL_CACHE = 'wahrzentrale-v73';
const LIBS_CACHE = 'wahrzentrale-libs-v1';

const SHELL_ASSETS = [
  // WahrZentrale-Hub
  './index.html', './manifest.json', './favicon.ico', './icon-180.png', './icon-192.png', './icon-512.png',
  './logo-white.png', './impressum.html', './datenschutz.html', './hinweise.html',
  './hinweise-icon-hub.png', './wz-ui.js', './wz-shared.js',
  './kw-logo-hub.png', './vw-logo-hub.png', './aw-logo-hub.png',
  './pw-logo-hub.png', './qr-logo-hub.png', './lw-logo-hub.png',

  // KompassWahr
  './kw-index.html', './kw-style.css', './kw-app.js', './kw-manifest.json',
  './kw-icon-180.png', './kw-icon-192.png', './kw-icon-512.png', './kw-icon-512-dark.png',
  './kw-impressum.html', './kw-datenschutz.html',

  // VorratsWahr
  './vw-index.html', './vw-style.css', './vw-app.js', './vw-manifest.json',
  './vw-icon-180.png', './vw-icon-192.png', './vw-icon-512.png', './vw-icon-512-dark.png',
  './vw-impressum.html', './vw-datenschutz.html',

  // AlltagWahr
  './aw-index.html', './aw-style.css', './aw-app.js', './aw-manifest.json',
  './aw-icon-192.png', './aw-icon-512.png', './aw-icon-512-dark.png',
  './aw-apple-touch-icon.png', './aw-maskable-icon-512.png',
  './aw-impressum.html', './aw-datenschutz.html',

  // ProduktWahr
  './pw-index.html', './pw-style.css', './pw-app.js', './pw-manifest.json',
  './additive-engine.js', './inci-database.js', './pw-check-engine.js',
  './pw-icon-180.png', './pw-icon-192.png', './pw-icon-512.png', './pw-icon-512-dark.png',
  './pw-impressum.html', './pw-datenschutz.html',

  // QRWahr
  './qr-index.html', './qr-manifest.json',
  './qr-icon-180.png', './qr-icon-192.png', './qr-icon-512.png',
  './qr-impressum.html', './qr-datenschutz.html',

  // LautstärkeWahr
  './lw-index.html', './lw-manifest.json',
  './lw-icon-180.png', './lw-icon-192.png', './lw-icon-512.png',
  './lw-impressum.html', './lw-datenschutz.html',
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(SHELL_CACHE).then(c => c.addAll(SHELL_ASSETS)));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== SHELL_CACHE && k !== LIBS_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Live-Produktabfragen (Open Food/Beauty/Products Facts, ProduktWahr) müssen
  // immer aktuell abgefragt werden dürfen und werden bewusst nicht gecacht.
  if (url.indexOf('openfoodfacts.org') !== -1 || url.indexOf('openbeautyfacts.org') !== -1 || url.indexOf('openproductsfacts.org') !== -1) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Extern nachgeladene Bibliotheken (Tesseract.js, ZXing, jsPDF – via jsDelivr):
  // einmal geladen dauerhaft im eigenen Cache ablegen, damit sie danach auch
  // ohne Internetverbindung funktionieren.
  if (url.indexOf('cdn.jsdelivr.net') !== -1) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(response => {
          const copy = response.clone();
          caches.open(LIBS_CACHE).then(cache => cache.put(e.request, copy)).catch(() => {});
          return response;
        });
      })
    );
    return;
  }

  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
