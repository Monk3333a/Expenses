// Service Worker - Updated Layout Version
const CACHE_NAME = 'family-expense-tracker-v4';
const urlsToCache = [
  './',
  './index.html', 
  './style.css',
  './app-firebase-v3.js',
  './firebase-config.js',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  console.log('[SW] Installing updated layout version');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating updated layout version');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Skip Firebase calls
  if (event.request.url.includes('firebase') || 
      event.request.url.includes('googleapis.com') ||
      event.request.url.includes('gstatic.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }

        return fetch(event.request).catch(() => {
          return caches.match('./index.html');
        });
      })
  );
});