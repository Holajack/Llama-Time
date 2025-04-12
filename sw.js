// Service Worker for Llama Time PWA

// Increment cache version when core assets change
const CACHE_NAME = 'llama-time-cache-v2';
const urlsToCache = [
  '/', // Cache the root path
  '/index.html', // Cache index explicitly (adjust path if not in root)
  // Add other core assets if separated (e.g., 'style.css', 'script.js')
  'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap', // Cache font CSS
  'https://fonts.gstatic.com/s/pressstart2p/v15/e3t4euO8T-267oIAQAu6jDQyK3nVivM.woff2', // Cache font file
  '/icons/icon-192x192.png', // Use absolute paths from root
  '/icons/icon-512x512.png'
];

// Install event: Cache core assets
self.addEventListener('install', event => {
  console.log('[SW] Install event - Caching core assets');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Opened cache:', CACHE_NAME);
        return cache.addAll(urlsToCache).catch(error => {
             console.error('[SW] Failed to cache initial resources:', error);
        });
      })
      .then(() => {
          console.log('[SW] Core assets cached successfully. Skipping waiting.');
          // Force the waiting service worker to become the active service worker.
          // This ensures updates are applied sooner after a new SW is installed.
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

            // Clone the response to cache it and return it to the browser
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
// This handles receiving push messages from a server.
// NOTE: Sending push messages requires server-side logic and user permission handling in the main app JS.
self.addEventListener('push', event => {
  console.log('[SW] Push Received.');
  console.log(`[SW] Push had this data: "${event.data ? event.data.text() : 'no payload'}"`);

  // Default notification options
  let title = 'Llama Time!';
  let options = {
    body: 'New message received.',
    icon: 'icons/icon-192x192.png', // Icon for notification
    badge: 'icons/icon-192x192.png' // Small monochrome icon (optional)
  };

  // Try to parse payload data if it exists
  if (event.data) {
    try {
      const data = event.data.json(); // Assumes payload is JSON
      title = data.title || title;
      options.body = data.body || options.body;
      options.icon = data.icon || options.icon;
      // You can add more options here: vibration, actions, etc.
      // options.vibrate = [100, 50, 100];
      // options.data = { url: data.url }; // Store data to handle clicks
    } catch (e) {
      console.log('[SW] Push event data was not JSON, using text().');
      options.body = event.data.text();
    }
  }

  // Show the notification
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Optional: Handle notification clicks
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification click Received.');

  event.notification.close(); // Close the notification

  // Example: Open the app or a specific URL
  // You might store a URL in the notification's data property
  // const urlToOpen = event.notification.data ? event.notification.data.url : '/';
  event.waitUntil(
    clients.openWindow('/') // Opens the main page of the app
  );
});
