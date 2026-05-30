const BUILD_ID = "4886765";
const CACHE_NAME = `plate-log-cache-${BUILD_ID}`;
// Do not precache index.html — navigations must fetch fresh HTML after Worker VERSION bumps.
const APP_SHELL = [
  `styles.css?v=${BUILD_ID}`,
  `app.js?v=${BUILD_ID}`,
  "manifest.json",
  "icons/icon-192.png",
  "icons/icon-512.png"
];
const OPTIONAL_ASSETS = [
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        await cache.addAll(APP_SHELL);
        await Promise.all(
          OPTIONAL_ASSETS.map(async (asset) => {
            try {
              const response = await fetch(asset);
              if (response?.ok) {
                await cache.put(asset, response);
              }
            } catch {
              // Optional remote assets should not block service worker activation.
            }
          })
        );
      })
      .then(() => self.skipWaiting())
  );
});

async function purgeCachedDocuments() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(async (cacheName) => {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      await Promise.all(
        requests
          .filter((request) => request.mode === "navigate" || request.url.includes("/index.html"))
          .map((request) => cache.delete(request))
      );
    })
  );
}

self.addEventListener("activate", (event) => {
  event.waitUntil(
    purgeCachedDocuments()
      .then(() => caches.keys())
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      ))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const isDocument = request.mode === "navigate";

  try {
    const response = await fetch(request);
    if (response?.ok && !isDocument) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    if (isDocument) throw error;

    const cached = await caches.match(request);
    if (cached) return cached;

    throw error;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const refreshed = fetch(request)
    .then((response) => {
      if (response?.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || refreshed;
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (!["http:", "https:"].includes(url.protocol)) return;
  if (url.hostname.endsWith("supabase.co")) return;

  // OAuth return must hit the network (query or hash) so PKCE exchange can read localStorage.
  const hash = url.hash.replace(/^#/, "");
  const isAuthCallback =
    url.searchParams.has("code") ||
    url.searchParams.has("error") ||
    url.searchParams.has("error_description") ||
    hash.includes("code=") ||
    hash.includes("error=") ||
    hash.includes("access_token");

  if (event.request.mode === "navigate" && isAuthCallback) {
    return;
  }

  if (
    event.request.mode === "navigate" ||
    ["script", "style", "manifest"].includes(event.request.destination) ||
    url.pathname.endsWith("/config.js")
  ) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  if (["image", "font"].includes(event.request.destination)) {
    event.respondWith(staleWhileRevalidate(event.request));
  }
});
