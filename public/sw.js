// Service Worker for MeetCutes
// Simplified version to avoid potential issues

const STATIC_CACHE = 'meetcutes-static-v4';

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('Service Worker installing.');
  self.skipWaiting();

  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      return cache.addAll([
        // Don't cache index.html - let it be served fresh to get latest asset references
        // '/index.html',
        // Add other critical static assets here if needed
      ]);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker activating.');
  self.clients.claim();

  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== STATIC_CACHE && cacheName !== 'google-fonts') {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - handle caching strategies
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and non-HTTP requests
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // Don't intercept navigation requests (HTML page loads) to ensure they are always fresh
  if (request.mode === 'navigate') {
    return;
  }

  // Don't intercept requests for JavaScript, CSS, index.html, and meta.json to avoid caching issues
  if (
    request.url.includes('.js') ||
    request.url.includes('.css') ||
    request.url.includes('/assets/') ||
    request.url.includes('meta.json') ||
    request.url.includes('index.html') ||
    request.headers.get('accept')?.includes('text/html')
  ) {
    return; // Let the browser handle these directly
  }

  // The Phoenix API is authenticated and user-specific. Never put those
  // responses in the shared Cache Storage: let the browser handle them so a
  // signed-out or different user can never receive a stale cached payload.
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Let uploaded media (R2/S3) bypass the service worker so the browser can
  // fetch the latest object directly.
  if (/\.(?:jpe?g|png|gif|webp|avif)$/i.test(url.pathname)) {
    return;
  }

  // Cache Google Fonts
  if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
    event.respondWith(
      caches.open('google-fonts').then(cache => {
        return cache.match(request).then(response => {
          if (response) {
            return response;
          }
          return fetch(request).then(response => {
            if (response.status === 200) {
              cache.put(request, response.clone());
            }
            return response;
          });
        });
      })
    );
    return;
  }

  // For other requests, try cache first, then network
  event.respondWith(
    caches.match(request).then(response => {
      if (response) {
        return response;
      }
      return fetch(request).then(response => {
        // Only cache static assets that are not JS/CSS
        if (request.method === 'GET' && response.status === 200 &&
            !request.url.includes('/assets/') &&
            !request.url.includes('.js') &&
            !request.url.includes('.css')) {
          const responseClone = response.clone();
          caches.open(STATIC_CACHE).then(cache => {
            cache.put(request, responseClone);
          });
        }
        return response;
      }).catch(() => {
        // Return cached version if available, otherwise offline page
        return caches.match('/index.html');
      });
    })
  );
});

// Message event - handle cache clearing
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('Clearing all caches via service worker');
    caches.keys().then(names => {
      return Promise.all(names.map(name => {
        console.log('Deleting cache:', name);
        return caches.delete(name);
      }));
    }).then(() => {
      console.log('All caches cleared');
      event.ports[0].postMessage({ type: 'CACHE_CLEARED' });
    }).catch(error => {
      console.error('Error clearing caches:', error);
      event.ports[0].postMessage({ type: 'CACHE_CLEAR_ERROR', error: error.message });
    });
  }
});
