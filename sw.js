// Family Expense Tracker v3.0 Service Worker
// Enhanced offline functionality

const CACHE_NAME = 'family-expense-tracker-v3';
const STATIC_CACHE_NAME = 'static-v3';

// Files to cache for offline use
const STATIC_FILES = [
    '/',
    '/index.html',
    '/style.css',
    '/app-firebase-v3.js',
    '/firebase-config.js',
    '/manifest.json',
    // Firebase SDK files (cached from CDN)
    'https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js',
    'https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js',
    'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker v3.0');

    event.waitUntil(
        caches.open(STATIC_CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching static files');
                return cache.addAll(STATIC_FILES.map(url => new Request(url, {
                    cache: 'reload'
                })));
            })
            .then(() => {
                console.log('[SW] Static files cached successfully');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[SW] Failed to cache static files:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker v3.0');

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== STATIC_CACHE_NAME && cacheName !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('[SW] Service worker activated');
            return self.clients.claim();
        })
    );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip Firebase API calls - let Firebase handle offline sync
    if (url.hostname.includes('firestore.googleapis.com') || 
        url.hostname.includes('firebase.googleapis.com') ||
        url.hostname.includes('identitytoolkit.googleapis.com')) {
        return;
    }

    // Handle static assets with cache-first strategy
    if (STATIC_FILES.some(file => request.url.includes(file.replace(/^\//, '')))) {
        event.respondWith(
            caches.match(request).then((cachedResponse) => {
                if (cachedResponse) {
                    console.log('[SW] Serving from cache:', request.url);
                    return cachedResponse;
                }

                return fetch(request).then((response) => {
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }

                    const responseToCache = response.clone();
                    caches.open(STATIC_CACHE_NAME).then((cache) => {
                        cache.put(request, responseToCache);
                    });

                    return response;
                }).catch(() => {
                    if (request.destination === 'document') {
                        return caches.match('/index.html');
                    }
                });
            })
        );
        return;
    }

    // For all other requests, try network first, fallback to cache
    event.respondWith(
        fetch(request).catch(() => {
            return caches.match(request).then((response) => {
                if (response) {
                    return response;
                }

                if (request.destination === 'document') {
                    return caches.match('/index.html');
                }

                return new Response('Offline - Content not available', {
                    status: 503,
                    statusText: 'Service Unavailable',
                    headers: { 'Content-Type': 'text/plain' }
                });
            });
        })
    );
});

console.log('[SW] Service worker v3.0 script loaded with enhanced functionality');