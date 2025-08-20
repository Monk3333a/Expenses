const CACHE_NAME = 'expense-tracker-custom-v1';
const STATIC_FILES = [
    '/',
    '/index.html',
    '/style.css',
    '/app-firebase-v3.js',
    '/firebase-config.js',
    '/manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_FILES))
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.url.includes('firebase') || event.request.url.includes('googleapis')) return;

    event.respondWith(
        caches.match(event.request).then(response => 
            response || fetch(event.request).catch(() => caches.match('/index.html'))
        )
    );
});