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
  if (!pending.path) {
    const uploaded = await upload(pending.file, pending);
    if (uploaded && typeof uploaded === "object") {
      pending.path = uploaded.path;
      pending.thumbPath = uploaded.thumbPath ?? pending.thumbPath;
    } else {
      pending.path = uploaded;
    }
  }
  const { error } = await insert(pending.id, pending.path, pending.thumbPath);
  if (!error) return;
  const { data, error: lookupError } = await find(pending.id);
  if (lookupError || data?.photo_path !== pending.path) throw error;
}

// Native scrolling handles touch and trackpads; visible arrows also support mouse and keyboard.
export function mountDishCarousels(root) {
  for (const carousel of root.querySelectorAll('.dish-carousel')) {
    const track = carousel.querySelector('.dish-photo-track');
    const position = carousel.querySelector('[data-photo-position]');
    const previous = carousel.querySelector('[data-action="dish-photo-prev"]');
    const next = carousel.querySelector('[data-action="dish-photo-next"]');
    if (!position) continue;
    const current = () => Math.round(track.scrollLeft / Math.max(track.clientWidth, 1));
    const update = () => {
      const index = current();
      position.textContent = `${index + 1} / ${track.children.length}`;
      previous.disabled = index === 0;
      next.disabled = index === track.children.length - 1;
    };
    track.onscroll = update;
    const move = delta => track.scrollTo({left: (current() + delta) * track.clientWidth, behavior: 'instant'});
    previous.onclick = () => move(-1);
    next.onclick = () => move(1);
    track.onkeydown = event => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      const index = Math.max(0, Math.min(track.children.length - 1, current() + (event.key === 'ArrowLeft' ? -1 : 1)));
      track.children[index].focus({preventScroll: true});
      track.scrollTo({left:index * track.clientWidth, behavior:'instant'});
    };
    update();
  }
}

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
  const controls = [...dialog.querySelectorAll('button')];
  let busy = false, scale = 1, x = 0, y = 0, gesture = null, lastTap = 0;
  const pointers = new Map();
  const fail = message => { error.textContent = message; error.hidden = false; };
  const clearError = () => { error.hidden = true; error.textContent = ''; };
  function transform() {
    const maxX = viewport.clientWidth * (scale - 1) / 2;
    const maxY = viewport.clientHeight * (scale - 1) / 2;
    x = Math.max(-maxX, Math.min(maxX, x)); y = Math.max(-maxY, Math.min(maxY, y));
    image.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    zoom.textContent = scale > 1 ? 'Zoom out' : 'Zoom in';
    zoom.setAttribute('aria-pressed', String(scale > 1));
    viewport.classList.toggle('is-zoomed', scale > 1);
  }
  function resetZoom() { scale = 1; x = y = 0; pointers.clear(); gesture = null; transform(); }
  function show(delta = 0) {
    index = (index + delta + photos.length) % photos.length;
    const photo = photos[index];
    resetZoom(); clearError();
    image.src = photo.photo || photo.thumb; image.alt = `${title}, photo ${index + 1}`;
    caption.textContent = `${index + 1} of ${photos.length} · ${photoAttribution(photo)}`;
    previous.hidden = next.hidden = photos.length < 2;
    cover.hidden = !onCover;
    cover.textContent = photo.id === coverId || (!coverId && photo.id === 'legacy') ? 'Cover photo' : 'Use as cover';
    cover.disabled = cover.textContent === 'Cover photo';
    remove.hidden = !onRemove || !canRemove?.(photo);
    remove.textContent = 'Move to Trash';
  }
  async function mutate(action, label) {
    if (busy) return;
    busy = true; clearError(); controls.forEach(control => { control.disabled = true; });
    try { await action(); }
    catch (cause) { fail(`${label} failed. ${cause.message || 'Please try again.'}`); }
    finally {
      busy = false; controls.forEach(control => { control.disabled = false; });
      cover.disabled = cover.textContent === 'Cover photo';
    }
  }
  cover.onclick = () => mutate(async () => {
    await onCover(photos[index]); coverId = photos[index].id; show();
  }, 'Cover update');
  remove.onclick = () => mutate(async () => {
    const photo = photos[index];
    if (!canRemove?.(photo)) throw new Error('You can only remove your own photos.');
    remove.textContent = 'Moving…';
    await onRemove(photo);
    photos.splice(index, 1);
    if (!photos.length) { dialog.close(); return; }
    index = Math.min(index, photos.length - 1); show();
    zoom.focus();
  }, 'Photo removal');
  zoom.onclick = () => { scale = scale > 1 ? 1 : 2.5; x = y = 0; transform(); };
  previous.onclick = () => show(-1); next.onclick = () => show(1);
  dialog.oncancel = event => { if (busy) event.preventDefault(); };
  dialog.onclose = () => { resetZoom(); image.removeAttribute('src'); onClose?.(); };
  image.onerror = () => fail('This photo could not load. Try another photo or close and reopen the gallery.');
  dialog.onkeydown = event => {
    if (busy) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      if (scale > 1) { x += event.key === 'ArrowLeft' ? 60 : -60; transform(); }
      else show(event.key === 'ArrowLeft' ? -1 : 1);
    }
    if (scale > 1 && ['ArrowUp','ArrowDown'].includes(event.key)) { event.preventDefault(); y += event.key === 'ArrowUp' ? 60 : -60; transform(); }
    if (['+', '=', '-'].includes(event.key)) { event.preventDefault(); scale = Math.max(1, Math.min(4, scale + (event.key === '-' ? -.5 : .5))); transform(); }
  };
  const distance = () => { const [a,b] = [...pointers.values()]; return Math.hypot(a.x-b.x,a.y-b.y); };
  viewport.onpointerdown = event => {
    if (busy || (event.button !== undefined && event.button !== 0)) return;
    pointers.set(event.pointerId, {x:event.clientX, y:event.clientY});
    try { viewport.setPointerCapture(event.pointerId); } catch { /* Synthetic events do not have an active pointer. */ }
    if (pointers.size === 2) gesture = {pinch:true, distance:Math.max(1,distance()), scale};
    else gesture = {startX:event.clientX,startY:event.clientY,x,y,moved:false};
  };
  viewport.onpointermove = event => {
    if (!gesture || !pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, {x:event.clientX,y:event.clientY});
    if (pointers.size === 2 && gesture.pinch) { scale = Math.max(1,Math.min(4,gesture.scale * distance()/gesture.distance)); transform(); return; }
    if (gesture.pinch) return;
    const dx = event.clientX-gesture.startX, dy = event.clientY-gesture.startY;
    if (Math.hypot(dx,dy)>8) gesture.moved = true;
    if (scale > 1) { x=gesture.x+dx; y=gesture.y+dy; transform(); }
  };
  viewport.onpointerup = event => {
    if (!gesture) return;
    const dx = event.clientX-gesture.startX, dy = event.clientY-gesture.startY;
    if (!gesture.pinch && scale === 1 && Math.abs(dx)>45 && Math.abs(dx)>Math.abs(dy)*1.2) show(dx<0?1:-1);
    else if (!gesture.pinch && !gesture.moved && Math.hypot(dx,dy)<8) {
      const now = performance.now();
      if (now-lastTap < 300 && lastTap) { zoom.onclick(); lastTap=0; } else lastTap=now;
    }
    pointers.delete(event.pointerId);
    if (!pointers.size) gesture=null;
  };
  viewport.onpointercancel = () => { pointers.clear(); gesture=null; };
  dialog.querySelector('h2').textContent = title;
  show(); dialog.showModal();
}
