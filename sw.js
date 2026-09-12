const BUILD_ID = "__BUILD_ID__";
const CACHE_NAME = `plate-log-cache-${BUILD_ID}`;
const PHOTO_CACHE = "plate-log-photos-v1";
const PHOTO_CACHE_LIMIT = 300;
// Do not precache index.html — navigations must fetch fresh HTML after Worker VERSION bumps.
const APP_SHELL = [
  `styles.css?v=${BUILD_ID}`,
  `app.js?v=${BUILD_ID}`,
  "lib/foodlog-core.js",
  "lib/photo-delivery.js",
  "lib/navigation.js",
  "lib/render-list.js",
  "lib/photo-queue.js",
  "lib/photo-gallery.js",
  "vendor/supabase-2.110.8.js",
  "assets/fonts/bricolage-grotesque-latin-variable.woff2",
  "assets/fonts/atkinson-hyperlegible-next-latin-variable.woff2",
  "assets/fonts/atkinson-hyperlegible-next-latin-variable-italic.woff2",
  "manifest.json",
  "offline.html",
  "assets/foodlog-logo.png",
  "assets/foodlog-mark.svg",
  "assets/ceramic-speckle-light.svg",
  "assets/ceramic-speckle-dark.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-192.png",
  "icons/icon-maskable-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        await cache.addAll(APP_SHELL);
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
          .filter((cacheName) => cacheName !== CACHE_NAME && cacheName !== PHOTO_CACHE)
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
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    if (isDocument) {
      const offline = await cache.match("offline.html");
      if (offline) return offline;
      throw error;
    }

    const cached = await caches.match(request);
    if (cached) return cached;

    throw error;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const refreshed = fetch(request)
    .then(async (response) => {
      if (response?.ok) {
        await cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || refreshed;
}

async function cacheFirstPhotos(request) {
  const cache = await caches.open(PHOTO_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response?.ok) {
    await cache.put(request, response.clone());
    const keys = await cache.keys();
    const overflow = keys.length - PHOTO_CACHE_LIMIT;
    if (overflow > 0) {
      await Promise.all(keys.slice(0, overflow).map((key) => cache.delete(key)));
    }
  }
  return response;
}

function isPublicPlatePhoto(url, request) {
  return request.method === "GET"
    && url.hostname.endsWith("supabase.co")
    && url.pathname.includes("/storage/v1/object/public/plate-photos/");
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (!["http:", "https:"].includes(url.protocol)) return;
  if (url.hostname.endsWith("supabase.co") && !isPublicPlatePhoto(url, event.request)) return;

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

  if (isPublicPlatePhoto(url, event.request)) {
    event.respondWith(cacheFirstPhotos(event.request));
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
