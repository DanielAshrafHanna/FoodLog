export function mergeRefreshOptions(current, incoming) {
  if (!current) return incoming;
  const full = !current.restaurantIds?.length || !incoming.restaurantIds?.length;
  return {
    reason: incoming.reason === "manual" || current.reason === "manual" ? "manual" : incoming.reason || current.reason,
    ...(full ? {} : { restaurantIds: [...new Set([...current.restaurantIds, ...incoming.restaurantIds])] })
  };
}
