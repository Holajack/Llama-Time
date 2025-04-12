// Service Worker for Llama Time PWA

const CACHE_NAME = 'llama-time-cache-v1'; // Increment version if you change assets
const urlsToCache = [
  '/', // Cache the root path
  '/index.html', // Cache index explicitly
  // Add other core assets if separated (e.g., 'style.css', 'script.js')
  'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap', // Cache font CSS
  'https://fonts.gstatic.com/s/pressstart2p/v15/e3t4euO8T-267oIAQAu6jDQyK3nVivM.woff2', // Cache font file (check network tab for exact URL if needed)
  '/icons/icon-192x192.png', // Use absolute paths from root if hosted in root
  '/icons/icon-512x512.png'
];

// Install event: Cache core assets
self.addEventListener('install', event => {
  console.log('[SW] Install event');
  // Perform install steps
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Opened cache:', CACHE_NAME);
        // Use addAll for atomic caching - if one fails, none are cached
        return cache.addAll(urlsToCache).catch(error => {
             console.error('[SW] Failed to cache initial resources:', error);
             // Optional: Handle specific caching errors if needed
        });
      })
      .then(() => {
          console.log('[SW] Core assets cached successfully.');
          // Force the waiting service worker to become the active service worker.
          return self.skipWaiting();
      })
  );
});

// Fetch event: Serve cached assets if available, otherwise fetch from network
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
            // Check if we received a valid response
            // Don't cache opaque responses (like from CDNs without CORS) unless necessary
            // Don't cache errors (status not 200)
            if(!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // IMPORTANT: Clone the response. A response is a stream
            // and because we want the browser to consume the response
            // as well as the cache consuming the response, we need
            // to clone it so we have two streams.
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                // console.log('[SW] Caching new resource:', event.request.url);
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          }
        ).catch(error => {
             console.log('[SW] Fetch failed; returning offline fallback maybe?', error);
             // Optional: return a custom offline fallback page
             // return caches.match('/offline.html');
             // Or just let the browser handle the error for now
        });
      })
  );
});

// Activate event: Clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activate event');
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
        // Force the activated service worker to take control immediately
        return self.clients.claim();
    })
  );
});
