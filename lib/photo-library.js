// One restaurant's place and dish photos as a single newest-first library.
// Keys stay unique even though every legacy dish photo uses the id "legacy".
export function libraryKey(kind, photoId, dishId = '') {
  return kind === 'dish' ? `dish:${dishId}:${photoId}` : `place:${photoId}`;
}

export function buildPhotoLibrary({ placePhotos = [], dishes = [], dishPhotos }) {
  const entries = placePhotos.filter(photo => photo?.photo || photo?.thumb).map((photo, order) => ({
    key: libraryKey('place', photo.id),
    kind: 'place',
    photo,
    dishId: '',
    dishName: '',
    isMain: Boolean(photo.isCover),
    createdAt: Number(photo.createdAt) || 0,
    order
  }));
  dishes.forEach((dish, dishOrder) => {
    dishPhotos(dish).forEach((photo, photoOrder) => entries.push({
      key: libraryKey('dish', photo.id, dish.id),
      kind: 'dish',
      photo,
      dishId: dish.id,
      dishName: dish.name ?? '',
      isMain: false,
      createdAt: Number(photo.createdAt) || 0,
      order: placePhotos.length + dishOrder * 100 + photoOrder
    }));
  });
  return entries.sort((a, b) => b.createdAt - a.createdAt || a.order - b.order);
}

export function filterPhotoLibrary(entries, filter = 'all') {
  if (filter === 'place') return entries.filter(entry => entry.kind === 'place');
  if (filter === 'dish') return entries.filter(entry => entry.kind === 'dish');
  return entries;
}

export function photoLibraryCounts(entries) {
  const place = entries.filter(entry => entry.kind === 'place').length;
  return { all: entries.length, place, dish: entries.length - place };
}

// Dishes view groups photos under their dish; the dish with the newest photo comes first.
export function groupLibraryByDish(entries) {
  const groups = new Map();
  for (const entry of entries) {
    if (entry.kind !== 'dish') continue;
    if (!groups.has(entry.dishId)) groups.set(entry.dishId, { dishId: entry.dishId, dishName: entry.dishName, entries: [] });
    groups.get(entry.dishId).entries.push(entry);
  }
  return [...groups.values()];
}
