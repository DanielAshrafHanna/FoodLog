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

export function browseSnapshot(state = {}, extra = {}) {
  return {
    foodlog: true,
    selectedId: state.selectedId ?? null,
    activeSurface: ["places", "map", "pick"].includes(state.activeSurface) ? state.activeSurface : "places",
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
