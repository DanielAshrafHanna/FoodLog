import { describe, expect, it, vi } from "vitest";
import {
  buildGoogleMapsPlaceUrl,
  mapPhotonFeatures,
  searchMapPlaces
} from "../lib/maps-search.js";

describe("in-app Maps place search", () => {
  it("builds an allowed Google Maps place URL from a chosen result", () => {
    expect(buildGoogleMapsPlaceUrl({
      name: "Silkroad",
      latitude: 29.96,
      longitude: 31.25
    })).toBe("https://www.google.com/maps/place/Silkroad/@29.96,31.25,17z");
  });

  it("maps Photon features into selectable places", () => {
    const results = mapPhotonFeatures({
      features: [
        {
          geometry: { coordinates: [31.25, 29.96] },
          properties: { name: "Silkroad", city: "Maadi", country: "Egypt" }
        },
        {
          geometry: { coordinates: ["bad"] },
          properties: { name: "Incomplete" }
        }
      ]
    });
    expect(results).toEqual([
      {
        name: "Silkroad",
        label: "Silkroad, Maadi, Egypt",
        location: "Maadi",
        latitude: 29.96,
        longitude: 31.25,
        mapsUrl: "https://www.google.com/maps/place/Silkroad/@29.96,31.25,17z"
      }
    ]);
  });

  it("rejects a short query without calling Photon", async () => {
    const fetchImpl = vi.fn();
    await expect(searchMapPlaces("a", fetchImpl)).rejects.toThrow("two characters");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("returns Photon results from a bounded search request", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      features: [{
        geometry: { coordinates: [31.25, 29.96] },
        properties: { name: "Silkroad", city: "Maadi", country: "Egypt" }
      }]
    }), { status: 200 }));
    await expect(searchMapPlaces("Silkroad Maadi", fetchImpl)).resolves.toMatchObject([
      { name: "Silkroad", mapsUrl: "https://www.google.com/maps/place/Silkroad/@29.96,31.25,17z" }
    ]);
    expect(fetchImpl.mock.calls[0][0].toString()).toContain("photon.komoot.io");
    expect(fetchImpl.mock.calls[0][1]).toMatchObject({ method: "GET" });
  });
});
