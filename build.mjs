import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";

const sourceRoot = resolve(import.meta.dirname);
const outputRoot = join(sourceRoot, "dist");
const releaseChannel = String(process.env.RELEASE_CHANNEL ?? "UX Preview").trim() || "UX Preview";

function getBuildId() {
  const supplied = String(process.env.BUILD_ID ?? "").trim();
  if (supplied) return supplied.slice(0, 12);
  try {
    const gitOptions = {
      cwd: sourceRoot,
      encoding: "utf8"
    };
    const sha = execFileSync("git", ["rev-parse", "--short=7", "HEAD"], gitOptions).trim();
    const dirty = execFileSync(
      "git",
      ["status", "--porcelain", "--untracked-files=no"],
      gitOptions
    ).trim();
    return dirty ? `${sha}-dev-${Date.now().toString(36).slice(-5)}` : sha;
  } catch {
    return "local";
  }
}

const buildId = getBuildId();
const builtAt = String(process.env.BUILD_TIMESTAMP ?? new Date().toISOString());

function stamp(source) {
  return source
    .replaceAll("__BUILD_ID__", buildId)
    .replaceAll("__RELEASE_CHANNEL__", releaseChannel)
    .replaceAll("__BUILT_AT__", builtAt);
}

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });

for (const directory of ["assets", "icons", "lib", "vendor"]) {
  await cp(join(sourceRoot, directory), join(outputRoot, directory), { recursive: true });
}

for (const filename of ["styles.css", "app.js", "offline.html", "manifest.json"]) {
  await cp(join(sourceRoot, filename), join(outputRoot, filename));
}

for (const filename of ["index.html", "sw.js"]) {
  const source = await readFile(join(sourceRoot, filename), "utf8");
  const stamped = stamp(source);
  if (stamped.includes("__BUILD_ID__") || stamped.includes("__BUILT_AT__")) {
    throw new Error(`${filename} still contains an unstamped release placeholder.`);
  }
  await writeFile(join(outputRoot, filename), stamped);
}

await writeFile(
  join(outputRoot, "release.json"),
  `${JSON.stringify({ channel: releaseChannel, buildId, builtAt }, null, 2)}\n`
);

console.log(`Built dist/ for ${releaseChannel} · ${buildId} at ${builtAt}.`);
