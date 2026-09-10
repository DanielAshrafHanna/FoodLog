// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import {
  compressImage,
  displayPhotoSrc,
  isDuplicateObjectError,
  isMissingColumnError,
  mapPool,
  photoSrcSet,
  reservedPhotoPath,
  siblingThumbPath
} from "../lib/photo-delivery.js";
import {
  browseSnapshot,
  hasOAuthParams,
  shouldPushPlaceOpen,
  shouldPushSurface,
  shouldPushBrowseSnapshot,
  snapshotsEqual
} from "../lib/navigation.js";
import { paintFingerprint, reconcileKeyedChildren, restaurantDetailFingerprint, restaurantRowFingerprint } from "../lib/render-list.js";
import { createMemoryPhotoStore, matchesPhotoQueueScope, queuedPhotoRecord } from "../lib/photo-queue.js";
import { createDebouncedIdRefresh, restaurantIdFromRealtimeChange } from "../lib/foodlog-core.js";
import { commitQueuedPhoto, galleryPhotos } from "../lib/photo-gallery.js";

describe("photo delivery", () => {
  it("builds a sibling thumb path next to the original object", () => {
    expect(siblingThumbPath("user/abc.jpg")).toBe("user/abc-thumb.jpg");
    expect(siblingThumbPath("user/restaurants/abc.jpg")).toBe("user/restaurants/abc-thumb.jpg");
    expect(siblingThumbPath("user/abc-thumb.jpg")).toBe("user/abc-thumb.jpg");
    expect(reservedPhotoPath("owner", "photo-1", "restaurant")).toEqual({
      path: "owner/restaurants/photo-1.jpg",
      thumbPath: "owner/restaurants/photo-1-thumb.jpg"
    });
  });

  it("uses the small copy when present and falls back to the original", () => {
    expect(displayPhotoSrc({ photo: "full.jpg", thumb: "small.jpg" }, "thumb")).toBe("small.jpg");
    expect(displayPhotoSrc({ photo: "full.jpg" }, "thumb")).toBe("full.jpg");
    expect(displayPhotoSrc({ photo: "full.jpg", thumb: "small.jpg" }, "full")).toBe("full.jpg");
    expect(photoSrcSet({ photo: "full.jpg", thumb: "small.jpg" })).toContain("480w");
    expect(photoSrcSet({ photo: "full.jpg" })).toBe("");
  });

  it("detects missing-column and duplicate storage errors", () => {
    expect(isMissingColumnError({ message: "column restaurant_photos.thumb_path does not exist" })).toBe(true);
    expect(isDuplicateObjectError({ statusCode: "409" })).toBe(true);
    expect(isDuplicateObjectError(new Error("The resource already exists"))).toBe(true);
  });

  it("runs a bounded worker pool in original order", async () => {
    const seen = [];
    const result = await mapPool(["a", "b", "c"], 2, async (item) => {
      seen.push(item);
      return item.toUpperCase();
    });
    expect(result).toEqual(["A", "B", "C"]);
    expect(seen).toEqual(["a", "b", "c"]);
  });

  it("returns non-image files unchanged", async () => {
    const file = new File(["hello"], "notes.txt", { type: "text/plain" });
    await expect(compressImage(file)).resolves.toBe(file);
  });
});

describe("navigation snapshots", () => {
  it("pushes only when a mobile place opens or the surface changes", () => {
    const list = browseSnapshot({ selectedId: "a", activeSurface: "places", mobileDetailOpen: false });
    const detail = browseSnapshot({ selectedId: "a", activeSurface: "places", mobileDetailOpen: true });
    const map = browseSnapshot({ selectedId: "a", activeSurface: "map", mobileDetailOpen: false });
    expect(shouldPushPlaceOpen(list, detail)).toBe(true);
    expect(shouldPushPlaceOpen(detail, detail)).toBe(false);
    expect(shouldPushSurface(list, map)).toBe(true);
    expect(snapshotsEqual(list, { ...list })).toBe(true);
    expect(shouldPushBrowseSnapshot(list, map, { push: false })).toBe(true);
    expect(shouldPushBrowseSnapshot(map, map, { push: true })).toBe(false);
    expect(shouldPushBrowseSnapshot(list, detail, { push: true })).toBe(true);
  });

  it("treats OAuth return URLs as auth callbacks", () => {
    expect(hasOAuthParams("https://food.danyhanna.uk/?code=abc")).toBe(true);
    expect(hasOAuthParams("https://food.danyhanna.uk/#error=access_denied")).toBe(true);
    expect(hasOAuthParams("https://food.danyhanna.uk/?place=abc")).toBe(false);
  });
});

describe("keyed list reconciliation", () => {
  it("reuses existing nodes and removes leftovers", () => {
    const parent = document.createElement("div");
    const first = document.createElement("article");
    first.dataset.id = "a";
    first.textContent = "A";
    const leftover = document.createElement("article");
    leftover.dataset.id = "gone";
    parent.append(first, leftover);

    reconcileKeyedChildren(parent, [{ id: "b" }, { id: "a" }], {
      getKey: (item) => item.id,
      create: (item) => {
        const node = document.createElement("article");
        node.dataset.id = item.id;
        node.textContent = item.id;
        return node;
      },
      update: (node) => node
    });

    expect([...parent.children].map((node) => node.dataset.id)).toEqual(["b", "a"]);
    expect(parent.children[1]).toBe(first);
  });

  it("fingerprints restaurant rows without using the selected class", () => {
    const left = restaurantRowFingerprint({ id: "a", name: "Silkroad", updatedAt: 1, photos: [], dishes: [] });
    const right = restaurantRowFingerprint({ id: "a", name: "Silkroad", updatedAt: 1, photos: [], dishes: [] });
    expect(left).toBe(right);
    expect(paintFingerprint(["a", 1])).toContain("a");
    const before = restaurantDetailFingerprint({
      id: "a",
      updatedAt: 1,
      ratings: [{ email: "you", rating: 1.5, notes: "old", updatedAt: 1 }],
      dishes: []
    });
    const after = restaurantDetailFingerprint({
      id: "a",
      updatedAt: 1,
      ratings: [{ email: "you", rating: 2, notes: "new", updatedAt: 2 }],
      dishes: []
    });
    expect(before).not.toBe(after);
  });
});

describe("durable photo queue", () => {
  it("stores and restores files by place", async () => {
    const store = createMemoryPhotoStore();
    const file = new File(["img"], "plate.jpg", { type: "image/jpeg" });
    await store.put(queuedPhotoRecord({
      id: "one",
      file,
      kind: "dish",
      restaurantId: "rest-1",
      dishId: "dish-1",
      path: "owner/one.jpg"
    }));
    await expect(store.list({ restaurantId: "rest-1" })).resolves.toHaveLength(1);
    await store.remove("one");
    await expect(store.list()).resolves.toEqual([]);
  });

  it("keeps new and existing dish selections in separate exact scopes", () => {
    expect(matchesPhotoQueueScope(
      { kind: "dish", restaurantId: "rest-1", dishId: "dish-1", userId: "user-1" },
      { kind: "dish", restaurantId: "rest-1", dishId: "", userId: "user-1" }
    )).toBe(false);
    expect(matchesPhotoQueueScope(
      { kind: "dish", restaurantId: "rest-1", dishId: "", userId: "user-1" },
      { kind: "dish", restaurantId: "rest-1", dishId: "", userId: "user-1" }
    )).toBe(true);
  });

  it("records ownership and clears only the requested queue scope", async () => {
    const file = new File(["img"], "plate.jpg", { type: "image/jpeg" });
    const mine = queuedPhotoRecord({ id: "mine", file, kind: "restaurant", restaurantId: "rest-1", userId: "user-1" });
    const theirs = queuedPhotoRecord({ id: "theirs", file, kind: "restaurant", restaurantId: "rest-1", userId: "user-2" });
    expect(mine.userId).toBe("user-1");
    const store = createMemoryPhotoStore([mine, theirs]);
    await store.clear({ userId: "user-1" });
    await expect(store.list()).resolves.toEqual([theirs]);
  });
});

describe("incremental realtime refresh", () => {
  it("batches restaurant ids and falls back to a full refresh", async () => {
    vi.useFakeTimers();
    const batches = [];
    const queue = createDebouncedIdRefresh(async (ids) => {
      batches.push(ids);
    }, { delay: 400 });
    queue.enqueue("a");
    queue.enqueue("b");
    await vi.advanceTimersByTimeAsync(400);
    queue.requestAll();
    await vi.advanceTimersByTimeAsync(0);
    await Promise.resolve();
    expect(batches[0]).toEqual(["a", "b"]);
    expect(batches[1]).toBeNull();
    vi.useRealTimers();
  });

  it("maps nested photo changes back to the restaurant", () => {
    const restaurants = [{ id: "rest-1", dishes: [{ id: "dish-1" }] }];
    expect(restaurantIdFromRealtimeChange("dish_photos", { new: { dish_id: "dish-1" } }, restaurants)).toBe("rest-1");
    expect(restaurantIdFromRealtimeChange("restaurants", { new: { id: "rest-2" } })).toBe("rest-2");
  });
});

describe("queued photo commit", () => {
  it("accepts an upload that returns path and thumb together", async () => {
    const pending = { id: "stable-id", file: {} };
    const upload = vi.fn(async () => ({ path: "owner/photo.jpg", thumbPath: "owner/photo-thumb.jpg" }));
    const insert = vi.fn(async () => ({ error: null }));
    await commitQueuedPhoto(pending, { upload, insert, find: vi.fn() });
    expect(pending.path).toBe("owner/photo.jpg");
    expect(pending.thumbPath).toBe("owner/photo-thumb.jpg");
    expect(insert).toHaveBeenCalledWith("stable-id", "owner/photo.jpg", "owner/photo-thumb.jpg");
  });

  it("keeps a legacy thumb on gallery photos when present", () => {
    expect(galleryPhotos({ photo: "old.jpg", thumb: "old-small.jpg", photoPath: "old" })[0].thumb).toBe("old-small.jpg");
  });
});
