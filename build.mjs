import { writeFile } from "node:fs/promises";

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
