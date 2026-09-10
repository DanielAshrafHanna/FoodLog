export const MAPS_SEARCH_MIN_QUERY = 2;
export const MAPS_SEARCH_MAX_QUERY = 200;
export const MAPS_SEARCH_LIMIT = 5;

export function buildGoogleMapsPlaceUrl({ name, latitude, longitude } = {}) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "";
  const safeName = String(name ?? "").trim().replace(/[\\/]+/g, " ") || "Place";
  const slug = encodeURIComponent(safeName).replace(/%20/g, "+");
  const url = `https://www.google.com/maps/place/${slug}/@${lat},${lng},17z`;
  return url.length > 2048 ? `https://www.google.com/maps/place/Place/@${lat},${lng},17z` : url;
}

export function normalizePlaceSearchQuery(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

export function mapPhotonFeatures(payload = {}) {
  const features = Array.isArray(payload.features) ? payload.features : [];
  return features
    .map((feature) => {
      const [longitude, latitude] = feature?.geometry?.coordinates ?? [];
      const properties = feature?.properties ?? {};
      const name = String(properties.name ?? properties.street ?? "").trim();
      const location = String(
        properties.locality ?? properties.city ?? properties.district ?? properties.county ?? ""
      ).trim();
      const label = [name, properties.street, location, properties.country]
        .map((part) => String(part ?? "").trim())
        .filter(Boolean)
        .filter((part, index, parts) => parts.indexOf(part) === index)
        .join(", ");
      const mapsUrl = buildGoogleMapsPlaceUrl({ name: name || "Place", latitude, longitude });
      return mapsUrl
        ? {
            name: name || "Place",
            label: label || name || "Place",
            location,
            latitude: Number(latitude),
            longitude: Number(longitude),
            mapsUrl
          }
        : null;
    })
    .filter(Boolean);
}

export async function searchMapPlaces(query, fetchImpl = fetch) {
  const q = normalizePlaceSearchQuery(query);
  if (q.length < MAPS_SEARCH_MIN_QUERY) throw new Error("Type at least two characters.");
  if (q.length > MAPS_SEARCH_MAX_QUERY) throw new Error("Search is too long.");

  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", q);
  url.searchParams.set("limit", String(MAPS_SEARCH_LIMIT));
  url.searchParams.set("lang", "en");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);
  let response;
  try {
    response = await fetchImpl(url, {
      method: "GET",
      headers: {
        accept: "application/json",
        "user-agent": "FoodLog Place Search/1.0 (https://food.danyhanna.uk)"
      },
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) throw new Error("Place search is unavailable right now.");
  const payload = await response.json().catch(() => null);
  if (!payload || typeof payload !== "object") throw new Error("Place search returned an unexpected response.");
  return mapPhotonFeatures(payload);
}
