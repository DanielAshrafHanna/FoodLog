export function restaurantRowFingerprint(restaurant, extras = {}) {
  const dishes = restaurant?.dishes ?? [];
  const photos = restaurant?.photos ?? [];
  return [
    restaurant?.id ?? "",
    restaurant?.updatedAt ?? "",
    restaurant?.name ?? "",
    restaurant?.location ?? "",
    restaurant?.cuisine ?? "",
    restaurant?.price ?? "",
    (restaurant?.playlists ?? []).join(","),
    restaurant?.pendingSync ? "1" : "0",
    extras.visitStatus ?? "",
    extras.wantToGo ? "1" : "0",
    extras.rating ?? "",
    extras.ratingCount ?? "0",
    extras.mediaSrc ?? "",
    dishes.length,
    photos.length
  ].join("|");
}

export function reconcileKeyedChildren(parent, items, { getKey, create, update }) {
  if (!parent) return [];
  const existing = new Map();
  for (const child of [...parent.children]) {
    const key = child.dataset?.id;
    if (key) existing.set(key, child);
  }
  const used = new Set();
  const nextNodes = items.map((item) => {
    const key = String(getKey(item) ?? "");
    used.add(key);
    const current = existing.get(key);
    if (current) return update(current, item) || current;
    return create(item);
  });
  for (const [key, node] of existing) {
    if (!used.has(key)) node.remove();
  }
  nextNodes.forEach((node, index) => {
    if (!node) return;
    const reference = parent.children[index] ?? null;
    if (node !== reference) parent.insertBefore(node, reference);
  });
  return nextNodes;
}

export function paintFingerprint(parts) {
  return parts.map((part) => String(part ?? "")).join("\u001f");
}
