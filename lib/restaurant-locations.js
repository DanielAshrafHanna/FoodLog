export function safeMapsLink(value) {
  const link = typeof value === "string" ? value.trim() : "";
  if (!link) return "";
  try {
    const url = new URL(link);
    return url.protocol === "https:" || url.protocol === "http:" ? link : "";
  } catch {
    return "";
  }
}

export function additionalLocations(value) {
  return (Array.isArray(value) ? value : []).map(entry => ({
    location: typeof entry?.location === "string" ? entry.location.trim() : "",
    maps: safeMapsLink(entry?.maps)
  })).filter(entry => entry.location || entry.maps);
}

export function restaurantLocations(restaurant) {
  return additionalLocations([
    { location: restaurant?.location, maps: restaurant?.maps },
    ...(Array.isArray(restaurant?.additionalLocations) ? restaurant.additionalLocations : [])
  ]);
}
