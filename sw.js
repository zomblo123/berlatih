// ═══════════════════════════════════════════════════
// BerLatih — Service Worker v1.3 (Fixed)
// ═══════════════════════════════════════════════════

const CACHE_NAME = 'berlatih-v1.3';

// Wajib ada
const PRE_CACHE = [
  './',
  './index.html',
  './manifest.json',
];

// Opsional — tidak crash kalau belum ada
const OPTIONAL_CACHE = [
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  './icons/icon-144x144.png',
];

const NETWORK_ONLY_PATTERNS = [
  'firebasedatabase.app',
  'googleapis.com',
  'firebaseio.com',
  'gstatic.com/firebasejs',
  'api.anthropic.com',
];

// ── Install ──────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Cache wajib
      await cache.addAll(PRE_CACHE);
      // Cache opsional — skip kalau file belum ada
      for (const url of OPTIONAL_CACHE) {
        try { await cache.add(url); }
        catch (e) { console.warn('[SW] Skip optional:', url); }
      }
    }).then(() => self.skipWaiting())
  );
});

// ── Activate ─────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  if (event.request.method !== 'GET') return;

  if (NETWORK_ONLY_PATTERNS.some((p) => url.includes(p))) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((res) => {
          if (res && res.status === 200)
            caches.open(CACHE_NAME).then((c) => c.put(event.request, res.clone()));
          return res;
        }).catch(() => new Response('', { status: 503 }));
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request).then((res) => {
        if (res && res.status === 200)
          caches.open(CACHE_NAME).then((c) => c.put(event.request, res.clone()));
        return res;
      }).catch(() => null);

      return cached || networkFetch.then((res) => {
        if (res) return res;
        if (event.request.destination === 'document')
          return caches.match('./index.html');
        return new Response('', { status: 503 });
      });
    })
  );
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch { data = { title: 'BerLatih', body: event.data.text() }; }
  event.waitUntil(
    self.registration.showNotification(data.title || 'BerLatih ✦', {
      body: data.body || 'Waktunya menyelesaikan misimu!',
      icon: './icons/icon-192x192.png',
      badge: './icons/icon-72x72.png',
      vibrate: [200, 100, 200],
    })
  );
});