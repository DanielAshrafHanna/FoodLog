import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { resolveGoogleMapsUrl } from "./cloudflare-worker.mjs";

const root = resolve(import.meta.dirname);
const port = Number(process.env.PORT ?? 4173);

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".ico": "image/png",
  ".txt": "text/plain; charset=utf-8"
};

let buildId = process.env.BUILD_ID ?? "dev-local";

try {
  buildId = (await readFile(join(root, "build-id.txt"), "utf8")).trim() || buildId;
} catch {
  // Local dev works without running build first.
}

function stamp(source) {
  return source.replaceAll("__BUILD_ID__", buildId);
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
  if (url.pathname === "/api/maps/resolve") {
    if (request.method !== "POST") {
      response.writeHead(405, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "Method not allowed." }));
      return;
    }
    try {
      const body = await readJsonRequest(request);
      const result = await resolveGoogleMapsUrl(body.url);
      response.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      });
      response.end(JSON.stringify(result));
    } catch (error) {
      response.writeHead(error?.name === "AbortError" ? 504 : 400, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      });
      response.end(JSON.stringify({
        error: error?.name === "AbortError"
          ? "Google Maps took too long to respond."
          : error.message
      }));
    }
    return;
  }
  let pathname = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  if (pathname === "/favicon.ico") pathname = "/icons/favicon-32.png";
  const filePath = resolve(join(root, pathname));

  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    let file = await readFile(filePath);
    const ext = extname(filePath);

    if (ext === ".html" || (ext === ".js" && pathname.endsWith("/sw.js"))) {
      file = Buffer.from(stamp(file.toString("utf8")), "utf8");
    }

    response.writeHead(200, { "Content-Type": types[ext] ?? "application/octet-stream" });
    response.end(file);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Plate Log is running at http://127.0.0.1:${port} (BUILD_ID=${buildId})`);
});
