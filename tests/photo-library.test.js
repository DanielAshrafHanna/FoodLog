import { describe, expect, it } from 'vitest';
import { buildPhotoLibrary, filterPhotoLibrary, groupLibraryByDish, libraryKey, photoLibraryCounts } from '../lib/photo-library.js';

const dishPhotos = dish => dish.photos;
const placePhotos = [
  { id: 'room', photo: 'room.jpg', createdAt: 10, isCover: true },
  { id: 'menu', photo: 'menu.jpg', createdAt: 30 }
];
const dishes = [
  { id: 'soup', name: 'Soup', photos: [{ id: 'legacy', photo: 'soup.jpg' }] },
  { id: 'salad', name: 'Salad', photos: [{ id: 'legacy', photo: 'salad.jpg' }, { id: 's2', photo: 's2.jpg', createdAt: 20 }] }
];

describe('photo library', () => {
  it('merges place and dish photos newest first with unique keys', () => {
    const entries = buildPhotoLibrary({ placePhotos, dishes, dishPhotos });
    expect(entries.map(entry => entry.key)).toEqual([
      'place:menu', 'dish:salad:s2', 'place:room', 'dish:soup:legacy', 'dish:salad:legacy'
    ]);
    expect(new Set(entries.map(entry => entry.key)).size).toBe(entries.length);
    expect(entries.find(entry => entry.key === 'place:room').isMain).toBe(true);
    expect(entries.find(entry => entry.key === 'dish:salad:s2')).toMatchObject({ kind: 'dish', dishId: 'salad', dishName: 'Salad', isMain: false });
  });

  it('skips place photos without an image', () => {
    const entries = buildPhotoLibrary({ placePhotos: [{ id: 'empty' }], dishes: [], dishPhotos });
    expect(entries).toEqual([]);
  });

  it('filters, counts and groups by dish', () => {
    const entries = buildPhotoLibrary({ placePhotos, dishes, dishPhotos });
    expect(photoLibraryCounts(entries)).toEqual({ all: 5, place: 2, dish: 3 });
    expect(filterPhotoLibrary(entries, 'place').every(entry => entry.kind === 'place')).toBe(true);
    expect(filterPhotoLibrary(entries, 'dish')).toHaveLength(3);
    expect(filterPhotoLibrary(entries, 'all')).toBe(entries);
    const groups = groupLibraryByDish(filterPhotoLibrary(entries, 'dish'));
    expect(groups.map(group => [group.dishName, group.entries.length])).toEqual([['Salad', 2], ['Soup', 1]]);
  });

  it('builds kind-specific keys', () => {
    expect(libraryKey('place', 'a')).toBe('place:a');
    expect(libraryKey('dish', 'legacy', 'd1')).toBe('dish:d1:legacy');
  });
});
