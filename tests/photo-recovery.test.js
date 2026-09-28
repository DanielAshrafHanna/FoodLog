// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import { createMemoryPhotoStore, queuedPhotoRecord } from '../lib/photo-queue.js';
import { mergeRefreshOptions } from '../lib/remote-refresh.js';
import { preparePhotoVariants } from '../lib/photo-delivery.js';

it('keeps account and destination metadata with a failed photo across storage reopen', async () => {
  const store = createMemoryPhotoStore();
  const file = new File(['fixture'], 'dish.png', { type: 'image/png' });
  const record = queuedPhotoRecord({
    id: 'photo-1', file, kind: 'contribution', restaurantId: 'place-1', dishId: 'dish-1',
    userId: 'account-a', path: 'account-a/photo-1.jpg', stage: 'failed', error: 'Offline'
  });
  await store.put(record);
  expect((await store.list({ userId: 'account-a', dishId: 'dish-1' }))[0]).toMatchObject({
    version: 2, stage: 'failed', error: 'Offline', uploaded: false, ready: false, path: 'account-a/photo-1.jpg'
  });
  expect(await store.list({ userId: 'account-b' })).toEqual([]);
});

it('keeps all pending refresh IDs and makes a full refresh take precedence', () => {
  expect(mergeRefreshOptions(
    { reason: 'realtime', restaurantIds: ['a'] },
    { reason: 'realtime', restaurantIds: ['b', 'a'] }
  )).toEqual({ reason: 'realtime', restaurantIds: ['a', 'b'] });
  expect(mergeRefreshOptions(
    { reason: 'realtime', restaurantIds: ['a'] },
    { reason: 'manual' }
  )).toEqual({ reason: 'manual' });
});

it('decodes a photo once for both sized files', async () => {
  const source = { width: 1600, height: 800, close: vi.fn() };
  const originalBitmap = globalThis.createImageBitmap;
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  const originalToBlob = HTMLCanvasElement.prototype.toBlob;
  globalThis.createImageBitmap = vi.fn(async () => source);
  HTMLCanvasElement.prototype.getContext = () => ({ drawImage: vi.fn() });
  HTMLCanvasElement.prototype.toBlob = function (done) { done(new Blob(['jpeg'], { type: 'image/jpeg' })); };
  try {
    const variants = await preparePhotoVariants(new File(['fixture'], 'photo.png', { type: 'image/png' }));
    expect(globalThis.createImageBitmap).toHaveBeenCalledTimes(1);
    expect(source.close).toHaveBeenCalledTimes(1);
    expect(variants.original.type).toBe('image/jpeg');
    expect(variants.thumb.type).toBe('image/jpeg');
  } finally {
    globalThis.createImageBitmap = originalBitmap;
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    HTMLCanvasElement.prototype.toBlob = originalToBlob;
  }
});

it('rejects files that are not readable images', async () => {
  await expect(preparePhotoVariants(new File(['text'], 'note.txt', { type: 'text/plain' })))
    .rejects.toThrow('Choose an image file');
});
