const CACHE_NAME = 'cache-v2';
const urlsToCache = [
  '/faq/',
  '/faq/index.html',
  '/faq/icon-192x192.png',
  '/faq/icon-512x512.png',
  '/faq/manifest.json',
  '/faq/.well-known/assetlinks.json'
];

// Instalação e cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

// Estratégia de fetch combinada
self.addEventListener('fetch', (event) => {
  // 1. Para navegação (HTML)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Aplica headers de segurança
          const newHeaders = new Headers(response.headers);
          newHeaders.set('X-Frame-Options', 'SAMEORIGIN');
          newHeaders.set('X-Content-Type-Options', 'nosniff');
          newHeaders.set('Permissions-Policy', 'interest-cohort=()');
          
          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders
          });
        })
        .catch(() => caches.match('/faq/index.html')) // Fallback para offline
  }
  
  // 2. Para URLs dentro de /faq/
  else if (event.request.url.includes('/faq/')) {
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          // Retorna do cache se existir
          if (cachedResponse) return cachedResponse;
          
          // Senão, busca na rede com headers
          return fetch(event.request).then(response => {
            const newHeaders = new Headers(response.headers);
            newHeaders.set('X-Frame-Options', 'SAMEORIGIN');
            return new Response(response.body, { headers: newHeaders });
          });
        })
    );
  }
  
  // 3. Para outros recursos (CSS, JS, etc)
  else {
    event.respondWith(
      caches.match(event.request)
        .then(response => response || fetch(event.request))
    );
  }
});
