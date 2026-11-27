const DISMISS_SETTLE_MS = 220;
const DISMISS_OMEGA = (2 * Math.PI) / 0.28;
const AXIS_LOCK_PX = 8;

function prefersReducedMotion(win = globalThis) {
  try {
    return Boolean(win.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
  } catch {
    return false;
  }
}

export function springStep(start, target, velocity, seconds) {
  const displacement = start - target;
  const slope = velocity + DISMISS_OMEGA * displacement;
  const decay = Math.exp(-DISMISS_OMEGA * seconds);
  return {
    position: target + (displacement + slope * seconds) * decay,
    velocity: (velocity - DISMISS_OMEGA * slope * seconds) * decay
  };
}

export function sheetSwipeShouldDismiss(offset, velocity, height) {
  if (velocity < -250) return false;
  const threshold = Math.min(130, Math.max(72, (Number(height) || 360) * 0.25));
  return offset >= threshold || (offset >= 32 && velocity >= 650);
}

// Interruptible swipe-down dismissal bound strictly to a sheet's grab handle/header.
// Leaves scrollable sheet bodies (results, filters, playlists) completely native.
export function bindSheetSwipe(
  dialog,
  {
    handleSelector = ".sheet-handle, .sheet-header, .capture-choice-heading",
    surfaceSelector = ".sheet-card",
    enabled = () => true,
    onDismiss = () => dialog?.close()
  } = {}
) {
  if (!dialog) return () => {};
  const view = dialog.ownerDocument?.defaultView ?? window;
  const getSurface = () => (surfaceSelector ? dialog.querySelector(surfaceSelector) : dialog) || dialog;

  let gesture = null;
  let offset = 0;
  let settleMotion = null;
  let dismissing = false;

  function applyOffset(value) {
    const surface = getSurface();
    offset = Math.max(0, value);
    if (offset > 0) {
      surface.style.transform = `translateY(${offset}px)`;
      surface.classList.add("is-sheet-swiping");
    } else {
      surface.style.removeProperty("transform");
      surface.classList.remove("is-sheet-swiping");
    }
  }

  function interruptSettle() {
    if (!settleMotion) return 0;
    const motion = settleMotion;
    const surface = getSurface();
    const elapsed = Number(motion.animation.currentTime ?? 0) / 1000;
    const point = springStep(motion.start, motion.target, motion.velocity, elapsed);
    settleMotion = null;
    dismissing = false;
    const matrix = view.getComputedStyle?.(surface)?.transform;
    const liveOffset = view.DOMMatrixReadOnly && matrix && matrix !== "none"
      ? new view.DOMMatrixReadOnly(matrix).m42
      : point.position;
    motion.animation.cancel();
    applyOffset(liveOffset);
    return point.velocity;
  }

  function reset() {
    interruptSettle();
    gesture = null;
    dismissing = false;
    applyOffset(0);
  }

  function finishDismiss() {
    if (dismissing) return;
    dismissing = true;
    gesture = null;
    applyOffset(0);
    if (dialog.open) onDismiss();
    dismissing = false;
  }

  function settle(close, velocity = 0) {
    interruptSettle();
    const surface = getSurface();
    const height = Math.max(surface.getBoundingClientRect?.().height || surface.clientHeight || 360, 120);
    const start = offset;
    const target = close ? height + 48 : 0;

    if (prefersReducedMotion(view) || typeof surface.animate !== "function" || (start === 0 && !close)) {
      if (close) finishDismiss();
      else reset();
      return;
    }

    const frames = Array.from({ length: 17 }, (_, index) => {
      const progress = index / 16;
      const pos = index === 16 ? target : springStep(start, target, velocity, (progress * DISMISS_SETTLE_MS) / 1000).position;
      return { transform: `translateY(${Math.max(0, pos)}px)`, offset: progress };
    });

    const animation = surface.animate(frames, {
      duration: DISMISS_SETTLE_MS,
      easing: "linear",
      fill: "forwards"
    });
    settleMotion = { animation, start, target, velocity };
    animation.finished
      .then(() => {
        if (settleMotion?.animation !== animation) return;
        settleMotion = null;
        animation.cancel();
        if (close) finishDismiss();
        else reset();
      })
      .catch(() => {});
  }

  function releaseCapture(target, pointerId) {
    try {
      if (target?.hasPointerCapture?.(pointerId)) target.releasePointerCapture(pointerId);
    } catch {
      // Browser may already have released pointer capture.
    }
  }

  function acquireCapture(target, pointerId) {
    try {
      target?.setPointerCapture?.(pointerId);
    } catch {
      // Synthetic events may reject pointer capture.
    }
  }

  function onPointerDown(event) {
    if (!dialog.open || gesture || !enabled()) return;
    if (event.button !== 0 || event.isPrimary === false) return;
    const handle = event.target?.closest?.(handleSelector);
    if (!handle) return;
    if (event.target.closest("button, a, input, select, textarea, label, [role='button']")) return;

    const carriedVelocity = interruptSettle();
    const now = performance.now();
    gesture = {
      pointerId: event.pointerId,
      handle,
      startX: event.clientX,
      startY: event.clientY,
      baseY: offset,
      axis: offset > 0 ? "vertical" : null,
      velocity: carriedVelocity,
      samples: [{ position: offset, time: now }]
    };
    if (gesture.axis === "vertical") acquireCapture(handle, event.pointerId);
  }

  function onPointerMove(event) {
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;
    if (!gesture.axis) {
      if (Math.hypot(dx, dy) < AXIS_LOCK_PX) return;
      gesture.axis = Math.abs(dy) >= Math.abs(dx) * 1.1 ? "vertical" : "horizontal";
      if (gesture.axis !== "vertical") {
        releaseCapture(gesture.handle, event.pointerId);
        gesture = null;
        if (offset > 0) settle(false, 0);
        return;
      }
      acquireCapture(gesture.handle, event.pointerId);
    }
    if (event.cancelable) event.preventDefault();
    applyOffset(gesture.baseY + dy);
    gesture.samples.push({ position: offset, time: performance.now() });
    if (gesture.samples.length > 10) gesture.samples.shift();
  }

  function computeVelocity(activeGesture, now) {
    activeGesture.samples.push({ position: offset, time: now });
    const recent = activeGesture.samples.filter((sample) => now - sample.time <= 80);
    const first = recent[0];
    const last = recent.at(-1);
    const origin = last && first && last.time > first.time ? first : activeGesture.samples.at(-2);
    if (origin && last && last.position !== origin.position) {
      return Math.max(-3000, Math.min(3000, ((last.position - origin.position) * 1000) / Math.max(1, last.time - origin.time)));
    }
    return origin && last && last.time > origin.time ? 0 : activeGesture.velocity;
  }

  function onPointerUp(event) {
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    const activeGesture = gesture;
    gesture = null;
    releaseCapture(activeGesture.handle, event.pointerId);
    if (activeGesture.axis !== "vertical" && offset === 0) return;

    const dy = event.clientY - activeGesture.startY;
    applyOffset(activeGesture.baseY + dy);
    const velocity = computeVelocity(activeGesture, performance.now());
    const surface = getSurface();
    const height = surface.getBoundingClientRect?.().height || surface.clientHeight || 360;
    const shouldClose = sheetSwipeShouldDismiss(offset, velocity, height);
    settle(shouldClose, velocity);
  }

  function onPointerCancel(event) {
    if (!gesture || (event?.pointerId !== undefined && event.pointerId !== gesture.pointerId)) return;
    const { handle, pointerId } = gesture;
    gesture = null;
    releaseCapture(handle, pointerId);
    if (offset > 0) settle(false, 0);
  }

  function onLostPointerCapture(event) {
    if (gesture && event.pointerId === gesture.pointerId) onPointerCancel(event);
  }

  function onClose() {
    reset();
  }

  dialog.addEventListener("pointerdown", onPointerDown);
  dialog.addEventListener("pointermove", onPointerMove, { passive: false });
  dialog.addEventListener("pointerup", onPointerUp);
  dialog.addEventListener("pointercancel", onPointerCancel);
  dialog.addEventListener("lostpointercapture", onLostPointerCapture);
  dialog.addEventListener("close", onClose);

  return () => {
    reset();
    dialog.removeEventListener("pointerdown", onPointerDown);
    dialog.removeEventListener("pointermove", onPointerMove);
    dialog.removeEventListener("pointerup", onPointerUp);
    dialog.removeEventListener("pointercancel", onPointerCancel);
    dialog.removeEventListener("lostpointercapture", onLostPointerCapture);
    dialog.removeEventListener("close", onClose);
  };
}
