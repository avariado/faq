const CACHE_NAME = 'cache-v1';
const urlsToCache = [
  '/faq/',
  '/faq/index.html',
  '/faq/icon-192x192.png',
  '/faq/icon-512x512.png',
  '/faq/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
