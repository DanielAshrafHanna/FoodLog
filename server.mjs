import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { resolveGoogleMapsUrl } from "./cloudflare-worker.mjs";

const root = resolve(import.meta.dirname, "dist");
const port = Number(process.env.PORT ?? 4173);
const PRODUCTION_PROJECT_REF = "lmkkmzpwsdhlpjugrwjr";

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2"
};

const release = JSON.parse(await readFile(join(root, "release.json"), "utf8"));

function jsonResponse(response, value, status = 200) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(value));
}

async function readJsonRequest(request, maxBytes = 4096) {
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > maxBytes) throw new Error("Request body is too large.");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host}`);

  if (url.pathname === "/api/health") {
    if (request.method !== "GET") {
      jsonResponse(response, { error: "Method not allowed." }, 405);
      return;
    }
    jsonResponse(response, { status: "ok", release });
    return;
  }

  if (url.pathname === "/config.js") {
    const supabaseUrl = process.env.SUPABASE_URL;
    if (supabaseUrl?.includes(PRODUCTION_PROJECT_REF) && process.env.FOODLOG_RUNTIME_CONTEXT !== "production") {
      response.writeHead(500, { "Content-Type": "text/javascript; charset=utf-8" });
      response.end("throw new Error('Production Supabase credentials are blocked in local mode.');");
      return;
    }
    const config = {
      ...(supabaseUrl ? { supabaseUrl } : {}),
      ...(process.env.SUPABASE_PUBLISHABLE_KEY
        ? { supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY }
        : {})
    };
    response.writeHead(200, {
      "Content-Type": "text/javascript; charset=utf-8",
      "Cache-Control": "no-store"
    });
    response.end(`window.PLATE_LOG_CONFIG = ${JSON.stringify(config)};`);
    return;
  }

  if (url.pathname === "/api/maps/resolve") {
    if (request.method !== "POST") {
      jsonResponse(response, { error: "Method not allowed." }, 405);
      return;
    }
    try {
      const body = await readJsonRequest(request);
      jsonResponse(response, await resolveGoogleMapsUrl(body.url));
    } catch (error) {
      jsonResponse(response, {
        error: error?.name === "AbortError"
          ? "Google Maps took too long to respond."
          : error.message
      }, error?.name === "AbortError" ? 504 : 400);
    }
    return;
  }

  let pathname = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  if (pathname === "/favicon.ico") pathname = "/icons/favicon-32.png";
  const filePath = resolve(join(root, pathname));

  if (!filePath.startsWith(`${root}/`)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const file = await readFile(filePath);
    const ext = extname(filePath);
    response.writeHead(200, {
      "Content-Type": types[ext] ?? "application/octet-stream",
      "Cache-Control": [".html", ".json"].includes(ext) || pathname.endsWith("/sw.js")
        ? "no-cache, max-age=0"
        : "public, max-age=300"
    });
    response.end(file);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`FoodLog is running at http://127.0.0.1:${port} (${release.channel} · ${release.buildId})`);
});
