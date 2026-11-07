export default function registerServiceWorker() {
  // Only register service worker in production
  if (!import.meta.env.PROD) {
    return;
  }

  const serviceWorkerUrl = `${import.meta.env.BASE_URL}sw.js`;

  // Check if the serviceWorker Object exists in the navigator object
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register(serviceWorkerUrl)
      .then(registration => {
        console.log('Service Worker registered successfully:', registration);

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // A new version is available, but keep the current page stable.
                console.log('New service worker available. Refresh when convenient to load the latest version.');
                window.dispatchEvent(new CustomEvent('meetcutes:update-available'));
              }
            });
          }
        });
      })
      .catch(error => {
        console.error('Service worker registration failed:', error);
      });
  }
}

export async function clearAppCaches() {
  const clearWindowCaches = async () => {
    if (typeof caches === 'undefined') {
      return;
    }

    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
  };

  if (!('serviceWorker' in navigator)) {
    await clearWindowCaches();
    return;
  }

  const registration = await navigator.serviceWorker.ready;

  if (!registration.active) {
    await clearWindowCaches();
    return;
  }

  await new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const timeoutId = window.setTimeout(() => {
      reject(new Error('Timed out while clearing cache'));
    }, 4000);

    channel.port1.onmessage = event => {
      window.clearTimeout(timeoutId);

      if (event.data?.type === 'CACHE_CLEARED') {
        resolve();
        return;
      }

      reject(new Error(event.data?.error || 'Failed to clear cache'));
    };

    registration.active.postMessage({ type: 'CLEAR_CACHE' }, [channel.port2]);
  });

  await clearWindowCaches();
}

// Utility function to unregister service worker (can be called from browser console)
export function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(registration => {
        registration.unregister().then(() => {
          console.log('Service Worker unregistered successfully');
        });
      });
    });
  }
}