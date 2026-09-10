self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open('lautstaerkewahr-v26').then(c => c.addAll(['./lw-index.html','./lw-manifest.json','./lw-icon-180.png','./lw-icon-192.png','./lw-icon-512.png','./lw-logo-light.png','./lw-logo-dark.png','./lw-impressum.html','./lw-datenschutz.html'])));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== 'lautstaerkewahr-v26').map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
