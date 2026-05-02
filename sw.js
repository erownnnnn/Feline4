const CACHE_NAME = "catbreedid-v1";
const STATIC_CACHE = "catbreedid-static-v1";
const MODEL_CACHE  = "catbreedid-model-v1";

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './cat2.gif',
  './splash.gif',
  './icon.png',
];

const MODEL_FILES = [
  './metadata.json',
  './model.json',
  './weights.bin',
];

const CDN_ASSETS = [
  'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@1.3.1/dist/tf.min.js',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap',
];

// ---- INSTALL ----
self.addEventListener('install', event => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then(cache =>
        cache.addAll(APP_SHELL).catch(err =>
          console.warn('[SW] App shell cache failed:', err)
        )
      ),
      caches.open(MODEL_CACHE).then(cache =>
        cache.addAll(MODEL_FILES).catch(err =>
          console.warn('[SW] Model cache failed:', err)
        )
      ),
      caches.open(STATIC_CACHE).then(cache =>
        Promise.allSettled(
          CDN_ASSETS.map(url =>
            fetch(url, { mode: 'cors' })
              .then(res => { if (res.ok) cache.put(url, res); })
              .catch(() => {})
          )
        )
      ),
    ]).then(() => self.skipWaiting())
  );
});

// ---- ACTIVATE ----
self.addEventListener('activate', event => {
  const VALID_CACHES = [STATIC_CACHE, MODEL_CACHE];
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(k => !VALID_CACHES.includes(k))
            .map(k => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ---- FETCH ----
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // Model files — cache only
  if (
    url.pathname.endsWith('model.json') ||
    url.pathname.endsWith('weights.bin') ||
    url.pathname.endsWith('metadata.json')
  ) {
    event.respondWith(cacheOnly(request, MODEL_CACHE));
    return;
  }

  // App shell — stale while revalidate
  if (
    url.pathname.endsWith('.html') ||
    url