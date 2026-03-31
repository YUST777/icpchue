// ICPC HUE Service Worker - PWA Support
// Bump this version to force all clients to update immediately
const CACHE_NAME = 'icpchue-v8';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icpchue-logo.webp',
  '/images/ui/navlogo.webp',
];

// Install: cache static assets + start URL
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
});

// Activate: delete old caches and take control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Network-first for pages, cache-first for assets
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;
  if (event.request.url.includes('/api/')) return;

  const isNavigation = event.request.mode === 'navigate';

  if (isNavigation) {
    // NETWORK-FIRST for navigation requests
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          // Only cache successful responses
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return res;
        })
        .catch(() => {
          // Offline: try cached version of this page, then fall back to cached /
          return caches.match(event.request)
            .then(cached => cached || caches.match('/'))
            .then(fallback => fallback || new Response(
              '<html><body style="background:#0B0B0C;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif"><div style="text-align:center"><h2>You are offline</h2><p style="color:#888">Please check your internet connection</p></div></body></html>',
              { headers: { 'Content-Type': 'text/html' } }
            ));
        })
    );
  } else {
    // CACHE-FIRST for static assets
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return res;
        });
      }).catch(() => new Response('', { status: 408 }))
    );
  }
});
