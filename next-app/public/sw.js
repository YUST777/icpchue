// ICPC HUE Service Worker - PWA Support
// Bump this version to force all clients to update immediately
const CACHE_NAME = 'icpchue-v7';
const STATIC_ASSETS = [
  '/icpchue-logo.webp',
  '/images/ui/navlogo.webp',
  '/manifest.json',
];

// Install: cache only static assets, not pages
self.addEventListener('install', (event) => {
  // Skip waiting forces the new SW to take over immediately
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
});

// Activate: delete ALL old caches and take control immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      // Take control of all clients immediately without requiring a reload
      return self.clients.claim();
    })
  );
});

// Fetch: Network-first for HTML pages, cache-first for static assets
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) return;

  // Skip API requests — always go to network
  if (event.request.url.includes('/api/')) return;

  const isHTMLRequest = event.request.headers.get('accept')?.includes('text/html');

  if (isHTMLRequest) {
    // NETWORK-FIRST for HTML: always get fresh pages from server
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          // Cache the fresh response
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return res;
        })
        .catch(() => {
          // Offline fallback only
          return caches.match(event.request) || caches.match('/');
        })
    );
  } else {
    // CACHE-FIRST for static assets (images, fonts, etc.)
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return res;
        });
      }).catch(() => caches.match('/'))
    );
  }
});
