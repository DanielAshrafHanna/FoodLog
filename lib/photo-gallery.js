export function galleryPhotos(item) {
  const photos = (item.photos ?? []).filter(photo => !photo.deletedAt && photo.photo);
  if (item.photo && !(item.photos ?? []).some(photo => photo.photo === item.photo || (item.photoPath && photo.photoPath === item.photoPath))) {
    photos.unshift({ id: 'legacy', photo: item.photo, thumb: item.thumb || '', photoPath: item.photoPath, userId: /^[0-9a-f-]{36}\//i.test(item.photoPath ?? '') ? item.photoPath.split('/')[0] : '', contributorName: 'Contributor unknown' });
  }
  return photos.filter(photo => !(item.photoRemovals ?? []).some(removal => removal.photoPath === (photo.photoPath || photo.photo))).sort((a,b) => Number(b.id === item.coverPhotoId) - Number(a.id === item.coverPhotoId));
}

export function photoAttribution(photo, { compact = false } = {}) {
  const contributor = String(photo?.contributorName ?? '').trim();
  if (!contributor || contributor === 'Contributor unknown') {
    return compact ? 'Contributor unavailable (legacy)' : 'Legacy photo · Contributor unavailable';
  }
  return `Photo by ${contributor}`;
}

// Keep both the upload path and row ID stable when retrying a lost response.
export async function commitQueuedPhoto(pending, { upload, insert, find }) {
  // A reserved path is not proof that Storage received the file. Older queued
  // records can contain a path even when the upload failed before sending bytes.
  if (!pending.uploaded) {
    if (pending.path) {
      const { data, error } = await find(pending.id);
      if (!error && data?.photo_path === pending.path) return;
    }
    const uploaded = await upload(pending.file, pending);
    if (uploaded && typeof uploaded === "object") {
      pending.path = uploaded.path;
      pending.thumbPath = uploaded.thumbPath ?? pending.thumbPath;
    } else {
      pending.path = uploaded;
    }
    pending.uploaded = true;
  }
  const { error } = await insert(pending.id, pending.path, pending.thumbPath);
  if (!error) return;
  const { data, error: lookupError } = await find(pending.id);
  if (lookupError || data?.photo_path !== pending.path) throw error;
}

// Vertical page scrolling stays native. A clearly horizontal finger swipe still pages photos.
const CAROUSEL_AXIS_PX = 10;

function bindDishCarouselTouch(track) {
  if (track.dataset.carouselTouchReady === "1" || track.children.length < 2) return;
  track.dataset.carouselTouchReady = "1";
  let axis = null;
  let startX = 0;
  let startY = 0;
  let startScroll = 0;
  const snap = () => {
    if (axis !== "horizontal") {
      axis = null;
      return;
    }
    const width = Math.max(track.clientWidth, 1);
    const index = Math.max(0, Math.min(track.children.length - 1, Math.round(track.scrollLeft / width)));
    track.scrollTo({ left: index * width, behavior: "instant" });
    axis = null;
  };
  track.addEventListener("touchstart", (event) => {
    const touch = event.touches[0];
    if (!touch) return;
    axis = null;
    startX = touch.clientX;
    startY = touch.clientY;
    startScroll = track.scrollLeft;
  }, { passive: true });
  track.addEventListener("touchmove", (event) => {
    const touch = event.touches[0];
    if (!touch) return;
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;
    if (!axis) {
      if (Math.hypot(dx, dy) < CAROUSEL_AXIS_PX) return;
      axis = Math.abs(dx) > Math.abs(dy) * 1.15 ? "horizontal" : "vertical";
    }
    if (axis !== "horizontal") return;
    if (event.cancelable) event.preventDefault();
    track.scrollLeft = startScroll - dx;
  }, { passive: false });
  track.addEventListener("touchend", snap, { passive: true });
  track.addEventListener("touchcancel", snap, { passive: true });
}

const mountedDishCarousels = new WeakSet();

export function mountDishCarousels(root) {
  // Read every new track before any label/disabled writes. Interleaving these
  // operations forces one layout per carousel on long restaurant details.
  const mounts = [...root.querySelectorAll('.dish-carousel')].filter(carousel => !mountedDishCarousels.has(carousel)).map(carousel => {
    const track = carousel.querySelector('.dish-photo-track');
    const position = carousel.querySelector('[data-photo-position]');
    const previous = carousel.querySelector('[data-action="dish-photo-prev"]');
    const next = carousel.querySelector('[data-action="dish-photo-next"]');
    if (!track || !position || !previous || !next) return null;
    return { carousel, track, position, previous, next, initialIndex: Math.round(track.scrollLeft / Math.max(track.clientWidth, 1)) };
  }).filter(Boolean);
  for (const { carousel, track, position, previous, next, initialIndex } of mounts) {
    mountedDishCarousels.add(carousel);
    const current = () => Math.round(track.scrollLeft / Math.max(track.clientWidth, 1));
    const update = (index = current()) => {
      const label = `${index + 1} / ${track.children.length}`;
      if (position.textContent !== label) position.textContent = label;
      if (previous.disabled !== (index === 0)) previous.disabled = index === 0;
      if (next.disabled !== (index === track.children.length - 1)) next.disabled = index === track.children.length - 1;
    };
    track.onscroll = () => update();
    const move = delta => track.scrollTo({left: (current() + delta) * track.clientWidth, behavior: 'instant'});
    previous.onclick = () => move(-1);
    next.onclick = () => move(1);
    bindDishCarouselTouch(track);
    track.onkeydown = event => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      const index = Math.max(0, Math.min(track.children.length - 1, current() + (event.key === 'ArrowLeft' ? -1 : 1)));
      track.children[index].focus({preventScroll: true});
      track.scrollTo({left:index * track.clientWidth, behavior:'instant'});
    };
    update(initialIndex);
  }
}

const reducedMotion = () => Boolean(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
const ZOOM_PLUS = 'm20 20-4.2-4.2M8.5 11h5M11 8.5v5';
const ZOOM_MINUS = 'm20 20-4.2-4.2M8.5 11h5';
const DISMISS_PX = 110;
const DISMISS_SETTLE_MS = 280;
const DISMISS_OMEGA = 2 * Math.PI / 0.3; // Critically damped, 0.3s response.
const galleryCleanup = new WeakMap();

function reviewDisclosureVisibility(container) {
  const details = container?.querySelector('[data-single-review]');
  const prose = container?.querySelector('.gallery-review-preview .gallery-review-prose');
  if (!details || !prose || details.open) return;
  const clipped = prose.scrollHeight > prose.clientHeight + 1;
  if (!clipped && details.contains(container.ownerDocument.activeElement)) container.focus({ preventScroll: true });
  details.hidden = !clipped;
}


// Context is read-only dish information, separate from the photo contributor.
// Build with textContent so authored names and prose cannot become markup.
function renderGalleryContext(container, context) {
  if (!container) return;
  container.replaceChildren();
  container.hidden = !context?.reviews?.length;
  if (container.hidden) return;
  const doc = container.ownerDocument;
  const node = (tag, className, text) => {
    const element = doc.createElement(tag);
    element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };
  const heading = node('div', 'gallery-dish-heading');
  const name = node('h3', '', context.name);
  name.id = 'galleryDishTitle';
  const score = node('p', 'gallery-dish-score');
  score.append(node('strong', '', `${context.average} / 5`), node('span', '', `${context.reviews.length} ${context.reviews.length === 1 ? 'rating' : 'ratings'}`));
  heading.append(name, score);
  const article = (entry, preview = false) => {
    const row = node('article', preview ? 'gallery-review-preview' : 'gallery-review');
    const author = node('p', 'gallery-review-author');
    author.append(node('strong', '', entry.name), node('span', '', `${entry.score} / 5`));
    row.append(author);
    if (entry.notes) row.append(node('p', 'gallery-review-prose', entry.notes));
    return row;
  };
  const preview = context.reviews.find(entry => entry.notes) ?? context.reviews[0];
  container.append(heading, article(preview, true));
  if (context.reviews.length > 1 || preview.notes) {
    const details = node('details', 'gallery-reviews-disclosure');
    const summary = node('summary', '', context.reviews.length > 1 ? `Read all reviews (${context.reviews.length})` : 'Read full review');
    details.append(summary);
    if (context.reviews.length === 1) { details.dataset.singleReview = ''; details.hidden = true; }
    details.ontoggle = () => {
      summary.textContent = details.open ? 'Show less' : context.reviews.length > 1 ? `Read all reviews (${context.reviews.length})` : 'Read full review';
      reviewDisclosureVisibility(container);
    };
    const list = node('div', 'gallery-reviews-list');
    for (const entry of context.reviews) list.append(article(entry));
    details.append(list);
    container.append(details);
  }
}

export function mountGallery({ dialog, photos, title, startId, onCover, canCover, coverId, canRemove, onRemove, extraAction, getContext, onClose }) {
  if (!photos.length) return;
  galleryCleanup.get(dialog)?.();
  photos = [...photos];
  let index = Math.max(0, photos.findIndex(photo => photo.id === startId));
  const image = dialog.querySelector('img');
  const shell = dialog.querySelector('.photo-viewer-shell');
  const view = dialog.ownerDocument.defaultView;
  const viewport = dialog.querySelector('.gallery-viewport');
  const caption = dialog.querySelector('[data-gallery-caption]');
  const context = dialog.querySelector('[data-gallery-context]');
  const footer = dialog.querySelector('.photo-viewer-footer');
  const error = dialog.querySelector('[data-gallery-error]');
  const previous = dialog.querySelector('[data-gallery-prev]');
  const next = dialog.querySelector('[data-gallery-next]');
  const cover = dialog.querySelector('[data-gallery-cover]');
  const remove = dialog.querySelector('[data-gallery-remove]');
  const extra = dialog.querySelector('[data-gallery-extra]');
  const zoom = dialog.querySelector('[data-gallery-zoom]');
  const zoomGlyph = zoom.querySelector('[data-zoom-plus]');
  const actions = dialog.querySelector('[data-gallery-actions]');
  const navigation = dialog.querySelector('[data-gallery-navigation]');
  const confirmPanel = dialog.querySelector('[data-gallery-confirm]');
  const confirmCancel = dialog.querySelector('[data-gallery-confirm-cancel]');
  const confirmRemove = dialog.querySelector('[data-gallery-confirm-remove]');
  const controls = [...dialog.querySelectorAll('button')];
  let busy = false, handedOff = false, scale = 1, x = 0, y = 0, gesture = null, lastTap = 0;
  const pointers = new Map();
  let dismissPosition = 0, dismissMotion = null, measureFrame = 0, active = true;
  const scheduleMeasure = () => {
    if (measureFrame) view.cancelAnimationFrame(measureFrame);
    measureFrame = view.requestAnimationFrame(() => {
      measureFrame = 0;
      if (active && dialog.open) reviewDisclosureVisibility(context);
    });
  };
  const observer = typeof view.ResizeObserver === 'function' ? new view.ResizeObserver(scheduleMeasure) : null;
  if (context) observer?.observe(context);
  view.addEventListener('resize', scheduleMeasure);
  dialog.ownerDocument.fonts?.addEventListener('loadingdone', scheduleMeasure);
  dialog.ownerDocument.fonts?.ready.then(() => { if (active) scheduleMeasure(); });
  function springPoint(start, target, velocity, seconds) {
    const displacement = start - target, slope = velocity + DISMISS_OMEGA * displacement;
    const decay = Math.exp(-DISMISS_OMEGA * seconds);
    return { position: target + (displacement + slope * seconds) * decay,
      velocity: (velocity - DISMISS_OMEGA * slope * seconds) * decay };
  }
  function setDismissProgress(position) {
    dismissPosition = Math.max(0, position);
    shell.style.transform = `translateY(${dismissPosition}px)`;
    shell.classList.toggle('is-dismissing', dismissPosition > 0);
  }
  function interruptDismiss() {
    if (!dismissMotion) return 0;
    const motion = dismissMotion;
    const point = springPoint(motion.start, motion.target, motion.velocity, Number(motion.animation.currentTime ?? 0) / 1000);
    dismissMotion = null;
    // Read the presentation transform before cancelling, avoiding a jump on re-grab.
    const matrix = view.getComputedStyle(shell).transform;
    const position = view.DOMMatrixReadOnly && matrix !== 'none' ? new view.DOMMatrixReadOnly(matrix).m42 : point.position;
    motion.animation.cancel();
    setDismissProgress(position);
    return point.velocity;
  }
  function resetDismiss() {
    interruptDismiss();
    dismissPosition = 0;
    shell.style.removeProperty('transform');
    shell.classList.remove('is-dismissing');
  }
  function settleDismiss(close, velocity = 0) {
    interruptDismiss();
    const start = dismissPosition, target = close ? dialog.clientHeight + 80 : 0;
    if (reducedMotion() || !shell.animate) { resetDismiss(); if (close) dialog.close(); return; }
    const frames = Array.from({length: 21}, (_, index) => {
      const progress = index / 20;
      const position = index === 20 ? target : springPoint(start, target, velocity, progress * DISMISS_SETTLE_MS / 1000).position;
      return { transform: `translateY(${Math.max(0, position)}px)`, offset: progress };
    });
    const animation = shell.animate(frames, { duration: DISMISS_SETTLE_MS, easing: 'linear', fill: 'forwards' });
    dismissMotion = { animation, start, target, velocity };
    animation.finished.then(() => {
      if (dismissMotion?.animation !== animation) return;
      dismissMotion = null;
      animation.cancel();
      if (close) { if (dialog.open) dialog.close(); }
      else resetDismiss();
    }).catch(() => {}); // A new gesture, photo or Close owns cancelled motion.
  }
  const cleanup = () => {
    active = false;
    observer?.disconnect();
    view.removeEventListener('resize', scheduleMeasure);
    dialog.ownerDocument.fonts?.removeEventListener('loadingdone', scheduleMeasure);
    if (measureFrame) view.cancelAnimationFrame(measureFrame);
    clearTimeout(ease.timer);
    resetDismiss();
  };
  galleryCleanup.set(dialog, cleanup);
  const fail = message => { error.textContent = message; error.hidden = false; };
  const clearError = () => { error.hidden = true; error.textContent = ''; };
  const confirming = () => Boolean(confirmPanel && !confirmPanel.hidden);
  const isCover = photo => photo.id === coverId || (!coverId && photo.id === 'legacy');
  function ease() {
    if (reducedMotion()) return;
    viewport.classList.add('is-easing');
    clearTimeout(ease.timer);
    ease.timer = setTimeout(() => viewport.classList.remove('is-easing'), 260);
  }
  function transform() {
    const maxX = viewport.clientWidth * (scale - 1) / 2;
    const maxY = viewport.clientHeight * (scale - 1) / 2;
    x = Math.max(-maxX, Math.min(maxX, x)); y = Math.max(-maxY, Math.min(maxY, y));
    image.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    const label = scale > 1 ? 'Zoom out' : 'Zoom in';
    zoom.setAttribute('aria-label', label);
    zoom.setAttribute('aria-pressed', String(scale > 1));
    zoomGlyph?.setAttribute('d', scale > 1 ? ZOOM_MINUS : ZOOM_PLUS);
    viewport.classList.toggle('is-zoomed', scale > 1);
  }
  function resetZoom() { scale = 1; x = y = 0; pointers.clear(); gesture = null; transform(); }
  function syncActionVisibility() {
    actions.hidden = ![...actions.querySelectorAll('button')].some(button => !button.hidden);
    if (navigation) navigation.hidden = !extra || extra.hidden || extra.parentElement !== navigation || confirming();
  }
  function closeConfirm({ focus = false } = {}) {
    if (!confirmPanel) return;
    confirmPanel.hidden = true;
    syncActionVisibility();
    if (focus && !remove.hidden) remove.focus();
  }
  function show(delta = 0) {
    index = (index + delta + photos.length) % photos.length;
    const photo = photos[index];
    resetDismiss(); resetZoom(); clearError(); closeConfirm();
    image.src = photo.photo || photo.thumb; image.alt = `${title}, photo ${index + 1}`;
    caption.textContent = `${index + 1} of ${photos.length} · ${photo.galleryLabel ? `${photo.galleryLabel} · ` : ''}${photoAttribution(photo)}`;
    renderGalleryContext(context, getContext?.(photo));
    scheduleMeasure();
    if (footer) footer.scrollTop = 0;
    previous.hidden = next.hidden = photos.length < 2;
    cover.hidden = !onCover || (canCover ? !canCover(photo) : false);
    const main = isCover(photo);
    cover.querySelector('span').textContent = main ? 'Main photo' : 'Set as main';
    cover.setAttribute('aria-label', main ? 'Main photo' : 'Set as main photo');
    cover.classList.toggle('is-current', main);
    cover.disabled = main;
    remove.hidden = !onRemove || !canRemove?.(photo);
    const handoff = extra ? extraAction?.(photo) ?? null : null;
    if (extra) {
      extra.hidden = !handoff;
      const destination = handoff?.kind === 'navigation' && navigation ? navigation : actions;
      if (extra.parentElement !== destination) {
        if (destination === actions) actions.insertBefore(extra, remove);
        else destination.append(extra);
      }
      if (handoff) {
        extra.querySelector('span').textContent = handoff.label;
        extra.querySelector('[data-extra-icon]')?.setAttribute('d', handoff.icon ?? '');
      }
    }
    syncActionVisibility();
    if (delta && !reducedMotion()) {
      image.animate?.([{ opacity: 0.2, translate: `${delta * 28}px 0` }, { opacity: 1, translate: '0 0' }], { duration: 220, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
    }
  }
  async function mutate(action, label) {
    if (busy) return;
    resetDismiss();
    busy = true; clearError(); controls.forEach(control => { control.disabled = true; });
    try { await action(); }
    catch (cause) { closeConfirm(); fail(`${label} failed. ${cause.message || 'Please try again.'}`); }
    finally {
      busy = false; controls.forEach(control => { control.disabled = false; });
      cover.disabled = isCover(photos[index] ?? {});
    }
  }
  cover.onclick = () => mutate(async () => {
    await onCover(photos[index]); coverId = photos[index].id; show();
  }, 'Main photo update');
  remove.onclick = () => {
    if (busy) return;
    if (!canRemove?.(photos[index])) { fail('You can only remove your own photos.'); return; }
    clearError();
    actions.hidden = true;
    confirmPanel.hidden = false;
    if (navigation) navigation.hidden = true;
    confirmRemove.focus();
  };
  confirmCancel.onclick = () => closeConfirm({ focus: true });
  if (extra) extra.onclick = () => {
    if (busy) return;
    const photo = photos[index];
    const handoff = extraAction?.(photo);
    if (!handoff) return;
    handedOff = true;
    dialog.close();
    handoff.run(photo);
  };
  confirmRemove.onclick = () => mutate(async () => {
    const photo = photos[index];
    if (!canRemove?.(photo)) throw new Error('You can only remove your own photos.');
    confirmRemove.textContent = 'Moving…';
    try { await onRemove(photo); }
    finally { confirmRemove.textContent = 'Move to Trash'; }
    photos.splice(index, 1);
    if (!photos.length) { dialog.close(); return; }
    index = Math.min(index, photos.length - 1); show();
    zoom.focus();
  }, 'Photo removal');
  zoom.onclick = () => { ease(); scale = scale > 1 ? 1 : 2.5; x = y = 0; transform(); };
  viewport.onwheel = event => {
    if (busy || (!event.ctrlKey && !event.metaKey)) return;
    event.preventDefault();
    scale = Math.max(1, Math.min(4, scale + (event.deltaY < 0 ? 0.25 : -0.25)));
    transform();
  };
  previous.onclick = () => show(-1); next.onclick = () => show(1);
  dialog.oncancel = event => {
    if (busy) { event.preventDefault(); return; }
    if (confirming()) { event.preventDefault(); closeConfirm({ focus: true }); }
  };
  dialog.onclose = () => { cleanup(); resetZoom(); closeConfirm(); image.removeAttribute('src'); renderGalleryContext(context, null); onClose?.({ handedOff }); };
  image.onerror = () => fail('This photo could not load. Try another photo or close and reopen the viewer.');
  dialog.onkeydown = event => {
    if (busy || confirming() || event.target.closest?.('[data-gallery-context]')) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      if (scale > 1) { x += event.key === 'ArrowLeft' ? 60 : -60; transform(); }
      else show(event.key === 'ArrowLeft' ? -1 : 1);
    }
    if (scale > 1 && ['ArrowUp','ArrowDown'].includes(event.key)) { event.preventDefault(); y += event.key === 'ArrowUp' ? 60 : -60; transform(); }
    if (['+', '=', '-'].includes(event.key)) { event.preventDefault(); ease(); scale = Math.max(1, Math.min(4, scale + (event.key === '-' ? -.5 : .5))); transform(); }
  };
  const distance = () => { const [a,b] = [...pointers.values()]; return Math.hypot(a.x-b.x,a.y-b.y); };
  viewport.onpointerdown = event => {
    if (busy || confirming() || (event.button !== undefined && event.button !== 0)) return;
    const carriedVelocity = interruptDismiss();
    pointers.set(event.pointerId, {x:event.clientX, y:event.clientY});
    try { viewport.setPointerCapture(event.pointerId); } catch { /* Synthetic events do not have an active pointer. */ }
    if (pointers.size === 2) { resetDismiss(); gesture = {pinch:true, distance:Math.max(1,distance()), scale}; }
    else gesture = {startX:event.clientX,startY:event.clientY,x,y,moved:false,dismiss:dismissPosition > 0,axis:null,baseY:dismissPosition,
      velocity:carriedVelocity,samples:[{position:dismissPosition,time:performance.now()}]};
  };
  viewport.onpointermove = event => {
    if (!gesture || !pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, {x:event.clientX,y:event.clientY});
    if (pointers.size === 2 && gesture.pinch) { scale = Math.max(1,Math.min(4,gesture.scale * distance()/gesture.distance)); transform(); return; }
    if (gesture.pinch) return;
    const dx = event.clientX-gesture.startX, dy = event.clientY-gesture.startY;
    if (Math.hypot(dx,dy)>8) gesture.moved = true;
    if (scale > 1) { x=gesture.x+dx; y=gesture.y+dy; transform(); return; }
    if (gesture.moved && !gesture.axis) gesture.axis = Math.abs(dx) > Math.abs(dy) * 1.2 ? 'horizontal' : 'vertical';
    if (gesture.dismiss || (gesture.axis === 'vertical' && dy > 0 && dy > Math.abs(dx) * 1.2)) {
      gesture.dismiss = true;
      setDismissProgress(gesture.baseY + dy);
      gesture.samples.push({position:dismissPosition,time:performance.now()});
    }
  };
  viewport.onpointerup = event => {
    if (!gesture) return;
    const dx = event.clientX-gesture.startX, dy = event.clientY-gesture.startY;
    if (gesture.dismiss) {
      setDismissProgress(gesture.baseY + dy);
      const now = performance.now();
      gesture.samples.push({position:dismissPosition,time:now});
      const samples = gesture.samples.filter(sample => now - sample.time <= 80);
      const first = samples[0], last = samples.at(-1);
      const velocity = last.time > first.time ? Math.max(-3000, Math.min(3000, (last.position-first.position) * 1000 / (last.time-first.time))) : gesture.velocity;
      const close = velocity >= -250 && (dismissPosition > DISMISS_PX || (dismissPosition > 35 && velocity > 650));
      settleDismiss(close, velocity);
    }
    else if (!gesture.pinch && scale === 1 && Math.abs(dx)>45 && Math.abs(dx)>Math.abs(dy)*1.2) show(dx<0?1:-1);
    else if (!gesture.pinch && !gesture.moved && Math.hypot(dx,dy)<8) {
      const now = performance.now();
      if (now-lastTap < 300 && lastTap) { zoom.onclick(); lastTap=0; } else lastTap=now;
    }
    pointers.delete(event.pointerId);
    if (!pointers.size) gesture=null;
  };
  viewport.onpointercancel = () => {
    if (gesture?.dismiss) settleDismiss(false);
    pointers.clear(); gesture=null;
  };
  viewport.onlostpointercapture = event => { if (pointers.has(event.pointerId)) viewport.onpointercancel(); };
  dialog.querySelector('h2').textContent = title;
  show(); dialog.showModal();
  dialog.querySelector('#closeSharedGallery')?.focus({ preventScroll: true });
}
