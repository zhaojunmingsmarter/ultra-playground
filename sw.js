// Build replaces these markers with a content hash and the complete publish list.
const VERSION = '__BUILD_VERSION__';
const FILES = __PRECACHE_FILES__;
const PREFIX = `ultra-playground:${new URL(self.registration.scope).pathname}:`;
const CACHE = PREFIX + VERSION;
const urls = FILES.map(file => new URL(file, self.registration.scope).href);
const indexURL = new URL('index.html', self.registration.scope).href;

self.addEventListener('install', event => {
  // Atomic install: no offline-ready claim if even one required resource fails.
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(urls)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    const previous = keys.filter(key => key.startsWith(PREFIX) && key !== CACHE);
    await Promise.all(previous.map(key => caches.delete(key)));
    await self.clients.claim();
    // Refresh old documents too: their scripts do not listen for controllerchange.
    if (previous.length) {
      const windows = await self.clients.matchAll({ type:'window', includeUncontrolled:true });
      // Navigation fetches need activation to finish: never await navigation here.
      void Promise.allSettled(windows.filter(client => client.url.startsWith(self.registration.scope)).map(client => client.navigate(client.url)));
    }
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const root = new URL(self.registration.scope);
  if (url.origin !== root.origin || !url.pathname.startsWith(root.pathname)) return;
  const isHome = request.mode === 'navigate' && (url.pathname === root.pathname || url.pathname === new URL(indexURL).pathname);
  const key = isHome ? indexURL : url.origin + url.pathname;
  if (!urls.includes(key)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const saved = await cache.match(key);
    return saved || fetch(request);
  })());
});
