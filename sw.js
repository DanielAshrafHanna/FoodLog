const BUILD_ID = "28386f1";
const CACHE_NAME = `plate-log-cache-${BUILD_ID}`;
const APP_SHELL = [
  "./",
  "index.html",
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

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
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

  try {
    const response = await fetch(request);
    if (response?.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    if (request.mode === "navigate") {
      return caches.match("./");
    }

    return new Response("", { status: 503, statusText: "Offline" });
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
