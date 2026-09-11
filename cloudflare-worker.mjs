/**
 * FoodLog Cloudflare Worker.
 *
 * Static files are uploaded atomically from dist/ through Workers Static Assets.
 * The Worker runs first only for /config.js and /api/*; all other requests are
 * served by env.ASSETS. Dashboard-managed runtime variables and the existing
 * custom domain are preserved by wrangler.jsonc.
 */
const MAPS_TIMEOUT_MS = 3500;
const MAPS_MAX_REDIRECTS = 5;
const MAPS_MAX_URL_LENGTH = 2048;
const MAPS_MAX_BODY_BYTES = 4096;
const RELEASE_MAX_BYTES = 4096;
const GOOGLE_MAPS_HOSTS = new Set([
  "google.com",
  "www.google.com",
  "maps.google.com",
  "maps.app.goo.gl",
  "goo.gl"
]);

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
    return jsonResponse(await resolveGoogleMapsUrl(body.url));
  } catch (error) {
    const timedOut = error?.name === "AbortError";
    console.error(JSON.stringify({ event: "maps_resolve_failed", message: error.message, timedOut }));
    return jsonResponse(
      { error: timedOut ? "Google Maps took too long to respond." : error.message },
      timedOut ? 504 : 400
    );
  }
}

function validRelease(value) {
  return value && [value.channel, value.buildId, value.builtAt]
    .every((entry) => typeof entry === "string" && entry.length > 0 && entry.length < 160);
}

export async function readReleaseMetadata(request, env) {
  if (!env.ASSETS?.fetch) throw new Error("Static Assets binding is unavailable.");
  const assetUrl = new URL("/release.json", request.url);
  const response = await env.ASSETS.fetch(new Request(assetUrl, { method: "GET" }));
  if (!response.ok) throw new Error(`Release metadata asset returned ${response.status}.`);
  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (declaredLength > RELEASE_MAX_BYTES) throw new Error("Release metadata is too large.");
  const text = await response.text();
  if (new TextEncoder().encode(text).byteLength > RELEASE_MAX_BYTES) {
    throw new Error("Release metadata is too large.");
  }
  const release = JSON.parse(text);
  if (!validRelease(release)) throw new Error("Release metadata is invalid.");
  return {
    channel: release.channel,
    buildId: release.buildId,
    builtAt: release.builtAt
  };
}

async function handleHealth(request, env) {
  if (request.method !== "GET") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }
  try {
    return jsonResponse({ status: "ok", release: await readReleaseMetadata(request, env) });
  } catch (error) {
    console.error(JSON.stringify({ event: "health_check_failed", message: error.message }));
    return jsonResponse({ status: "error" }, 503);
  }
}

function handleConfig(request, env) {
  if (!new Set(["GET", "HEAD"]).has(request.method)) {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }
  const config = `window.PLATE_LOG_CONFIG = ${JSON.stringify({
    supabaseUrl: env.SUPABASE_URL,
    supabasePublishableKey: env.SUPABASE_PUBLISHABLE_KEY
  })};`;
  return new Response(request.method === "HEAD" ? null : config, {
    headers: {
      "content-type": "text/javascript; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/maps/resolve") return handleMapsResolve(request);
    if (url.pathname === "/api/health") return handleHealth(request, env);
    if (url.pathname === "/config.js") return handleConfig(request, env);
    if (!env.ASSETS?.fetch) return new Response("Static Assets binding is unavailable.", { status: 503 });
    return env.ASSETS.fetch(request);
  }
};
