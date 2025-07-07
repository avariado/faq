const CACHE_NAME = 'cache-v2';
const urlsToCache = [
  '/faq/',
  '/faq/index.html',
  '/faq/icon-192x192.png',
  '/faq/icon-512x512.png',
  '/faq/manifest.json',
  '/faq/.well-known/assetlinks.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const newHeaders = new Headers(response.headers);
          newHeaders.set('X-Frame-Options', 'DENY');
          newHeaders.set('X-Content-Type-Options', 'nosniff');
          newHeaders.set('Permissions-Policy', 'interest-cohort=()');
          
          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders
          });
        })
        .catch(() => caches.match('/faq/index.html'))
    );
  } else {
    event.respondWith(
      caches.match(event.request)
        .then(response => response || fetch(event.request))
    );
  }
});
