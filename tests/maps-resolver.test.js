import { describe, expect, it, vi } from "vitest";
import worker from "../cloudflare-worker.mjs";
import {
  isAllowedGoogleMapsUrl,
  parseGoogleMapsUrl,
  resolveGoogleMapsUrl
} from "../cloudflare-worker.mjs";

describe("Google Maps resolver", () => {
  it("accepts only bounded HTTPS Google Maps links", () => {
    expect(isAllowedGoogleMapsUrl("https://maps.app.goo.gl/abc")).toBe(true);
    expect(isAllowedGoogleMapsUrl("https://www.google.com/maps/place/Test")).toBe(true);
    expect(isAllowedGoogleMapsUrl("http://www.google.com/maps/place/Test")).toBe(false);
    expect(isAllowedGoogleMapsUrl("https://example.com/maps/place/Test")).toBe(false);
    expect(isAllowedGoogleMapsUrl(`https://maps.app.goo.gl/${"x".repeat(2050)}`)).toBe(false);
  });

  it("extracts only URL-embedded place details", () => {
    expect(
      parseGoogleMapsUrl("https://www.google.com/maps/place/Cafe+Roma/@30.1,31.2,15z")
    ).toMatchObject({
      placeName: "Cafe Roma",
      latitude: 30.1,
      longitude: 31.2,
      source: "google-maps-url"
    });
  });

  it("follows Google-owned redirects manually and rejects an external destination", async () => {
    const successfulFetch = vi.fn(async () =>
      new Response(null, {
        status: 302,
        headers: { location: "https://www.google.com/maps/place/Shantung/@30.1,31.2,16z" }
      })
    );
    await expect(
      resolveGoogleMapsUrl("https://maps.app.goo.gl/short", successfulFetch)
    ).resolves.toMatchObject({ placeName: "Shantung" });
    expect(successfulFetch).toHaveBeenCalledTimes(1);
    expect(successfulFetch.mock.calls[0][1]).toMatchObject({ redirect: "manual" });

    const unsafeFetch = vi.fn(async () =>
      new Response(null, {
        status: 302,
        headers: { location: "https://example.com/collect" }
      })
    );
    await expect(
      resolveGoogleMapsUrl("https://maps.app.goo.gl/unsafe", unsafeFetch)
    ).rejects.toThrow("outside Google");
  });

  it("stops after at most five followed redirects", async () => {
    let count = 0;
    const loopFetch = vi.fn(async () => {
      count += 1;
      return new Response(null, {
        status: 302,
        headers: { location: `https://maps.app.goo.gl/loop-${count}` }
      });
    });
    await expect(
      resolveGoogleMapsUrl("https://maps.app.goo.gl/start", loopFetch)
    ).rejects.toThrow("too many times");
    // Six requests are the initial URL plus five followed redirect destinations.
    expect(loopFetch).toHaveBeenCalledTimes(6);
  });
});

describe("Cloudflare Worker routes", () => {
  const release = {
    channel: "UX Preview",
    buildId: "abc1234",
    builtAt: "2026-09-04T18:22:00.000Z"
  };

  function workerEnv() {
    return {
      SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_PUBLISHABLE_KEY: "public-key",
      ASSETS: {
        fetch: vi.fn(async (request) => {
          const url = new URL(request.url);
          if (url.pathname === "/release.json") {
            return new Response(JSON.stringify(release), {
              headers: { "content-type": "application/json" }
            });
          }
          return new Response("static asset", { status: 200 });
        })
      }
    };
  }

  it("returns deployment health and release metadata without runtime configuration", async () => {
    const env = workerEnv();
    const response = await worker.fetch(new Request("https://food.example/api/health"), env);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok", release });
    expect(await worker.fetch(new Request("https://food.example/api/health", { method: "POST" }), env))
      .toMatchObject({ status: 405 });
  });

  it("keeps config dynamic and delegates every other path to Static Assets", async () => {
    const env = workerEnv();
    const configResponse = await worker.fetch(new Request("https://food.example/config.js"), env);
    expect(await configResponse.text()).toContain("public-key");
    expect(configResponse.headers.get("cache-control")).toBe("no-store");

    const assetResponse = await worker.fetch(new Request("https://food.example/styles.css"), env);
    expect(await assetResponse.text()).toBe("static asset");
    expect(env.ASSETS.fetch).toHaveBeenCalledWith(expect.any(Request));
  });
});
