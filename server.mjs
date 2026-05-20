import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

const root = resolve(import.meta.dirname);
const port = Number(process.env.PORT ?? 4173);

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
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

createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host}`);
  const pathname = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
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
