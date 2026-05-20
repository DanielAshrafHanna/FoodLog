import { readFile, writeFile } from "node:fs/promises";
import { execSync } from "node:child_process";

function getBuildId() {
  if (process.env.BUILD_ID) return process.env.BUILD_ID;
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {
    return String(Date.now());
  }
}

const buildId = getBuildId();
const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.log("No Supabase env vars found; leaving config.js empty for local-only mode.");
  await writeFile("config.js", "window.PLATE_LOG_CONFIG = {};\n");
} else {
  await writeFile(
    "config.js",
    `window.PLATE_LOG_CONFIG = ${JSON.stringify(
      {
        supabaseUrl: SUPABASE_URL,
        supabasePublishableKey: SUPABASE_PUBLISHABLE_KEY
      },
      null,
      2
    )};\n`
  );
}

await writeFile("build-id.txt", `${buildId}\n`);

const stampSw = (source) =>
  source
    .replaceAll("__BUILD_ID__", buildId)
    .replaceAll(/v=[a-f0-9]{7,}/g, `v=${buildId}`)
    .replace(/const BUILD_ID = "[^"]+";/, `const BUILD_ID = "${buildId}";`);

const stampHtml = (source) =>
  stampSw(source).replace(/config\.js(?:\?v=[a-f0-9]+)?/g, `config.js?v=${buildId}`);

const swSource = await readFile("sw.js", "utf8");
await writeFile("sw.js", stampSw(swSource));

if (process.env.STAMP_INDEX === "1") {
  const indexHtml = await readFile("index.html", "utf8");
  await writeFile("index.html", stampHtml(indexHtml));
}

console.log(`Build complete (BUILD_ID=${buildId}).`);
