const CACHE_NAME = 'cache-v1';
const urlsToCache = ['/', '/index.html', '/styles.css', '/script.js']; // ATUALIZA COM OS TEUS ARQUIVOS

// Instala o Service Worker e cacheia tudo
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

// Responde com o cache se tiver, senão busca na internet
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request)
    )
  );
});
