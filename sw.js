const VERSION = 'v1';
const CACHE = `lek-testlab-${VERSION}`;

const CORE = ['.', './index.html', './style.css', './app.js', './manifest.webmanifest', './favicon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(CORE);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isResults = url.pathname.endsWith('/reports/results.json') || url.pathname.endsWith('/reports/results.json/');

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);

      if (isResults) {
        try {
          const fresh = await fetch(req);
          cache.put(req, fresh.clone());
          return fresh;
        } catch {
          const cached = await cache.match(req);
          if (cached) return cached;
        }
      }

      const cached = await cache.match(req);
      if (cached) return cached;

      try {
        const fresh = await fetch(req);
        if (fresh.ok) cache.put(req, fresh.clone());
        return fresh;
      } catch {
        if (req.mode === 'navigate') {
          const fallback = await cache.match('./index.html');
          if (fallback) return fallback;
        }
        throw new Error('Offline');
      }
    })()
  );
});

