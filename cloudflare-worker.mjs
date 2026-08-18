/**
 * Cloudflare Worker for food.danyhanna.uk
 *
 * DEPLOY: paste the ENTIRE file into Workers & Pages → foodlog → Edit code → Deploy
 * The Worker injects production Supabase credentials at /config.js. Pointing REPO at a
 * Git branch does not create a new database; it only changes which frontend files are served.
 *
 * UX preview (this branch, same production Supabase):
 *   REPO = ".../FoodLog/refs/heads/cursor/ux-flow-improvements-ee5a"
 *   VERSION = "ae91ff9"
 *
 * Rollback to the current production design without merging or reverting Git:
 *   REPO = ".../FoodLog/main"
 *   VERSION = "954c4aa"
 *
 * CRITICAL: set VERSION to the stamped release after every push that changes HTML/JS/CSS:
 *   git rev-parse --short HEAD
 *
 * Example: const VERSION = "e145f07";
 */
const REPO = "https://raw.githubusercontent.com/DanielAshrafHanna/FoodLog/refs/heads/cursor/ux-flow-improvements-ee5a";
const VERSION = "ae91ff9";
const MAPS_TIMEOUT_MS = 3500;
const MAPS_MAX_REDIRECTS = 5;
const MAPS_MAX_URL_LENGTH = 2048;
const MAPS_MAX_BODY_BYTES = 4096;
const GOOGLE_MAPS_HOSTS = new Set([
  "google.com",
  "www.google.com",
  "maps.google.com",
  "maps.app.goo.gl",
  "goo.gl"
]);

const STATIC_FILES = new Map([
  ["/", ["/index.html", "text/html; charset=utf-8"]],
  ["/index.html", ["/index.html", "text/html; charset=utf-8"]],
  ["/styles.css", ["/styles.css", "text/css; charset=utf-8"]],
  ["/app.js", ["/app.js", "text/javascript; charset=utf-8"]],
  ["/lib/foodlog-core.js", ["/lib/foodlog-core.js", "text/javascript; charset=utf-8"]],
  ["/vendor/supabase-2.110.8.js", ["/vendor/supabase-2.110.8.js", "text/javascript; charset=utf-8"]],
  ["/assets/fonts/bricolage-grotesque-latin-variable.woff2", ["/assets/fonts/bricolage-grotesque-latin-variable.woff2", "font/woff2"]],
  ["/assets/fonts/atkinson-hyperlegible-next-latin-variable.woff2", ["/assets/fonts/atkinson-hyperlegible-next-latin-variable.woff2", "font/woff2"]],
  ["/assets/fonts/atkinson-hyperlegible-next-latin-variable-italic.woff2", ["/assets/fonts/atkinson-hyperlegible-next-latin-variable-italic.woff2", "font/woff2"]],
  ["/offline.html", ["/offline.html", "text/html; charset=utf-8"]],
  ["/manifest.json", ["/manifest.json", "application/manifest+json; charset=utf-8"]],
  ["/sw.js", ["/sw.js", "text/javascript; charset=utf-8"]]
]);

const ICON_TYPES = {
  ".png": "image/png",
  ".ico": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml"
};

function contentTypeForPath(path) {
  const dot = path.lastIndexOf(".");
  if (dot === -1) return "application/octet-stream";
  return ICON_TYPES[path.slice(dot)] ?? "application/octet-stream";
}

function cacheControlForPath(path) {
  if (path.endsWith(".html") || path.endsWith("/sw.js")) return "no-cache, max-age=0";
  if (path.endsWith(".js") || path.endsWith(".css")) return "public, max-age=300";
  return "public, max-age=86400";
}

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

export function isAllowedGoogleMapsUrl(value) {
  if (!value || String(value).length > MAPS_MAX_URL_LENGTH) return false;
  try {
    const url = new URL(String(value));
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || !GOOGLE_MAPS_HOSTS.has(host)) return false;
    return host.includes("goo.gl") || url.pathname.startsWith("/maps");
  } catch {
    return false;
  }
}

export function parseGoogleMapsUrl(value) {
  if (!isAllowedGoogleMapsUrl(value)) return null;
  const url = new URL(String(value));
  const placeMatch = url.pathname.match(/\/maps\/place\/([^/]+)/i);
  const atMatch = url.pathname.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  const coordinateMatch = (url.searchParams.get("q") ?? "").match(
    /^(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)$/
  );
  const rawName = placeMatch?.[1] ?? url.searchParams.get("query") ?? "";
  let placeName = "";
  try {
    placeName = decodeURIComponent(rawName.replace(/\+/g, " ")).trim();
  } catch {
    placeName = rawName.replace(/\+/g, " ").trim();
  }
  return {
    finalUrl: url.toString(),
    ...(placeName ? { placeName } : {}),
    ...(url.searchParams.get("query_place_id")
      ? { placeId: url.searchParams.get("query_place_id") }
      : {}),
    ...(atMatch || coordinateMatch
      ? {
          latitude: Number((atMatch ?? coordinateMatch)[1]),
          longitude: Number((atMatch ?? coordinateMatch)[2])
        }
      : {}),
    source: url.hostname.includes("goo.gl") ? "google-short-link" : "google-maps-url"
  };
}

async function cancelBody(response) {
  try {
    await response.body?.cancel();
  } catch {
    // The response may not have a body or may already be closed.
  }
}

async function readLimitedJson(request) {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAPS_MAX_BODY_BYTES) throw new Error("Request body is too large.");
  if (!request.body) return {};

  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAPS_MAX_BODY_BYTES) {
      await reader.cancel();
      throw new Error("Request body is too large.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(bytes) || "{}");
}

export async function resolveGoogleMapsUrl(value, fetchImpl = fetch) {
  if (!isAllowedGoogleMapsUrl(value)) {
    throw new Error("Use a valid HTTPS Google Maps link.");
  }

  let current = new URL(String(value));
  for (let redirectCount = 0; redirectCount <= MAPS_MAX_REDIRECTS; redirectCount += 1) {
    const parsed = parseGoogleMapsUrl(current.toString());
    if (!current.hostname.includes("goo.gl")) return parsed;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), MAPS_TIMEOUT_MS);
    let response;
    try {
      response = await fetchImpl(current.toString(), {
        method: "GET",
        redirect: "manual",
        headers: { "user-agent": "FoodLog Maps Resolver" },
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }

    if (response.status < 300 || response.status >= 400) {
      const finalValue = response.url && isAllowedGoogleMapsUrl(response.url)
        ? response.url
        : current.toString();
      await cancelBody(response);
      return parseGoogleMapsUrl(finalValue);
    }

    const location = response.headers.get("location");
    await cancelBody(response);
    if (!location) throw new Error("Google returned a redirect without a destination.");
    const next = new URL(location, current);
    if (!isAllowedGoogleMapsUrl(next.toString())) {
      throw new Error("The Maps link redirected outside Google.");
    }
    current = next;
  }

  throw new Error("The Google Maps link redirected too many times.");
}

async function handleMapsResolve(request) {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }
  try {
    const body = await readLimitedJson(request);
    const result = await resolveGoogleMapsUrl(body.url);
    return jsonResponse(result);
  } catch (error) {
    const timedOut = error?.name === "AbortError";
    return jsonResponse(
      { error: timedOut ? "Google Maps took too long to respond." : error.message },
      timedOut ? 504 : 400
    );
  }
}

async function serveFromRepo(path, contentType) {
  const assetUrl = `${REPO}${path}?v=${VERSION}`;
  const asset = await fetch(assetUrl, {
    headers: { "user-agent": "foodlog-worker" }
  });

  if (!asset.ok) {
    return new Response(`Upstream ${asset.status} for ${path} (VERSION=${VERSION})`, { status: 502 });
  }

  return new Response(asset.body, {
    headers: {
      "content-type": contentType,
      "cache-control": cacheControlForPath(path)
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/maps/resolve") {
      return handleMapsResolve(request);
    }

    if (url.pathname === "/config.js") {
      const config = `window.PLATE_LOG_CONFIG = ${JSON.stringify({
        supabaseUrl: env.SUPABASE_URL,
        supabasePublishableKey: env.SUPABASE_PUBLISHABLE_KEY
      })};`;
      return new Response(config, {
        headers: { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-store" }
      });
    }

    if (url.pathname === "/favicon.ico") {
      return serveFromRepo("/icons/favicon-32.png", "image/png");
    }

    if (url.pathname.startsWith("/icons/")) {
      const name = url.pathname.slice("/icons/".length);
      if (!name || name.includes("..") || name.includes("/")) {
        return new Response("Not found", { status: 404 });
      }
      return serveFromRepo(url.pathname, contentTypeForPath(url.pathname));
    }

    const mapping = STATIC_FILES.get(url.pathname);
    if (!mapping) {
      return new Response("Not found", { status: 404 });
    }

    const [path, contentType] = mapping;
    return serveFromRepo(path, contentType);
  }
};
