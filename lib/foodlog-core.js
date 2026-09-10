export const FOODLOG_OWNER_EMAIL = "danielhanna0001@gmail.com";
export const SESSION_EXPIRED_MESSAGE = "Session expired — sign in again";

export function isFoodLogOwner(email) {
  return String(email ?? "").trim().toLowerCase() === FOODLOG_OWNER_EMAIL;
}

export function canManageContribution({
  cloudEnabled = true,
  canEdit = false,
  isOwner = false,
  currentUserId = "",
  contributorUserId = ""
} = {}) {
  if (!cloudEnabled) return true;
  if (!canEdit) return false;
  if (isOwner) return true;
  const viewerId = String(currentUserId ?? "").trim();
  const creatorId = String(contributorUserId ?? "").trim();
  return Boolean(viewerId && creatorId && viewerId === creatorId);
}

export function formatReleaseLabel(release = {}) {
  const channel = String(release.channel ?? "UX Preview").trim() || "UX Preview";
  const buildId = String(release.buildId ?? "unknown").trim().slice(0, 7) || "unknown";
  const date = new Date(release.builtAt ?? "");
  const dateLabel = Number.isNaN(date.getTime())
    ? "unknown"
    : date.toISOString().slice(0, 10).replaceAll("-", ".");
  return `${channel} · ${dateLabel} · ${buildId}`;
}

export function shouldShowOwnerRelease(email, release) {
  return isFoodLogOwner(email) && Boolean(release?.buildId && release?.builtAt);
}

export function isExpiredSessionError(error) {
  const message = [error?.message, error?.code, error?.name]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return [
    "refresh token not found",
    "invalid refresh token",
    "refresh_token_not_found",
    "refresh token has expired"
  ].some((pattern) => message.includes(pattern));
}

export async function recoverExpiredSession(auth, error) {
  if (!isExpiredSessionError(error)) return null;
  try {
    await auth?.signOut?.({ scope: "local" });
  } catch {
    // The stale token may already be unusable. The caller can still reset its UI state.
  }
  return SESSION_EXPIRED_MESSAGE;
}

export function orderReviewsForViewer(reviews = [], viewerEmail = "") {
  const normalizedViewer = String(viewerEmail).trim().toLowerCase();
  return reviews
    .map((review, index) => ({ review, index }))
    .sort((first, second) => {
      const firstIsMine = String(first.review?.email ?? "").toLowerCase() === normalizedViewer;
      const secondIsMine = String(second.review?.email ?? "").toLowerCase() === normalizedViewer;
      if (firstIsMine !== secondIsMine) return firstIsMine ? -1 : 1;
      const timeDifference = Number(second.review?.updatedAt ?? 0) - Number(first.review?.updatedAt ?? 0);
      return timeDifference || first.index - second.index;
    })
    .map(({ review }) => review);
}

export function dishReviewDraftKey(dishId, email) {
  return `foodlog-dish-review-draft-v1:${String(email ?? "you").trim().toLowerCase()}:${String(dishId ?? "")}`;
}

export function parseDishReviewDraft(value) {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const rating = parsed.rating === null || parsed.rating === "none"
      ? null
      : Number(parsed.rating);
    if (rating !== null && (!Number.isFinite(rating) || rating < 0.5 || rating > 5)) return null;
    return {
      rating,
      notes: String(parsed.notes ?? ""),
      savedAt: String(parsed.savedAt ?? ""),
      sourceUpdatedAt: parsed.sourceUpdatedAt ?? null
    };
  } catch {
    return null;
  }
}

export function isActiveRecord(record) {
  return !record?.deletedAt && !record?.deleted_at;
}

export function activeRecords(records = []) {
  return records.filter(isActiveRecord);
}

export function trashRecord(record, actor, now = new Date().toISOString()) {
  if (!record) throw new Error("Choose an item to move to Trash.");
  if (!String(actor ?? "").trim()) throw new Error("A signed-in editor is required.");
  if (!isActiveRecord(record)) return { ...record };
  return {
    ...record,
    deletedAt: now,
    deletedBy: String(actor).trim().toLowerCase()
  };
}

export function restoreRecord(record) {
  if (!record) throw new Error("Choose an item to restore.");
  return {
    ...record,
    deletedAt: null,
    deletedBy: null
  };
}

export function normalizeRestaurantKey(restaurant) {
  return [restaurant?.name, restaurant?.location]
    .map((value) => String(value ?? "").trim().toLocaleLowerCase())
    .join("::");
}

export function findRestaurantDuplicates(incoming = [], existing = []) {
  const existingKeys = new Set(existing.map(normalizeRestaurantKey));
  const seen = new Set();
  const duplicates = [];

  incoming.forEach((restaurant, index) => {
    const key = normalizeRestaurantKey(restaurant);
    if (!key || key === "::") return;
    if (existingKeys.has(key) || seen.has(key)) {
      duplicates.push({
        index,
        name: String(restaurant?.name ?? "").trim(),
        location: String(restaurant?.location ?? "").trim(),
        key
      });
    }
    seen.add(key);
  });

  return duplicates;
}

const RESTAURANT_NAME_FILLER_WORDS = new Set([
  "and",
  "bar",
  "cafe",
  "coffee",
  "kitchen",
  "restaurant",
  "restaurants",
  "the"
]);

function normalizeComparableText(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeRestaurantName(value) {
  const normalized = normalizeComparableText(value);
  const tokens = normalized.split(" ").filter(Boolean);
  const meaningful = tokens.filter((token) => !RESTAURANT_NAME_FILLER_WORDS.has(token));
  return (meaningful.length ? meaningful : tokens).join(" ");
}

function compactComparableText(value) {
  return normalizeComparableText(value).replace(/\s+/g, "");
}

function levenshteinSimilarity(first, second) {
  if (first === second) return 1;
  if (!first || !second) return 0;
  const previous = Array.from({ length: second.length + 1 }, (_, index) => index);

  for (let firstIndex = 1; firstIndex <= first.length; firstIndex += 1) {
    let diagonal = previous[0];
    previous[0] = firstIndex;
    for (let secondIndex = 1; secondIndex <= second.length; secondIndex += 1) {
      const above = previous[secondIndex];
      const cost = first[firstIndex - 1] === second[secondIndex - 1] ? 0 : 1;
      previous[secondIndex] = Math.min(
        previous[secondIndex] + 1,
        previous[secondIndex - 1] + 1,
        diagonal + cost
      );
      diagonal = above;
    }
  }

  return 1 - previous[second.length] / Math.max(first.length, second.length);
}

function bigramDiceSimilarity(first, second) {
  if (first === second) return 1;
  if (first.length < 2 || second.length < 2) return 0;
  const counts = new Map();
  for (let index = 0; index < first.length - 1; index += 1) {
    const gram = first.slice(index, index + 2);
    counts.set(gram, (counts.get(gram) ?? 0) + 1);
  }
  let overlap = 0;
  for (let index = 0; index < second.length - 1; index += 1) {
    const gram = second.slice(index, index + 2);
    const available = counts.get(gram) ?? 0;
    if (available > 0) {
      overlap += 1;
      counts.set(gram, available - 1);
    }
  }
  return (2 * overlap) / (first.length + second.length - 2);
}

function tokenSimilarity(first, second) {
  const firstTokens = new Set(first.split(" ").filter(Boolean));
  const secondTokens = new Set(second.split(" ").filter(Boolean));
  if (!firstTokens.size || !secondTokens.size) return 0;
  const overlap = [...firstTokens].filter((token) => secondTokens.has(token)).length;
  return overlap / new Set([...firstTokens, ...secondTokens]).size;
}

export function restaurantNameSimilarity(first, second) {
  const normalizedFirst = normalizeRestaurantName(first);
  const normalizedSecond = normalizeRestaurantName(second);
  const compactFirst = compactComparableText(normalizedFirst);
  const compactSecond = compactComparableText(normalizedSecond);
  if (!compactFirst || !compactSecond) return 0;
  if (compactFirst === compactSecond) return 1;
  if (Math.min(compactFirst.length, compactSecond.length) < 4) return 0;
  return Math.max(
    levenshteinSimilarity(compactFirst, compactSecond),
    bigramDiceSimilarity(compactFirst, compactSecond),
    tokenSimilarity(normalizedFirst, normalizedSecond)
  );
}

export function findSimilarRestaurants(
  candidate,
  existing = [],
  { excludeId = null, limit = 3 } = {}
) {
  const candidateName = normalizeRestaurantName(candidate?.name);
  const candidateCompact = compactComparableText(candidateName);
  const candidateLocation = normalizeComparableText(candidate?.location);
  if (!candidateCompact) return [];

  return activeRecords(existing)
    .filter((restaurant) => restaurant?.id !== excludeId)
    .map((restaurant) => {
      const existingName = normalizeRestaurantName(restaurant?.name);
      const existingCompact = compactComparableText(existingName);
      const nameSimilarity = restaurantNameSimilarity(candidateName, existingName);
      const existingLocation = normalizeComparableText(restaurant?.location);
      const locationSimilarity = candidateLocation && existingLocation
        ? levenshteinSimilarity(candidateLocation, existingLocation)
        : 0;
      const exactName = candidateCompact === existingCompact;
      const sameLocation = Boolean(candidateLocation && candidateLocation === existingLocation);
      const score = nameSimilarity * 0.84 + locationSimilarity * 0.16;
      const isSimilar =
        exactName ||
        nameSimilarity >= 0.86 ||
        (nameSimilarity >= 0.74 && locationSimilarity >= 0.72);
      return {
        restaurant,
        score,
        nameSimilarity,
        locationSimilarity,
        exactName,
        sameLocation,
        isSimilar
      };
    })
    .filter((match) => match.isSimilar)
    .sort((first, second) =>
      Number(second.exactName) - Number(first.exactName) ||
      Number(second.sameLocation) - Number(first.sameLocation) ||
      second.score - first.score ||
      String(first.restaurant?.name ?? "").localeCompare(String(second.restaurant?.name ?? ""))
    )
    .slice(0, limit);
}

export function restaurantNeedsDetails(restaurant) {
  return !String(restaurant?.location ?? "").trim() || !String(restaurant?.cuisine ?? "").trim();
}

export function restaurantVisitStatus(restaurant) {
  const hasRatings = activeRecords(restaurant?.ratings).length > 0;
  const hasVisitedBy = (Array.isArray(restaurant?.visited) ? restaurant.visited : []).some((name) =>
    String(name ?? "").trim()
  );
  const hasDishes = activeRecords(restaurant?.dishes).length > 0;
  return hasRatings || hasVisitedBy || hasDishes ? "been" : "want";
}

export function normalizeDishName(value) {
  return normalizeComparableText(value);
}

export function dishNameSimilarity(first, second) {
  const normalizedFirst = normalizeDishName(first);
  const normalizedSecond = normalizeDishName(second);
  const compactFirst = compactComparableText(normalizedFirst);
  const compactSecond = compactComparableText(normalizedSecond);
  if (!compactFirst || !compactSecond) return 0;
  if (compactFirst === compactSecond) return 1;
  // Very short dish names such as "Pie" and "Pho" should not be treated as
  // likely duplicates solely because one letter happens to match.
  if (Math.min(compactFirst.length, compactSecond.length) < 4) return 0;
  return Math.max(
    levenshteinSimilarity(compactFirst, compactSecond),
    bigramDiceSimilarity(compactFirst, compactSecond),
    tokenSimilarity(normalizedFirst, normalizedSecond)
  );
}

export function findSimilarDishes(
  candidateName,
  dishes = [],
  { excludeId = null, limit = 3 } = {}
) {
  const normalizedCandidate = normalizeDishName(candidateName);
  if (!normalizedCandidate) return [];

  return activeRecords(dishes)
    .filter((dish) => dish?.id !== excludeId)
    .map((dish) => {
      const similarity = dishNameSimilarity(normalizedCandidate, dish?.name);
      return {
        dish,
        similarity,
        exactName: normalizeDishName(dish?.name) === normalizedCandidate,
        isSimilar: similarity >= 0.82
      };
    })
    .filter((match) => match.isSimilar)
    .sort((first, second) =>
      Number(second.exactName) - Number(first.exactName) ||
      second.similarity - first.similarity ||
      String(first.dish?.name ?? "").localeCompare(String(second.dish?.name ?? ""))
    )
    .slice(0, limit);
}

const GOOGLE_MAPS_HOSTS = new Set([
  "google.com",
  "www.google.com",
  "maps.google.com",
  "maps.app.goo.gl",
  "goo.gl"
]);

export function isAllowedGoogleMapsUrl(value) {
  if (!value || String(value).length > 2048) return false;
  try {
    const url = new URL(String(value));
    if (url.protocol !== "https:") return false;
    if (!GOOGLE_MAPS_HOSTS.has(url.hostname.toLowerCase())) return false;
    return url.hostname.toLowerCase().includes("goo.gl") || url.pathname.startsWith("/maps");
  } catch {
    return false;
  }
}

export function parseGoogleMapsUrl(value) {
  if (!isAllowedGoogleMapsUrl(value)) return null;
  const url = new URL(String(value));
  const placeMatch = url.pathname.match(/\/maps\/place\/([^/]+)/i);
  const atMatch = url.pathname.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  const coordinateMatch = (url.searchParams.get("q") ?? "").match(
    /^(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)$/
  );
  const rawName = placeMatch?.[1] ?? url.searchParams.get("query") ?? "";
  let placeName = "";
  try {
    placeName = decodeURIComponent(rawName.replace(/\+/g, " ")).trim();
  } catch {
    placeName = rawName.replace(/\+/g, " ").trim();
  }

  return {
    finalUrl: url.toString(),
    ...(placeName ? { placeName } : {}),
    ...(url.searchParams.get("query_place_id")
      ? { placeId: url.searchParams.get("query_place_id") }
      : {}),
    ...(atMatch || coordinateMatch
      ? {
          latitude: Number((atMatch ?? coordinateMatch)[1]),
          longitude: Number((atMatch ?? coordinateMatch)[2])
        }
      : {}),
    source: url.hostname.includes("goo.gl") ? "google-short-link" : "google-maps-url"
  };
}

export function applyGoogleMapsDetails(fields = {}, result = {}) {
  const next = {
    ...fields,
    name: String(fields.name ?? "").trim() ? fields.name : result.placeName ?? fields.name ?? "",
    maps: result.finalUrl ?? fields.maps ?? ""
  };
  if (!String(fields.location ?? "").trim() && result.location) {
    next.location = result.location;
  }
  return next;
}

export function mergePendingRestaurants(local = [], remote = []) {
  const remoteIds = new Set(remote.map((restaurant) => restaurant?.id).filter(Boolean));
  const pending = local
    .filter((restaurant) => {
      if (!restaurant?.id || !isActiveRecord(restaurant)) return false;
      if (restaurant.pendingSync) return true;
      return !remoteIds.has(restaurant.id) &&
        !Object.prototype.hasOwnProperty.call(restaurant, "updatedBy");
    })
    .map((restaurant) => ({
      ...restaurant,
      pendingSync: true,
      pendingSyncMode: restaurant.pendingSyncMode === "edit" ? "edit" : "create"
    }));
  const pendingIds = new Set(pending.map((restaurant) => restaurant.id));
  const reconciledRemote = remote
    .filter((restaurant) => !pendingIds.has(restaurant.id))
    .map((restaurant) => {
      const localRestaurant = local.find((candidate) => candidate?.id === restaurant.id);
      const pendingDishes = (localRestaurant?.dishes ?? []).filter((dish) => dish?.pendingSync);
      if (!pendingDishes.length) return restaurant;
      const pendingDishIds = new Set(pendingDishes.map((dish) => dish.id));
      return {
        ...restaurant,
        dishes: [
          ...pendingDishes,
          ...(restaurant.dishes ?? []).filter((dish) => !pendingDishIds.has(dish.id))
        ]
      };
    });
  return {
    restaurants: [...pending, ...reconciledRemote],
    pending
  };
}

function validateRating(value, path, errors) {
  if (value === null || value === undefined || value === "") return;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 5) {
    errors.push(`${path} must be between 0 and 5.`);
  }
}

export function validateImportPayload(payload) {
  const errors = [];
  if (!Array.isArray(payload)) {
    return { valid: false, errors: ["The import must contain an array of restaurants."] };
  }

  payload.forEach((restaurant, restaurantIndex) => {
    const path = `Restaurant ${restaurantIndex + 1}`;
    if (!restaurant || typeof restaurant !== "object" || Array.isArray(restaurant)) {
      errors.push(`${path} must be an object.`);
      return;
    }
    if (!String(restaurant.name ?? "").trim()) errors.push(`${path} needs a name.`);
    if (restaurant.dishes !== undefined && !Array.isArray(restaurant.dishes)) {
      errors.push(`${path}.dishes must be an array.`);
    }
    if (restaurant.photos !== undefined && !Array.isArray(restaurant.photos)) {
      errors.push(`${path}.photos must be an array.`);
    }
    const restaurantRatings = Array.isArray(restaurant.ratings) ? restaurant.ratings : [];
    const dishes = Array.isArray(restaurant.dishes) ? restaurant.dishes : [];
    restaurantRatings.forEach((rating, ratingIndex) => {
      validateRating(rating?.rating, `${path} rating ${ratingIndex + 1}`, errors);
    });
    dishes.forEach((dish, dishIndex) => {
      if (dish?.photos !== undefined && !Array.isArray(dish.photos)) {
        errors.push(`${path}, dish ${dishIndex + 1}.photos must be an array.`);
      }
      if (!String(dish?.name ?? "").trim()) {
        errors.push(`${path}, dish ${dishIndex + 1} needs a name.`);
      }
      validateRating(dish?.rating, `${path}, dish ${dishIndex + 1} rating`, errors);
      const ratings = Array.isArray(dish?.ratings) ? dish.ratings : [];
      ratings.forEach((rating, ratingIndex) => {
        validateRating(
          rating?.rating,
          `${path}, dish ${dishIndex + 1}, rating ${ratingIndex + 1}`,
          errors
        );
      });
    });
  });

  return { valid: errors.length === 0, errors };
}

export function createSubmissionGate() {
  const active = new Set();
  return {
    isActive(key) {
      return active.has(key);
    },
    async run(key, task) {
      if (active.has(key)) return { accepted: false, value: undefined };
      active.add(key);
      try {
        return { accepted: true, value: await task() };
      } finally {
        active.delete(key);
      }
    }
  };
}

export function createTrailingRefreshQueue(refresh) {
  let running = false;
  let trailing = false;
  return {
    get running() {
      return running;
    },
    request() {
      if (running) {
        trailing = true;
        return;
      }
      running = true;
      void (async () => {
        try {
          do {
            trailing = false;
            await refresh();
          } while (trailing);
        } finally {
          running = false;
        }
      })();
    }
  };
}

export function createDebouncedIdRefresh(refresh, { delay = 400 } = {}) {
  const ids = new Set();
  let timer = null;
  const queue = createTrailingRefreshQueue(async () => {
    const batch = ids.has("*") ? null : [...ids];
    ids.clear();
    await refresh(batch);
  });
  return {
    enqueue(id) {
      if (!id) ids.add("*");
      else if (!ids.has("*")) ids.add(id);
      clearTimeout(timer);
      timer = setTimeout(() => queue.request(), delay);
    },
    requestAll() {
      ids.add("*");
      clearTimeout(timer);
      queue.request();
    }
  };
}

export function restaurantIdFromRealtimeChange(table, payload = {}, restaurants = []) {
  const row = payload?.new ?? payload.old ?? {};
  if (table === "restaurants") return row.id || null;
  if (["dishes", "restaurant_photos", "restaurant_ratings", "restaurant_want_to_go"].includes(table)) {
    return row.restaurant_id || null;
  }
  const dishId = row.dish_id;
  if (!dishId) return null;
  return restaurants.find((restaurant) => (restaurant.dishes ?? []).some((dish) => dish.id === dishId))?.id ?? null;
}

export async function runCompensated(prepare, commit, cleanup) {
  const prepared = await prepare();
  try {
    return await commit(prepared);
  } catch (error) {
    await cleanup(prepared);
    throw error;
  }
}
