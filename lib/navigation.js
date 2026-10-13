export function hasOAuthParams(url = typeof window !== "undefined" ? window.location.href : "") {
  try {
    const parsed = new URL(url, "https://food.danyhanna.uk");
    const hash = parsed.hash.replace(/^#/, "");
    return Boolean(
      parsed.searchParams.get("code") ||
      parsed.searchParams.get("error") ||
      parsed.searchParams.get("error_description") ||
      hash.includes("code=") ||
      hash.includes("error=") ||
      hash.includes("access_token")
    );
  } catch {
    return false;
  }
}

export function browseQueryValues({
  search = "",
  location = "all",
  cuisine = "all",
  price = "all",
  rating = "0",
  playlist = "all",
  visit = "all",
  wantToGo = false,
  sort = "recent",
  view = "places",
  place = ""
} = {}) {
  return {
    q: String(search ?? "").trim(),
    location: location === "all" ? "" : location,
    cuisine: cuisine === "all" ? "" : cuisine,
    price: price === "all" ? "" : price,
    rating: rating === "0" ? "" : rating,
    playlist: playlist === "all" ? "" : playlist,
    visit: visit === "all" ? "" : visit,
    wantgo: wantToGo ? "1" : "",
    sort: sort === "recent" ? "" : sort,
    view: view === "places" ? "" : view,
    place: place ?? ""
  };
}

export function writeBrowseQuery(href, values) {
  const url = new URL(href, "https://food.danyhanna.uk");
  if (hasOAuthParams(url.href)) return url.pathname + url.search + url.hash;
  Object.entries(values).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
  });
  return url.pathname + url.search + url.hash;
}

export function browseSnapshot(state = {}, extra = {}) {
  return {
    foodlog: true,
    selectedId: state.selectedId ?? null,
    activeSurface: state.activeSurface === "map" ? "map" : "places",
    mobileDetailOpen: Boolean(state.mobileDetailOpen),
    listScrollY: Number(extra.listScrollY ?? 0) || 0
  };
}

export function snapshotsEqual(left, right) {
  if (!left || !right) return false;
  return left.selectedId === right.selectedId
    && left.activeSurface === right.activeSurface
    && Boolean(left.mobileDetailOpen) === Boolean(right.mobileDetailOpen);
}

export function shouldPushPlaceOpen(previous, next) {
  return Boolean(next?.mobileDetailOpen) && !previous?.mobileDetailOpen;
}

export function shouldPushSurface(previous, next) {
  return Boolean(previous?.activeSurface && next?.activeSurface && previous.activeSurface !== next.activeSurface);
}

export function shouldPushBrowseSnapshot(previous, next, { push = false } = {}) {
  return !snapshotsEqual(previous, next) && (
    Boolean(push)
    || shouldPushPlaceOpen(previous, next)
    || shouldPushSurface(previous, next)
  );
}

// All deferred navigation work belongs to an intent. A newer intent cancels
// earlier timers/frames without forcing the drawer back to an animation origin.
export function createNavigationController({ captureView = () => {}, cancelPending = () => {} } = {}) {
  let generation = 0;
  const invalidate = () => {
    generation += 1;
    cancelPending();
    return generation;
  };
  return {
    begin() { captureView(); return invalidate(); },
    invalidate,
    current: () => generation,
    isCurrent: intent => intent === generation,
    guard: (intent, callback) => (...args) => intent === generation ? callback(...args) : undefined
  };
}

export function resolveBrowseSelection({ selectedId, visible, all, preserveSelected = false, emptyPlaylist = false }) {
  if ((preserveSelected && all.some(item => item.id === selectedId)) || visible.some(item => item.id === selectedId)) return selectedId;
  return visible[0]?.id ?? (emptyPlaylist ? null : all[0]?.id ?? null);
}

export function compareBrowseRestaurants(a, b, sort, rating) {
  const primary = sort === 'rating' ? (rating(b) ?? -1) - (rating(a) ?? -1)
    : sort === 'name' ? a.name.localeCompare(b.name) : Number(b.updatedAt) - Number(a.updatedAt);
  return primary || String(a.id).localeCompare(String(b.id));
}

// Keep already presented rows in place while their data stays fresh. New matches
// append; removed matches disappear. A deliberate browse action accepts sorting.
export function createBrowseOrder() {
  let ids = [], query, accept = false;
  return {
    accept() { accept = true; },
    present(sorted, nextQuery) {
      const byId = new Map(sorted.map(item => [item.id, item]));
      if (accept || query !== nextQuery) ids = sorted.map(item => item.id);
      else ids = [...ids.filter(id => byId.has(id)), ...sorted.map(item => item.id).filter(id => !ids.includes(id))];
      query = nextQuery; accept = false;
      return { items: ids.map(id => byId.get(id)), pending: ids.some((id, index) => id !== sorted[index]?.id) };
    }
  };
}

export const DETAIL_UNDERLAY_PARALLAX_PERCENT = 8;
export const DETAIL_UNDERLAY_REST_OPACITY = 0.28;
export const DETAIL_UNDERLAY_REST_SCRIM = 0.74;

export function detailSwipeProgress(deltaX, width) {
  const size = Number(width);
  if (!Number.isFinite(size) || size <= 0) return 0;
  const delta = Number(deltaX);
  if (!Number.isFinite(delta) || delta <= 0) return 0;
  return Math.min(delta / size, 1);
}

export function detailOffscreenX(width) {
  const size = Number(width);
  if (!Number.isFinite(size) || size <= 0) return 0;
  return size + 24;
}

export function detailUnderlayPresentation(progress) {
  const amount = Math.min(Math.max(Number(progress) || 0, 0), 1);
  return {
    xPercent: (amount - 1) * DETAIL_UNDERLAY_PARALLAX_PERCENT,
    opacity: DETAIL_UNDERLAY_REST_OPACITY + amount * (1 - DETAIL_UNDERLAY_REST_OPACITY),
    scrimOpacity: DETAIL_UNDERLAY_REST_SCRIM * (1 - amount)
  };
}

export function recentSwipeVelocity(samples, now, windowMs = 100) {
  const endTime = Number(now);
  const points = (Array.isArray(samples) ? samples : [])
    .map((sample) => ({ x: Number(sample?.x), time: Number(sample?.time) }))
    .filter((sample) => Number.isFinite(sample.x) && Number.isFinite(sample.time) && sample.time <= endTime);
  if (!Number.isFinite(endTime) || points.length < 2) return 0;
  const recent = points.filter((sample) => sample.time >= endTime - windowMs);
  const start = recent[0] ?? points.at(-2);
  const end = points.at(-1);
  const elapsed = end.time - start.time;
  return elapsed > 0 ? (end.x - start.x) / elapsed : 0;
}

export function prefersReducedMotion(media = globalThis.matchMedia) {
  try {
    return Boolean(media?.("(prefers-reduced-motion: reduce)")?.matches);
  } catch {
    return false;
  }
}

export function canUseViewTransitions() {
  return typeof document !== "undefined"
    && typeof document.startViewTransition === "function"
    && !prefersReducedMotion();
}

export async function paintWithTransition(paint, { transition = false } = {}) {
  if (!transition || !canUseViewTransitions()) {
    await paint();
    return;
  }
  const result = document.startViewTransition(() => paint());
  try {
    await result.finished;
  } catch {
    // The document may have been hidden or the transition aborted.
  }
}
