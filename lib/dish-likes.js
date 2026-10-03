// Account IDs identify reactions; display names never grant identity or access.
export function activeDishLikes(dish) {
  const seen = new Set();
  return (Array.isArray(dish?.likes) ? dish.likes : []).filter(like => {
    if (!like?.userId || like.liked === false || seen.has(like.userId)) return false;
    seen.add(like.userId);
    return true;
  });
}

export function likeInitials(name) {
  return String(name || 'Friend').trim().split(/\s+/u).slice(0, 2)
    .map(part => [...part][0] || '').join('').toLocaleUpperCase();
}

export function applyDishLike(dish, userId, name, liked) {
  const others = activeDishLikes(dish).filter(like => like.userId !== userId);
  dish.likes = liked ? [...others, { userId, name, likedAt: Date.now() }] : others;
}

// An imported backup preserves opinions as earlier names, never as forged account reactions.
export function importedDishLikeNames(dish) {
  return [...new Set([...(dish.likedBy ?? []), ...activeDishLikes(dish).map(like => like.name)].filter(Boolean))];
}
