import { describe, expect, it, vi } from "vitest";
import {
  MAX_DECISION_VOTES,
  activeRecords,
  addDecisionCandidate,
  applyGoogleMapsDetails,
  closeDecisionSession,
  createSubmissionGate,
  createTrailingRefreshQueue,
  createDecisionSession,
  decisionVoteSummary,
  dishReviewDraftKey,
  findRestaurantDuplicates,
  findSimilarDishes,
  findSimilarRestaurants,
  mergePendingRestaurants,
  normalizeRestaurantName,
  formatReleaseLabel,
  isFoodLogOwner,
  orderReviewsForViewer,
  parseDishReviewDraft,
  parseGoogleMapsUrl,
  recoverExpiredSession,
  restaurantNeedsDetails,
  restaurantVisitStatus,
  restaurantNameSimilarity,
  reopenDecisionSession,
  restoreRecord,
  runCompensated,
  toggleDecisionVote,
  trashRecord,
  validateImportPayload
} from "../lib/foodlog-core.js";

describe("release identity and session recovery", () => {
  it("shows owner-only features only for the exact email, case-insensitively", () => {
    expect(isFoodLogOwner("DanielHanna0001@GMAIL.COM")).toBe(true);
    expect(isFoodLogOwner("danielhanna0001+preview@gmail.com")).toBe(false);
    expect(isFoodLogOwner("friend@example.com")).toBe(false);
  });

  it("formats a short, human-readable release label", () => {
    expect(formatReleaseLabel({
      channel: "UX Preview",
      buildId: "86ce263f5abc",
      builtAt: "2026-09-04T18:22:00.000Z"
    })).toBe("UX Preview · 2026.09.04 · 86ce263");
  });

  it("clears only the stale local auth session and returns the friendly message", async () => {
    const auth = { signOut: vi.fn(async () => ({ error: null })) };
    await expect(recoverExpiredSession(auth, new Error("Invalid Refresh Token")))
      .resolves.toBe("Session expired — sign in again");
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" });
    await expect(recoverExpiredSession(auth, new Error("Network unavailable"))).resolves.toBeNull();
  });
});

describe("review ordering and draft restoration", () => {
  it("puts the current user's review first, then keeps the newest reviews first", () => {
    const reviews = [
      { email: "old@example.com", updatedAt: 10 },
      { email: "new@example.com", updatedAt: 30 },
      { email: "me@example.com", updatedAt: 20 }
    ];
    expect(orderReviewsForViewer(reviews, "ME@example.com").map((entry) => entry.email))
      .toEqual(["me@example.com", "new@example.com", "old@example.com"]);
    expect(reviews.map((entry) => entry.email)).toEqual([
      "old@example.com",
      "new@example.com",
      "me@example.com"
    ]);
  });

  it("restores a valid session draft and rejects corrupt draft data", () => {
    const key = dishReviewDraftKey("dish-1", "Me@Example.com");
    expect(key).toBe("foodlog-dish-review-draft-v1:me@example.com:dish-1");
    expect(parseDishReviewDraft(JSON.stringify({
      rating: 4.5,
      notes: "Crisp and bright",
      savedAt: "2026-09-04T18:22:00.000Z",
      sourceUpdatedAt: 123
    }))).toEqual({
      rating: 4.5,
      notes: "Crisp and bright",
      savedAt: "2026-09-04T18:22:00.000Z",
      sourceUpdatedAt: 123
    });
    expect(parseDishReviewDraft("not json")).toBeNull();
    expect(parseDishReviewDraft(JSON.stringify({ rating: 8 }))).toBeNull();
  });
});

describe("recoverable records", () => {
  it("moves a record to Trash without mutating the original", () => {
    const original = { id: "r1", name: "Silkroad" };
    const trashed = trashRecord(original, "Dany@example.com", "2026-07-23T10:00:00.000Z");
    expect(original.deletedAt).toBeUndefined();
    expect(trashed).toMatchObject({
      deletedAt: "2026-07-23T10:00:00.000Z",
      deletedBy: "dany@example.com"
    });
    expect(activeRecords([original, trashed])).toEqual([original]);
  });

  it("restores a trashed record", () => {
    expect(restoreRecord({ id: "r1", deletedAt: "now", deletedBy: "dany" })).toMatchObject({
      deletedAt: null,
      deletedBy: null
    });
  });
});

describe("import safety", () => {
  it("rejects malformed nested data", () => {
    const result = validateImportPayload([{ name: "", location: "Maadi", cuisine: "Thai", dishes: {} }]);
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining(["Restaurant 1 needs a name.", "Restaurant 1.dishes must be an array."])
    );
  });

  it("detects duplicates against current and incoming data", () => {
    const duplicates = findRestaurantDuplicates(
      [
        { name: "Silkroad", location: "Maadi" },
        { name: "Gaya", location: "Maadi" },
        { name: "GAYA", location: "maadi" }
      ],
      [{ name: "Silkroad", location: "Maadi" }]
    );
    expect(duplicates.map((item) => item.index)).toEqual([0, 2]);
  });
});

describe("restaurant duplicate prevention", () => {
  const restaurants = [
    { id: "shantung", name: "SHANTUNG", location: "Masr El Gdida", cuisine: "Chinese", updatedBy: "Dany" },
    { id: "silkroad", name: "Silk Road Restaurant", location: "Maadi", cuisine: "Asian", updatedBy: "Mina" },
    { id: "gaya", name: "Gaya", location: "Maadi", cuisine: "Korean", updatedBy: "Paul" }
  ];

  it("normalizes punctuation, spacing, accents, and generic restaurant words", () => {
    expect(normalizeRestaurantName("  The Café Roma & Kitchen  ")).toBe("roma");
    expect(normalizeRestaurantName("Silk-Road Restaurant")).toBe("silk road");
    expect(restaurantNameSimilarity("Shan Tung", "SHANTUNG")).toBe(1);
  });

  it("warns for exact and likely misspelled matches while ranking the same location first", () => {
    const exact = findSimilarRestaurants(
      { name: "Shan Tung Restaurant", location: "Masr el-Gdida" },
      restaurants
    );
    expect(exact[0]).toMatchObject({
      restaurant: { id: "shantung" },
      exactName: true,
      sameLocation: true
    });

    const misspelled = findSimilarRestaurants(
      { name: "Silk Rood", location: "Maadi" },
      restaurants
    );
    expect(misspelled.map((match) => match.restaurant.id)).toContain("silkroad");
  });

  it("does not warn for unrelated short restaurant names and excludes the record being edited", () => {
    expect(findSimilarRestaurants({ name: "Aya", location: "Maadi" }, restaurants)).toEqual([]);
    expect(
      findSimilarRestaurants(
        { name: "Gaya", location: "Maadi" },
        restaurants,
        { excludeId: "gaya" }
      )
    ).toEqual([]);
  });

  it("preserves explicit and legacy local-only records when fresh cloud data arrives", () => {
    const remote = [
      { id: "remote", name: "Cloud Place", updatedBy: "Dany" },
      { id: "edited", name: "Server version", updatedBy: "Dany" }
    ];
    const local = [
      { id: "remote", name: "Cached place", updatedBy: "Dany" },
      { id: "legacy-local", name: "Shantung", location: "Heliopolis" },
      { id: "edited", name: "Pending edit", updatedBy: "Dany", pendingSync: true, pendingSyncMode: "edit" }
    ];
    const merged = mergePendingRestaurants(local, remote);

    expect(merged.pending.map((restaurant) => restaurant.id)).toEqual(["legacy-local", "edited"]);
    expect(merged.restaurants.map((restaurant) => restaurant.name)).toEqual([
      "Shantung",
      "Pending edit",
      "Cloud Place"
    ]);
    expect(merged.pending[0]).toMatchObject({ pendingSync: true, pendingSyncMode: "create" });
  });
});

describe("capture-first helpers", () => {
  it("marks only restaurants missing a location or cuisine as needing details", () => {
    expect(restaurantNeedsDetails({ name: "Quick note", location: "", cuisine: "" })).toBe(true);
    expect(restaurantNeedsDetails({ name: "Complete", location: "Maadi", cuisine: "Thai" })).toBe(false);
  });

  it("treats ratings, visited-by names, or dishes as Been and empty journals as Not visited", () => {
    expect(restaurantVisitStatus({ name: "Idea", ratings: [], visited: [], dishes: [] })).toBe("want");
    expect(restaurantVisitStatus({ name: "Rated", ratings: [{ rating: 4 }] })).toBe("been");
    expect(restaurantVisitStatus({ name: "Named", visited: ["Dany"] })).toBe("been");
    expect(restaurantVisitStatus({ name: "Logged", dishes: [{ name: "Noodles" }] })).toBe("been");
    expect(restaurantVisitStatus({ name: "Trashed dish", dishes: [{ name: "Old", deletedAt: "now" }] })).toBe("want");
  });

  it("detects duplicate dishes despite punctuation, spacing, and likely misspellings", () => {
    const dishes = [
      { id: "d1", name: "Wide-fried noodle" },
      { id: "d2", name: "Pho" }
    ];
    expect(findSimilarDishes("wide fried noodles", dishes)[0].dish.id).toBe("d1");
    expect(findSimilarDishes("Pie", dishes)).toEqual([]);
    expect(findSimilarDishes("Pho", dishes, { excludeId: "d2" })).toEqual([]);
  });

  it("parses direct Maps URLs and never overwrites an answer already typed", () => {
    const parsed = parseGoogleMapsUrl(
      "https://www.google.com/maps/place/Shantung+Restaurant/@30.123,31.456,17z?query_place_id=abc"
    );
    expect(parsed).toMatchObject({
      placeName: "Shantung Restaurant",
      placeId: "abc",
      latitude: 30.123,
      longitude: 31.456
    });
    expect(
      applyGoogleMapsDetails(
        { name: "My spelling", maps: "old" },
        { placeName: "Google spelling", finalUrl: "https://www.google.com/maps/place/Google" }
      )
    ).toEqual({
      name: "My spelling",
      maps: "https://www.google.com/maps/place/Google"
    });
  });
});

describe("group picker", () => {
  const build = () =>
    createDecisionSession(
      { title: "Friday dinner", createdBy: "dany@example.com", candidates: ["r1", "r2"] },
      () => "s1",
      "2026-07-23T10:00:00.000Z"
    );

  it("adds candidates once and allows up to three votes per person", () => {
    let session = addDecisionCandidate(build(), "r3");
    session = addDecisionCandidate(session, "r3");
    expect(session.candidates).toEqual(["r1", "r2", "r3"]);
    session = toggleDecisionVote(session, "r1", "dany@example.com");
    session = toggleDecisionVote(session, "r2", "dany@example.com");
    session = toggleDecisionVote(session, "r3", "dany@example.com");
    expect(session.votes).toHaveLength(MAX_DECISION_VOTES);
    expect(() =>
      toggleDecisionVote(addDecisionCandidate(session, "r4"), "r4", "dany@example.com")
    ).toThrow("up to 3");
  });

  it("toggles a vote off and summarizes totals", () => {
    let session = build();
    session = toggleDecisionVote(session, "r1", "dany@example.com");
    session = toggleDecisionVote(session, "r1", "mina@example.com");
    session = toggleDecisionVote(session, "r1", "dany@example.com");
    expect(decisionVoteSummary(session)).toEqual([
      { restaurantId: "r1", voteCount: 1 },
      { restaurantId: "r2", voteCount: 0 }
    ]);
  });

  it("resolves a tie once and reopening clears the persisted result", () => {
    let session = build();
    session = toggleDecisionVote(session, "r1", "dany@example.com");
    session = toggleDecisionVote(session, "r2", "mina@example.com");
    const closed = closeDecisionSession(session, () => 0.99, "2026-07-23T11:00:00.000Z");
    expect(closed.selectedRestaurantId).toBe("r2");
    expect(closed.status).toBe("closed");
    expect(reopenDecisionSession(closed)).toMatchObject({
      status: "open",
      selectedRestaurantId: null,
      decidedAt: null
    });
  });
});

describe("request stability", () => {
  it("rejects a duplicate submission while the first request is active", async () => {
    const gate = createSubmissionGate();
    let release;
    const waiting = new Promise((resolve) => { release = resolve; });
    const first = gate.run("save-place", async () => {
      await waiting;
      return "saved";
    });
    const duplicate = await gate.run("save-place", async () => "duplicate");
    expect(duplicate).toEqual({ accepted: false, value: undefined });
    release();
    await expect(first).resolves.toEqual({ accepted: true, value: "saved" });
  });

  it("coalesces refreshes received during a fetch into one trailing run", async () => {
    const releases = [];
    let runs = 0;
    const queue = createTrailingRefreshQueue(async () => {
      runs += 1;
      await new Promise((resolve) => releases.push(resolve));
    });
    queue.request();
    queue.request();
    queue.request();
    expect(runs).toBe(1);
    releases.shift()();
    await Promise.resolve();
    await Promise.resolve();
    expect(runs).toBe(2);
    releases.shift()();
    await Promise.resolve();
  });

  it("cleans up only newly prepared resources when commit fails", async () => {
    const cleaned = [];
    await expect(
      runCompensated(
        async () => "new-upload.jpg",
        async () => { throw new Error("database failed"); },
        async (path) => cleaned.push(path)
      )
    ).rejects.toThrow("database failed");
    expect(cleaned).toEqual(["new-upload.jpg"]);
  });
});
