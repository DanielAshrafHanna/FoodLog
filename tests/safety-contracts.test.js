import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const readBinary = (path) => readFile(new URL(path, import.meta.url));

function pngMetadata(buffer) {
  expect(buffer.subarray(1, 4).toString("ascii")).toBe("PNG");
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    colorType: buffer[25]
  };
}

describe("cloud data-safety contracts", () => {
  it("filters active top-level and nested recoverable records", async () => {
    const source = await read("../app.js");
    expect(source).toContain('.is("deleted_at", null)');
    expect(source).toContain(".filter((entry) => !entry.deleted_at)");
    expect(source).toContain(".filter((photo) => !photo.deleted_at)");
    expect(source).toContain(".filter((dish) => !dish.deleted_at)");
  });

  it("uses transactional RPCs for record/rating and playlist operations", async () => {
    const source = await read("../app.js");
    for (const rpc of [
      "save_restaurant_capture",
      "save_restaurant_with_rating",
      "save_dish_with_rating",
      "rename_foodlog_playlist",
      "trash_foodlog_playlist",
      "restore_foodlog_playlist"
    ]) {
      expect(source).toContain(`"${rpc}"`);
    }
  });

  it("renames a playlist in place instead of inserting a second catalog row", async () => {
    const [source, migration] = await Promise.all([
      read("../app.js"),
      read("../supabase/migrations/20260911013000_fix_playlist_rename.sql")
    ]);
    expect(source).toContain("replaceLookupPlaylistName");
    expect(source).toContain('rpc("rename_foodlog_playlist"');
    expect(migration).toMatch(/security definer/i);
    expect(migration.indexOf("update public.playlists")).toBeLessThan(migration.indexOf("update public.restaurants as restaurant"));
    expect(migration).toContain("A playlist with that name is in Trash");
  });

  it("keeps direct dish reviews attributed to one reviewer without rewriting dish metadata", async () => {
    const [source, html, migration] = await Promise.all([
      read("../app.js"),
      read("../index.html"),
      read("../supabase-migration-dish-ratings.sql")
    ]);

    expect(html).toContain('id="dishReviewModal"');
    expect(html).toContain('id="dishReviewsWriteButton"');
    expect(source).toContain('data-action="open-dish-reviews"');
    expect(source).toContain('saveMyDishRatingRemote(dish.id, ratingValue, notes)');
    expect(source).toContain('{ onConflict: "dish_id,rater_email" }');
    expect(migration).toMatch(/primary key \(dish_id, rater_email\)/i);
    expect(migration).toContain("lower(rater_email)");
  });

  it("contains no permanent delete call for journal-content tables", async () => {
    const source = await read("../app.js");
    for (const table of [
      "restaurants",
      "dishes",
      "restaurant_photos",
      "restaurant_ratings",
      "dish_ratings",
      "playlists"
    ]) {
      expect(source).not.toMatch(
        new RegExp(`from\\([\"']${table}[\"']\\)[\\s\\S]{0,180}?\\.delete\\(`)
      );
    }
  });

  it("selects restaurant cover photos through an additive same-restaurant reference", async () => {
    const appSource = await read("../app.js");
    const migration = await read("../supabase/migrations/20260724143557_restaurant_cover_photo.sql");

    expect(appSource).toContain('"set_restaurant_cover_photo"');
    expect(appSource).toContain("photo.isCover");
    expect(migration).toContain("add column if not exists cover_photo_id uuid");
    expect(migration).toContain("references public.restaurant_photos(id)");
    expect(migration).toContain("restaurant_id = p_restaurant_id");
    expect(migration).toContain("restaurant_id = new.id");
    expect(migration).toContain("on delete set null");
    expect(migration).not.toMatch(/delete\s+from\s+public\.restaurant_photos/i);
  });

  it("disambiguates the restaurant gallery relationship and preserves unsynced recovery records", async () => {
    const source = await read("../app.js");
    expect(source).toContain(
      "restaurant_photos!restaurant_photos_restaurant_id_fkey"
    );
    expect(source).toContain("mergePendingRestaurants(localSnapshot, parsedData)");
    expect(source).toContain("Saved on this device");
    expect(source).toContain('.select("id,name,location,cuisine,deleted_at")');
  });

  it("adds the capture transaction with explicit permissions and no destructive schema change", async () => {
    const appSource = await read("../app.js");
    const migration = await read(
      "../supabase/migrations/20260808195735_capture_first_restaurant.sql"
    );
    expect(appSource).toContain('"save_restaurant_capture"');
    expect(migration).toContain("security invoker");
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain("public.save_restaurant_with_rating");
    expect(migration).toContain("public.restaurant_want_to_go");
    expect(migration).toContain("grant execute");
    expect(migration).not.toMatch(/\bdrop\s+(table|column)\b/i);
    expect(migration).not.toMatch(/\bdelete\s+from\b/i);
  });

  it("queues parent saves durably and replays them through idempotent transactions", async () => {
    const [appSource, migration] = await Promise.all([
      read("../app.js"),
      read("../supabase/migrations/20260907203220_reliable_save_operations.sql")
    ]);
    expect(appSource).toContain("PENDING_OPERATIONS_KEY");
    expect(appSource).toContain("queueReliableSave");
    expect(appSource).toContain("syncPendingOperations");
    expect(appSource).toContain('"save_restaurant_reliably"');
    expect(appSource).toContain('"save_dish_reliably"');
    expect(migration).toContain("private.save_operation_receipts");
    expect(migration).toContain("p_operation_id uuid");
    expect(migration).toContain("security invoker");
    expect(migration).toContain("actor_id = (select auth.uid())");
    expect(migration).not.toMatch(/\b(drop\s+(table|column)|delete\s+from|truncate)\b/i);
  });

  it("enforces contributor ownership without rewriting journal records", async () => {
    const [appSource, migration] = await Promise.all([
      read("../app.js"),
      read("../supabase/migrations/20260908233203_enforce_contributor_ownership.sql")
    ]);
    expect(appSource).toContain("canManageContribution");
    expect(appSource).toContain("userId: dish.user_id");
    expect(appSource).toContain("userId: restaurant.user_id");
    expect(migration).toContain("user_id = (select auth.uid())");
    expect(migration).toContain("public.is_foodlog_owner()");
    expect(migration).toContain("split_part(name, '/', 1) = (select auth.uid())::text");
    expect(migration).not.toMatch(/\b(delete\s+from|update\s+public\.(restaurants|dishes|restaurant_photos)|truncate)\b/i);
  });
});

describe("PWA and authentication regression contracts", () => {
  it("keeps map assets off the initial path and preloads the critical fonts", async () => {
    const html = await read("../index.html");
    const appSource = await read("../app.js");

    expect(html).not.toMatch(/<script[^>]+leaflet/i);
    expect(html).not.toMatch(/<link[^>]+leaflet/i);
    expect(html).toContain('rel="preload" href="assets/fonts/atkinson-hyperlegible-next-latin-variable.woff2"');
    expect(html).toContain('rel="preload" href="assets/fonts/bricolage-grotesque-latin-variable.woff2"');
    expect(appSource).toContain("function ensureLeaflet()");
    expect(appSource).toContain('loadLeafletAsset("script"');
  });

  it("ships Static Assets and automatic release metadata without a manual Worker version", async () => {
    const [worker, wrangler, build] = await Promise.all([
      read("../cloudflare-worker.mjs"),
      read("../wrangler.jsonc"),
      read("../build.mjs")
    ]);

    expect(worker).toContain("env.ASSETS.fetch");
    expect(worker).toContain('url.pathname === "/api/health"');
    expect(worker).not.toContain("raw.githubusercontent.com");
    expect(worker).not.toMatch(/\bVERSION\s*=/);
    expect(wrangler).toContain('"directory": "./dist"');
    expect(wrangler).toContain('"binding": "ASSETS"');
    expect(wrangler).toContain('"enabled": true');
    expect(build).toContain('releaseChannel = String(process.env.RELEASE_CHANNEL ?? "Main")');
    expect(build).toContain('"release.json"');
  });

  it("keeps the RLS optimization forward-only and caches Supabase auth helpers", async () => {
    const [migration, contracts] = await Promise.all([
      read("../supabase/migrations/20260904171023_optimize_rls_auth_initplans.sql"),
      read("../supabase/tests/foodlog_security_contracts.sql")
    ]);

    expect(migration).toContain("(select auth.uid())");
    expect(migration).toContain("(select auth.jwt())");
    expect(migration).toContain("(select auth.email())");
    expect(migration).not.toMatch(/\b(drop|delete|truncate)\b/i);
    expect(contracts).toContain("Expected every public table to have RLS");
    expect(contracts).toContain("Want-to-go aggregate exposes an unexpected result shape");
    expect(contracts).toContain("Decision-vote aggregate exposes an unexpected result shape");
  });

  it("bypasses Supabase and OAuth callbacks while retaining offline fallback", async () => {
    const source = await read("../sw.js");
    expect(source).toContain('url.hostname.endsWith("supabase.co")');
    expect(source).toContain("event.request.mode === \"navigate\" && isAuthCallback");
    expect(source).toContain('cache.match("offline.html")');
    expect(source).toContain('url.pathname.endsWith("/config.js")');
  });

  it("keeps the dynamic-origin OAuth redirect and avoids a manual double exchange", async () => {
    const source = await read("../app.js");
    expect(source).toContain("return window.location.origin");
    expect(source).not.toContain("exchangeCodeForSession(");
  });

  it("registers a GET share target that opens restaurant capture", async () => {
    const manifest = JSON.parse(await read("../manifest.json"));
    expect(manifest.share_target).toMatchObject({
      action: "./?capture=restaurant",
      method: "GET",
      params: {
        title: "shared_title",
        text: "shared_text",
        url: "shared_url"
      }
    });
  });

  it("ships the FoodLog logo across the header, browser, and installable app surfaces", async () => {
    const [html, serviceWorker, manifest, headerLogo, icon192, icon512, maskable192, maskable512, appleIcon] = await Promise.all([
      read("../index.html"),
      read("../sw.js"),
      read("../manifest.json").then(JSON.parse),
      readBinary("../assets/foodlog-logo.png"),
      readBinary("../icons/icon-192.png"),
      readBinary("../icons/icon-512.png"),
      readBinary("../icons/icon-maskable-192.png"),
      readBinary("../icons/icon-maskable-512.png"),
      readBinary("../icons/apple-touch-icon.png")
    ]);

    expect(html).toContain('class="brand-logo" src="/assets/foodlog-logo.png"');
    expect(html).toContain('name="apple-mobile-web-app-title" content="FoodLog"');
    expect(manifest.name).toBe("FoodLog - Shared restaurant journal");
    expect(manifest.short_name).toBe("FoodLog");
    expect(html).toContain('rel="apple-touch-icon" href="/icons/apple-touch-icon.png"');
    expect(html).toContain('rel="shortcut icon" href="/icons/favicon.ico"');
    expect(serviceWorker).toContain('"assets/foodlog-logo.png"');

    expect(manifest.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ src: "icons/icon-192.png", sizes: "192x192", purpose: "any" }),
      expect.objectContaining({ src: "icons/icon-512.png", sizes: "512x512", purpose: "any" }),
      expect.objectContaining({ src: "icons/icon-maskable-192.png", sizes: "192x192", purpose: "maskable" }),
      expect.objectContaining({ src: "icons/icon-maskable-512.png", sizes: "512x512", purpose: "maskable" })
    ]));

    expect(pngMetadata(headerLogo)).toEqual({ width: 256, height: 256, colorType: 6 });
    expect(pngMetadata(icon192)).toEqual({ width: 192, height: 192, colorType: 2 });
    expect(pngMetadata(icon512)).toEqual({ width: 512, height: 512, colorType: 2 });
    expect(pngMetadata(maskable192)).toEqual({ width: 192, height: 192, colorType: 2 });
    expect(pngMetadata(maskable512)).toEqual({ width: 512, height: 512, colorType: 2 });
    expect(pngMetadata(appleIcon)).toEqual({ width: 180, height: 180, colorType: 2 });
  });

  it("keeps reduced-motion press scale off and phone scroll-padding around the dock", async () => {
    const css = await read("../styles.css");
    expect(css).toContain("scroll-padding-bottom: calc(86px + env(safe-area-inset-bottom))");
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*button:not\(:disabled\):active[\s\S]*transform: none !important;/);
  });
});
