// Browser pinch-zoom scales the whole UI. Photo gallery pinch is in-app.
// Leaflet pinch scales the map, not the page, so two-finger map zoom stays enabled.
const PINCH_ZOOM_ALLOW = ".gallery-viewport, .leaflet-container";

export function allowsPagePinchZoom(target) {
  return Boolean(target?.closest?.(PINCH_ZOOM_ALLOW));
}

function isPageZoomGesture(event) {
  if (event.type === "wheel") return Boolean(event.ctrlKey || event.metaKey);
  if (event.type === "touchstart" || event.type === "touchmove") {
    return (event.touches?.length ?? 0) >= 2;
  }
  return event.type.startsWith("gesture");
}

export function bindPageZoomLock(root = document) {
  const block = (event) => {
    if (!isPageZoomGesture(event)) return;
    // Ctrl/trackpad wheel would still scale the page if allowed on photos or the map.
    if (event.type !== "wheel" && allowsPagePinchZoom(event.target)) return;
    event.preventDefault();
  };
  const options = { passive: false, capture: true };
  const types = ["gesturestart", "gesturechange", "gestureend", "touchstart", "touchmove", "wheel"];
  for (const type of types) root.addEventListener(type, block, options);
  return () => {
    for (const type of types) root.removeEventListener(type, block, options);
  };
}
