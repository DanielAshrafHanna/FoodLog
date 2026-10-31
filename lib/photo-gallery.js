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

export function mountGallery({ dialog, photos, title, startId, onCover, coverId, canRemove, onRemove, onClose }) {
  if (!photos.length) return;
  photos = [...photos];
  let index = Math.max(0, photos.findIndex(photo => photo.id === startId));
  const image = dialog.querySelector('img');
  const viewport = dialog.querySelector('.gallery-viewport');
  const caption = dialog.querySelector('[data-gallery-caption]');
  const error = dialog.querySelector('[data-gallery-error]');
  const previous = dialog.querySelector('[data-gallery-prev]');
  const next = dialog.querySelector('[data-gallery-next]');
  const cover = dialog.querySelector('[data-gallery-cover]');
  const remove = dialog.querySelector('[data-gallery-remove]');
  const zoom = dialog.querySelector('[data-gallery-zoom]');
  const zoomGlyph = zoom.querySelector('[data-zoom-plus]');
  const actions = dialog.querySelector('[data-gallery-actions]');
  const confirmPanel = dialog.querySelector('[data-gallery-confirm]');
  const confirmCancel = dialog.querySelector('[data-gallery-confirm-cancel]');
  const confirmRemove = dialog.querySelector('[data-gallery-confirm-remove]');
  const controls = [...dialog.querySelectorAll('button')];
  let busy = false, scale = 1, x = 0, y = 0, gesture = null, lastTap = 0;
  const pointers = new Map();
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
  function setDismissProgress(dy) {
    dialog.style.setProperty('--viewer-dim', String(Math.max(0.35, 1 - dy / 520)));
    image.style.transform = dy ? `translateY(${dy}px) scale(${Math.max(0.86, 1 - dy / 1600)})` : 'translate(0px, 0px) scale(1)';
  }
  function closeConfirm({ focus = false } = {}) {
    if (!confirmPanel) return;
    confirmPanel.hidden = true;
    actions.hidden = false;
    if (focus && !remove.hidden) remove.focus();
  }
  function show(delta = 0) {
    index = (index + delta + photos.length) % photos.length;
    const photo = photos[index];
    resetZoom(); clearError(); closeConfirm();
    image.src = photo.photo || photo.thumb; image.alt = `${title}, photo ${index + 1}`;
    caption.textContent = `${index + 1} of ${photos.length} · ${photoAttribution(photo)}`;
    previous.hidden = next.hidden = photos.length < 2;
    cover.hidden = !onCover;
    const main = isCover(photo);
    cover.querySelector('span').textContent = main ? 'Main photo' : 'Set as main';
    cover.setAttribute('aria-label', main ? 'Main photo' : 'Set as main photo');
    cover.classList.toggle('is-current', main);
    cover.disabled = main;
    remove.hidden = !onRemove || !canRemove?.(photo);
    actions.hidden = cover.hidden && remove.hidden;
    if (delta && !reducedMotion()) {
      image.animate?.([{ opacity: 0.2, translate: `${delta * 28}px 0` }, { opacity: 1, translate: '0 0' }], { duration: 220, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
    }
  }
  async function mutate(action, label) {
    if (busy) return;
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
    confirmRemove.focus();
  };
  confirmCancel.onclick = () => closeConfirm({ focus: true });
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
  dialog.onclose = () => { resetZoom(); closeConfirm(); dialog.style.removeProperty('--viewer-dim'); image.removeAttribute('src'); onClose?.(); };
  image.onerror = () => fail('This photo could not load. Try another photo or close and reopen the viewer.');
  dialog.onkeydown = event => {
    if (busy || confirming()) return;
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
    if (busy || (event.button !== undefined && event.button !== 0)) return;
    pointers.set(event.pointerId, {x:event.clientX, y:event.clientY});
    try { viewport.setPointerCapture(event.pointerId); } catch { /* Synthetic events do not have an active pointer. */ }
    if (pointers.size === 2) { setDismissProgress(0); gesture = {pinch:true, distance:Math.max(1,distance()), scale}; }
    else gesture = {startX:event.clientX,startY:event.clientY,x,y,moved:false,dismiss:false};
  };
  viewport.onpointermove = event => {
    if (!gesture || !pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, {x:event.clientX,y:event.clientY});
    if (pointers.size === 2 && gesture.pinch) { scale = Math.max(1,Math.min(4,gesture.scale * distance()/gesture.distance)); transform(); return; }
    if (gesture.pinch) return;
    const dx = event.clientX-gesture.startX, dy = event.clientY-gesture.startY;
    if (Math.hypot(dx,dy)>8) gesture.moved = true;
    if (scale > 1) { x=gesture.x+dx; y=gesture.y+dy; transform(); return; }
    if (gesture.moved && (gesture.dismiss || (dy > 0 && dy > Math.abs(dx) * 1.2))) {
      gesture.dismiss = true;
      setDismissProgress(Math.max(0, dy));
    }
  };
  viewport.onpointerup = event => {
    if (!gesture) return;
    const dx = event.clientX-gesture.startX, dy = event.clientY-gesture.startY;
    if (gesture.dismiss) {
      if (dy > DISMISS_PX) dialog.close();
      else { ease(); dialog.style.removeProperty('--viewer-dim'); transform(); }
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
    if (gesture?.dismiss) { dialog.style.removeProperty('--viewer-dim'); transform(); }
    pointers.clear(); gesture=null;
  };
  dialog.querySelector('h2').textContent = title;
  show(); dialog.showModal();
  dialog.querySelector('#closeSharedGallery')?.focus({ preventScroll: true });
}
