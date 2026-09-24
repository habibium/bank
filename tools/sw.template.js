// Template for sw.js. Edit this file, then run `node tools/gen-sw.mjs`.
const VERSION = "__PRECACHE_VERSION__";
const PRECACHE = __PRECACHE_ENTRIES__;

const PRECACHE_CACHE = `bank-precache-${VERSION}`;
const RUNTIME_CACHE = "bank-runtime";
const APP_SHELL = "/index.html";
const SW_PATH = new URL("sw.js", self.registration.scope).pathname;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PRECACHE_CACHE);
      // `reload` bypasses the HTTP cache: Pages sends max-age=600 and Cloudflare caches everything.
      const requests = Object.keys(PRECACHE).map(
        (url) => new Request(url, { cache: "reload" }),
      );
      await cache.addAll(requests);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([PRECACHE_CACHE, RUNTIME_CACHE]);
      const names = await caches.keys();
      await Promise.all(
        names.filter((name) => !keep.has(name)).map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Serving the worker from a cache we control would strand clients on an old version.
  if (url.pathname === SW_PATH) return;

  event.respondWith(respond(request, url));
});

async function respond(request, url) {
  const key = precacheKey(url);
  if (key) {
    const hit = await caches.match(key, { cacheName: PRECACHE_CACHE });
    if (hit) return hit;
  }

  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") {
      const cache = await caches.open(RUNTIME_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const stale = await caches.match(request, { cacheName: RUNTIME_CACHE });
    if (stale) return stale;
    if (request.mode === "navigate") {
      const shell = await caches.match(APP_SHELL, { cacheName: PRECACHE_CACHE });
      if (shell) return shell;
    }
    throw error;
  }
}

function precacheKey(url) {
  if (PRECACHE[url.pathname]) return url.pathname;
  const index = `${url.pathname.replace(/\/*$/, "")}/index.html`;
  return PRECACHE[index] ? index : null;
}
