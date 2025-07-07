const CACHE_NAME = 'cache-v1';
const urlsToCache = [
  '/faq/',
  '/faq/index.html',         
  '/faq/icon-192x192.png',
  '/faq/icon-512x512.png',
  '/faq/manifest.json'
];

// Instala o Service Worker e cacheia os recursos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

// Responde com o cache se tiver, senão busca na internet e adiciona headers de segurança
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Se encontrou no cache, retorna
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // Senão, faz a requisição e processa os headers
      return fetch(event.request).then(response => {
        // Aplica headers de segurança apenas para HTML
        if (response.headers.get('content-type')?.includes('text/html')) {
          const newHeaders = new Headers(response.headers);
          newHeaders.set('X-Frame-Options', 'SAMEORIGIN');
          newHeaders.set('X-Content-Type-Options', 'nosniff');
          
          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders
          });
        }
        return response;
      });
    })
  );
});
