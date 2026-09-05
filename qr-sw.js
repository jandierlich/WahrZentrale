self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open('qrwahr-v9').then(c => c.addAll(['./qr-index.html','./qr-manifest.json','./qr-icon-180.png','./qr-icon-192.png','./qr-icon-512.png','./qr-impressum.html','./qr-datenschutz.html'])));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== 'qrwahr-v9').map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
