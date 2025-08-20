// Service Worker for INR Family Expense Tracker
const CACHE_NAME = 'expense-tracker-inr-v1';
const STATIC_FILES = [
    '/',
    '/index.html',
    '/style.css',
    '/app-firebase-v3.js',
    '/firebase-config.js',
    '/manifest.json'
];

self.addEventListener('install', (event) => {
    console.log('Installing INR service worker');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(STATIC_FILES))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    console.log('Activating INR service worker');
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
    // Skip Firebase API calls
    const url = new URL(event.request.url);
    if (url.hostname.includes('firebase') || url.hostname.includes('googleapis.com')) {
        return;
    }

    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(event.request).catch(() => {
                if (event.request.destination === 'document') {
                    return caches.match('/index.html');
                }
            });
        })
    );
});

console.log('INR Service Worker loaded');