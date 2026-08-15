import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

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
});
