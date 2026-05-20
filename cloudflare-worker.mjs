/**
 * Cloudflare Worker for food.danyhanna.uk
 *
 * DEPLOY: paste into Workers & Pages → foodlog → Edit code → Deploy
 * CRITICAL: set VERSION to latest main commit after every push that changes HTML/JS/CSS:
 *   git rev-parse --short HEAD
 *
 * Example: const VERSION = "6cd9b4b";
 */
const REPO = "https://raw.githubusercontent.com/DanielAshrafHanna/FoodLog/main";
const VERSION = "6cd9b4b";

const FILES = new Map([
  ["/", ["/index.html", "text/html; charset=utf-8"]],
  ["/index.html", ["/index.html", "text/html; charset=utf-8"]],
  ["/styles.css", ["/styles.css", "text/css; charset=utf-8"]],
  ["/app.js", ["/app.js", "text/javascript; charset=utf-8"]],
  ["/manifest.json", ["/manifest.json", "application/manifest+json; charset=utf-8"]],
  ["/sw.js", ["/sw.js", "text/javascript; charset=utf-8"]],
  ["/icons/icon-192.png", ["/icons/icon-192.png", "image/png"]],
  ["/icons/icon-512.png", ["/icons/icon-512.png", "image/png"]]
]);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/config.js") {
      const config = `window.PLATE_LOG_CONFIG = ${JSON.stringify({
        supabaseUrl: env.SUPABASE_URL,
        supabasePublishableKey: env.SUPABASE_PUBLISHABLE_KEY
      })};`;
      return new Response(config, {
        headers: { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-store" }
      });
    }

    const mapping = FILES.get(url.pathname);
    if (!mapping) {
      return new Response("Not found", { status: 404 });
    }

    const [path, contentType] = mapping;
    const assetUrl = `${REPO}${path}?v=${VERSION}`;
    const asset = await fetch(assetUrl, {
      headers: { "user-agent": "foodlog-worker" }
    });

    if (!asset.ok) {
      return new Response(`Upstream ${asset.status} for ${path} (VERSION=${VERSION})`, { status: 502 });
    }

    const cacheControl =
      path.endsWith(".html") ? "no-cache" : path.endsWith(".js") || path.endsWith(".css") ? "public, max-age=300" : "public, max-age=86400";

    return new Response(asset.body, {
      headers: {
        "content-type": contentType,
        "cache-control": cacheControl
      }
    });
  }
};
