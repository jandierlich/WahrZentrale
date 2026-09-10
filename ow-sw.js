const SHELL_CACHE = 'ortewahr-v4';
const LIBS_CACHE = 'ortewahr-libs-v1';

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(SHELL_CACHE).then(c => c.addAll([
    './ow-index.html','./ow-anleitung.html','./ow-manifest.json',
    './ow-icon-180.png','./ow-icon-192.png','./ow-icon-512.png','./ow-icon-512-dark.png',
    './ow-impressum.html','./ow-datenschutz.html'
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
  // Leaflet (Karten-Bibliothek) wird von unpkg geladen. Einmal geladen, dauerhaft
  // im eigenen Cache ablegen, damit es danach auch offline funktioniert.
  if (url.indexOf('unpkg.com') !== -1) {
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
  // Live-Dienste (Overpass, Nominatim, Open-Meteo, Kartenkacheln) laufen bewusst
  // NICHT über den Cache, damit dort immer frische Daten kommen bzw. offline
  // korrekt ein Fehler auftritt statt veralteter Ergebnisse.
  var NO_CACHE_HOSTS = ['overpass-api.de', 'overpass.kumi.systems', 'overpass.osm.ch', 'overpass.private.coffee', 'nominatim.openstreetmap.org', 'api.open-meteo.com', 'tile.openstreetmap.org'];
  if (NO_CACHE_HOSTS.some(h => url.indexOf(h) !== -1)) {
    e.respondWith(fetch(e.request));
    return;
  }
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
