self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open('wahrzentrale-v63').then(c => c.addAll(['./index.html','./manifest.json','./icon-180.png','./icon-192.png','./icon-512.png','./logo-white.png','./pw-logo-hub.png','./vw-logo-hub.png','./lw-logo-hub.png','./qr-logo-hub.png','./ow-logo-hub.png','./kw-logo-hub.png','./impressum.html','./datenschutz.html','./hinweise.html','./hinweise-icon-hub.png','./kw-index.html','./kw-style.css','./kw-app.js','./kw-manifest.json','./kw-icon-180.png','./kw-icon-192.png','./kw-icon-512.png','./kw-icon-512-dark.png','./kw-icon-192-maskable.png','./kw-icon-512-maskable.png','./kw-impressum.html','./kw-datenschutz.html'])));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== 'wahrzentrale-v63').map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
