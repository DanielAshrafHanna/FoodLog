export function readPendingOperations(storage, key, actorEmail = "") {
  try {
    const parsed = JSON.parse(storage.getItem(key) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    const actor = String(actorEmail).trim().toLowerCase();
    return parsed.filter((operation) => {
      if (!operation || typeof operation !== "object") return false;
      return !actor || String(operation.actorEmail).toLowerCase() === actor;
    });
  } catch {
    return [];
  }
}

export function upsertPendingOperation(storage, key, operation) {
  const all = readPendingOperations(storage, key);
  const actorEmail = String(operation.actorEmail ?? "").trim().toLowerCase();
  const match = all.find((candidate) =>
    candidate.kind === operation.kind &&
    candidate.entityId === operation.entityId &&
    String(candidate.actorEmail).toLowerCase() === actorEmail
  );
  const next = {
    ...operation,
    actorEmail,
    operationId: match?.operationId ?? operation.operationId,
    create: Boolean(match?.create || operation.create),
    queuedAt: match?.queuedAt ?? operation.queuedAt ?? Date.now(),
    updatedAt: Date.now()
  };
  storage.setItem(key, JSON.stringify(
    match ? all.map((candidate) => candidate === match ? next : candidate) : [...all, next]
  ));
  return next;
}

export function removePendingOperation(storage, key, operationId) {
  const all = readPendingOperations(storage, key);
  storage.setItem(key, JSON.stringify(all.filter((operation) => operation.operationId !== operationId)));
}

export function safeStorageWrite(storage, key, value) {
  try {
    storage.setItem(key, value);
    return { ok: true, error: null };
  } catch (error) {
    return { ok: false, error };
  }
}
