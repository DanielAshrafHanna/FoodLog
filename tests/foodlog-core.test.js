import { describe, expect, it } from "vitest";
import {
  MAX_DECISION_VOTES,
  activeRecords,
  addDecisionCandidate,
  closeDecisionSession,
  createSubmissionGate,
  createTrailingRefreshQueue,
  createDecisionSession,
  decisionVoteSummary,
  findRestaurantDuplicates,
  reopenDecisionSession,
  restoreRecord,
  runCompensated,
  toggleDecisionVote,
  trashRecord,
  validateImportPayload
} from "../lib/foodlog-core.js";

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
