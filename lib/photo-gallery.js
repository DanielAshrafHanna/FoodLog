export function galleryPhotos(item) {
  const photos = (item.photos ?? []).filter(photo => !photo.deletedAt && photo.photo);
  if (item.photo && !photos.some(photo => photo.photo === item.photo || (item.photoPath && photo.photoPath === item.photoPath))) {
    photos.unshift({ id: 'legacy', photo: item.photo, photoPath: item.photoPath, contributorName: 'Contributor unknown' });
  }
  return photos.sort((a,b) => Number(b.id === item.coverPhotoId) - Number(a.id === item.coverPhotoId));
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
  if (!pending.path) pending.path = await upload(pending.file);
  const { error } = await insert(pending.id, pending.path);
  if (!error) return;
  const { data, error: lookupError } = await find(pending.id);
  if (lookupError || data?.photo_path !== pending.path) throw error;
}

export function mountGallery({ dialog, photos, title, startId, onCover, coverId }) {
  if (!photos.length) return;
  let index = Math.max(0,photos.findIndex(photo=>photo.id===startId));
  const image = dialog.querySelector('img');
  const caption = dialog.querySelector('[data-gallery-caption]');
  const previous = dialog.querySelector('[data-gallery-prev]');
  const next = dialog.querySelector('[data-gallery-next]');
  const cover = dialog.querySelector('[data-gallery-cover]');
  let savingCover = false;
  cover.hidden = !onCover;
  dialog.querySelector('h2').textContent = title;
  function show(delta = 0) {
    index = (index + delta + photos.length) % photos.length;
    const photo = photos[index];
    image.src = photo.photo; image.alt = `${title}, photo ${index + 1}`;
    caption.textContent = `${index + 1} of ${photos.length} · ${photoAttribution(photo)}`;
    previous.hidden = next.hidden = photos.length < 2;
    cover.textContent = photo.id === coverId || (!coverId && photo.id === 'legacy') ? 'Cover photo' : 'Use as cover';
    cover.disabled = cover.textContent === 'Cover photo';
  }
  cover.onclick = async () => {
    savingCover = true;
    cover.disabled = previous.disabled = next.disabled = true;
    try { await onCover(photos[index]); coverId = photos[index].id; }
    catch (error) { caption.textContent = `Could not change cover. ${error.message}`; return; }
    finally { savingCover = false; cover.disabled = previous.disabled = next.disabled = false; }
    show();
  };
  previous.onclick = () => show(-1); next.onclick = () => show(1);
  dialog.onkeydown = event => {
    if (savingCover) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); show(event.key === 'ArrowLeft' ? -1 : 1); }
  };
  let start;
  image.onpointerdown = event => { start = event.clientX; };
  image.onpointerup = event => { if (!savingCover && start !== undefined && Math.abs(event.clientX - start) > 45) show(event.clientX < start ? 1 : -1); start = undefined; };
  image.onpointercancel = () => { start = undefined; };
  show(); dialog.showModal();
}
