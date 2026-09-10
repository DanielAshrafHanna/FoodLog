import { describe, expect, it, vi } from "vitest";
import {
  readPendingOperations,
  removePendingOperation,
  isTransientNetworkError,
  retryTransient,
  safeStorageWrite,
  upsertPendingOperation
} from "../lib/reliable-sync.js";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value))
  };
}

describe("durable save operations", () => {
  it("survives reopen and keeps operations isolated by account", () => {
    const storage = memoryStorage();
    upsertPendingOperation(storage, "pending", {
      operationId: "op-a", actorEmail: "A@example.com", kind: "restaurant",
      entityId: "restaurant-a", create: true, payload: { name: "Offline table" }
    });
    upsertPendingOperation(storage, "pending", {
      operationId: "op-b", actorEmail: "b@example.com", kind: "dish",
      entityId: "dish-b", payload: { name: "Soup" }
    });
    expect(readPendingOperations(storage, "pending", "a@example.com")).toMatchObject([
      { operationId: "op-a", entityId: "restaurant-a", create: true }
    ]);
    expect(readPendingOperations(storage, "pending", "b@example.com")).toHaveLength(1);
  });

  it("keeps the first operation id and queue position when an offline edit changes", () => {
    const storage = memoryStorage();
    const first = upsertPendingOperation(storage, "pending", {
      operationId: "stable-op", actorEmail: "friend@example.com", kind: "restaurant",
      entityId: "restaurant-a", create: true, payload: { name: "First" }
    });
    upsertPendingOperation(storage, "pending", {
      operationId: "dish-op", actorEmail: "friend@example.com", kind: "dish",
      entityId: "dish-a", create: true, payload: { name: "Dish" }
    });
    const updated = upsertPendingOperation(storage, "pending", {
      operationId: "replacement-op", actorEmail: "friend@example.com", kind: "restaurant",
      entityId: "restaurant-a", create: false, payload: { name: "Latest" }
    });
    const reopened = readPendingOperations(storage, "pending", "friend@example.com");
    expect(updated.operationId).toBe(first.operationId);
    expect(updated.create).toBe(true);
    expect(reopened.map((operation) => operation.operationId)).toEqual(["stable-op", "dish-op"]);
    expect(reopened[0].payload.name).toBe("Latest");
  });

  it("removes only the acknowledged operation", () => {
    const storage = memoryStorage();
    for (const operationId of ["one", "two"]) {
      upsertPendingOperation(storage, "pending", {
        operationId, actorEmail: "friend@example.com", kind: "dish",
        entityId: operationId, payload: {}
      });
    }
    removePendingOperation(storage, "pending", "one");
    expect(readPendingOperations(storage, "pending").map((operation) => operation.operationId)).toEqual(["two"]);
  });

  it("reports a cache quota failure without throwing", () => {
    const error = new DOMException("Full", "QuotaExceededError");
    const storage = { setItem: vi.fn(() => { throw error; }) };
    expect(safeStorageWrite(storage, "cache", "value")).toEqual({ ok: false, error });
  });
});

describe("transient network retries", () => {
  it("retries fetch failures and then returns the successful result", async () => {
    const task = vi.fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockRejectedValueOnce(new Error("NetworkError when attempting to fetch resource"))
      .mockResolvedValue("uploaded");
    const wait = vi.fn().mockResolvedValue(undefined);

    await expect(retryTransient(task, { wait })).resolves.toBe("uploaded");
    expect(task).toHaveBeenCalledTimes(3);
    expect(wait).toHaveBeenCalledTimes(2);
  });

  it("does not retry permission or validation failures", async () => {
    const task = vi.fn().mockRejectedValue(new Error("row-level security policy"));
    await expect(retryTransient(task, { wait: vi.fn() })).rejects.toThrow("row-level security");
    expect(task).toHaveBeenCalledOnce();
    expect(isTransientNetworkError(new Error("Load failed"))).toBe(true);
  });
});
