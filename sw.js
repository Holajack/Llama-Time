// Service Worker for Llama Time PWA

// Increment cache version when core assets (index.html, icons, etc.) change
const CACHE_NAME = 'llama-time-cache-v5.3.1'; // <<<<<<< UPDATED CACHE VERSION
const urlsToCache = [
  '/', // Cache the root path
  '/index.html', // Cache index explicitly (adjust path if not in root)
  'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap',
  'https://fonts.gstatic.com/s/pressstart2p/v15/e3t4euO8T-267oIAQAu6jDQyK3nVivM.woff2',
  '/icons/llama-icon-192.png', // Ensure these paths are correct for your repo
  '/icons/llama-icon-512.png'
];

// Install event: Cache core assets
self.addEventListener('install', event => {
  console.log('[SW] Install event - Caching core assets for cache:', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Opened cache:', CACHE_NAME);
        // Use addAll for atomic caching - if one fails, none are cached
        return cache.addAll(urlsToCache).catch(error => {
             console.error('[SW] Failed to cache initial resources:', error);
        });
      })
      .then(() => {
          console.log('[SW] Core assets cached successfully. Skipping waiting.');
          // Force the waiting service worker to become the active service worker.
          return self.skipWaiting();
      })
  );
});

// Activate event: Clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activate event - Cleaning old caches');
  const cacheWhitelist = [CACHE_NAME]; // Only keep the current cache
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
        console.log('[SW] Claiming clients');
        // Ensure new SW takes control of pages immediately
        return self.clients.claim();
    })
  );
});

// Fetch event: Cache-first strategy
self.addEventListener('fetch', event => {
  // console.log('[SW] Fetching:', event.request.url);
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          // console.log('[SW] Serving from cache:', event.request.url);
          return response;
        }

        // Not in cache - fetch from network
        // console.log('[SW] Fetching from network:', event.request.url);
        return fetch(event.request).then(
          networkResponse => {
            // Check if we received a valid response to cache
            if(!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse; // Don't cache errors or opaque responses
            }

            // IMPORTANT: Clone the response.
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                // console.log('[SW] Caching new resource:', event.request.url);
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          }
        ).catch(error => {
             console.log('[SW] Fetch failed:', error);
             // Optional: return an offline fallback page if needed
             // return caches.match('/offline.html');
        });
      })
  );
});

// --- Push Notification Listener ---
self.addEventListener('push', event => {
  console.log('[SW] Push Received.');
  console.log(`[SW] Push had this data: "${event.data ? event.data.text() : 'no payload'}"`);
  let title = 'Llama Time!';
  let options = {
    body: 'New message received.',
    icon: 'icons/llama-icon-192.png', // Use correct icon path
    badge: 'icons/llama-icon-192.png' // Use correct icon path
  };
  if (event.data) { try { const data = event.data.json(); title = data.title || title; options.body = data.body || options.body; options.icon = data.icon || options.icon; } catch (e) { options.body = event.data.text(); } }
  event.waitUntil( self.registration.showNotification(title, options) );
});

// Optional: Handle notification clicks
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification click Received.');
  event.notification.close();
  event.waitUntil( clients.openWindow('/') );
});
