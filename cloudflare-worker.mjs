/**
 * Cloudflare Worker for food.danyhanna.uk
 *
 * DEPLOY: paste the ENTIRE file into Workers & Pages → foodlog → Edit code → Deploy
 * CRITICAL: set VERSION to latest main commit after every push that changes HTML/JS/CSS:
 *   git rev-parse --short HEAD
 *
 * Example: const VERSION = "e145f07";
 */
const REPO = "https://raw.githubusercontent.com/DanielAshrafHanna/FoodLog/main";
const VERSION = "20260724e";

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
