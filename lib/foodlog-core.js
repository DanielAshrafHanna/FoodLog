export const MAX_DECISION_VOTES = 3;

export function isActiveRecord(record) {
  return !record?.deletedAt && !record?.deleted_at;
}

export function activeRecords(records = []) {
  return records.filter(isActiveRecord);
}

export function trashRecord(record, actor, now = new Date().toISOString()) {
  if (!record) throw new Error("Choose an item to move to Trash.");
  if (!String(actor ?? "").trim()) throw new Error("A signed-in editor is required.");
  if (!isActiveRecord(record)) return { ...record };
  return {
    ...record,
    deletedAt: now,
    deletedBy: String(actor).trim().toLowerCase()
  };
}

export function restoreRecord(record) {
  if (!record) throw new Error("Choose an item to restore.");
  return {
    ...record,
    deletedAt: null,
    deletedBy: null
  };
}

export function normalizeRestaurantKey(restaurant) {
  return [restaurant?.name, restaurant?.location]
    .map((value) => String(value ?? "").trim().toLocaleLowerCase())
    .join("::");
}

export function findRestaurantDuplicates(incoming = [], existing = []) {
  const existingKeys = new Set(existing.map(normalizeRestaurantKey));
  const seen = new Set();
  const duplicates = [];

  incoming.forEach((restaurant, index) => {
    const key = normalizeRestaurantKey(restaurant);
    if (!key || key === "::") return;
    if (existingKeys.has(key) || seen.has(key)) {
      duplicates.push({
        index,
        name: String(restaurant?.name ?? "").trim(),
        location: String(restaurant?.location ?? "").trim(),
        key
      });
    }
    seen.add(key);
  });

  return duplicates;
}

function validateRating(value, path, errors) {
  if (value === null || value === undefined || value === "") return;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 5) {
    errors.push(`${path} must be between 0 and 5.`);
  }
}

export function validateImportPayload(payload) {
  const errors = [];
  if (!Array.isArray(payload)) {
    return { valid: false, errors: ["The import must contain an array of restaurants."] };
  }

  payload.forEach((restaurant, restaurantIndex) => {
    const path = `Restaurant ${restaurantIndex + 1}`;
    if (!restaurant || typeof restaurant !== "object" || Array.isArray(restaurant)) {
      errors.push(`${path} must be an object.`);
      return;
    }
    if (!String(restaurant.name ?? "").trim()) errors.push(`${path} needs a name.`);
    if (!String(restaurant.location ?? "").trim()) errors.push(`${path} needs a location.`);
    if (!String(restaurant.cuisine ?? "").trim()) errors.push(`${path} needs a cuisine.`);
    if (restaurant.dishes !== undefined && !Array.isArray(restaurant.dishes)) {
      errors.push(`${path}.dishes must be an array.`);
    }
    if (restaurant.photos !== undefined && !Array.isArray(restaurant.photos)) {
      errors.push(`${path}.photos must be an array.`);
    }
    const restaurantRatings = Array.isArray(restaurant.ratings) ? restaurant.ratings : [];
    const dishes = Array.isArray(restaurant.dishes) ? restaurant.dishes : [];
    restaurantRatings.forEach((rating, ratingIndex) => {
      validateRating(rating?.rating, `${path} rating ${ratingIndex + 1}`, errors);
    });
    dishes.forEach((dish, dishIndex) => {
      if (!String(dish?.name ?? "").trim()) {
        errors.push(`${path}, dish ${dishIndex + 1} needs a name.`);
      }
      validateRating(dish?.rating, `${path}, dish ${dishIndex + 1} rating`, errors);
      const ratings = Array.isArray(dish?.ratings) ? dish.ratings : [];
      ratings.forEach((rating, ratingIndex) => {
        validateRating(
          rating?.rating,
          `${path}, dish ${dishIndex + 1}, rating ${ratingIndex + 1}`,
          errors
        );
      });
    });
  });

  return { valid: errors.length === 0, errors };
}

export function createDecisionSession(
  { title, notes = "", plannedAt = null, createdBy, candidates = [] },
  createId = () => crypto.randomUUID(),
  now = new Date().toISOString()
) {
  const cleanTitle = String(title ?? "").trim();
  const cleanCreator = String(createdBy ?? "").trim().toLowerCase();
  if (!cleanTitle) throw new Error("Give this decision a title.");
  if (!cleanCreator) throw new Error("A signed-in editor is required.");

  return {
    id: createId(),
    title: cleanTitle,
    notes: String(notes ?? "").trim(),
    plannedAt,
    status: "open",
    createdBy: cleanCreator,
    selectedRestaurantId: null,
    decidedAt: null,
    createdAt: now,
    updatedAt: now,
    candidates: [...new Set(candidates.filter(Boolean))],
    votes: []
  };
}

export function addDecisionCandidate(session, restaurantId, now = new Date().toISOString()) {
  if (!session || session.status !== "open") throw new Error("Reopen the session before changing its shortlist.");
  if (!restaurantId) throw new Error("Choose a place to add.");
  if (session.candidates.includes(restaurantId)) return { ...session };
  return {
    ...session,
    candidates: [...session.candidates, restaurantId],
    updatedAt: now
  };
}

export function toggleDecisionVote(
  session,
  restaurantId,
  voterEmail,
  now = new Date().toISOString()
) {
  if (!session || session.status !== "open") throw new Error("Voting is closed for this session.");
  if (!session.candidates.includes(restaurantId)) throw new Error("That place is not on the shortlist.");
  const voter = String(voterEmail ?? "").trim().toLowerCase();
  if (!voter) throw new Error("Sign in to vote.");

  const existingIndex = session.votes.findIndex(
    (vote) => vote.restaurantId === restaurantId && vote.voterEmail.toLowerCase() === voter
  );
  if (existingIndex >= 0) {
    return {
      ...session,
      votes: session.votes.filter((_, index) => index !== existingIndex),
      updatedAt: now
    };
  }

  const voterCount = session.votes.filter(
    (vote) => vote.voterEmail.toLowerCase() === voter
  ).length;
  if (voterCount >= MAX_DECISION_VOTES) {
    throw new Error(`You can vote for up to ${MAX_DECISION_VOTES} places.`);
  }

  return {
    ...session,
    votes: [...session.votes, { restaurantId, voterEmail: voter, createdAt: now }],
    updatedAt: now
  };
}

export function decisionVoteSummary(session) {
  const counts = new Map((session?.candidates ?? []).map((id) => [id, 0]));
  (session?.votes ?? []).forEach((vote) => {
    if (counts.has(vote.restaurantId)) {
      counts.set(vote.restaurantId, counts.get(vote.restaurantId) + 1);
    }
  });
  return [...counts.entries()]
    .map(([restaurantId, voteCount]) => ({ restaurantId, voteCount }))
    .sort((a, b) => b.voteCount - a.voteCount || a.restaurantId.localeCompare(b.restaurantId));
}

export function closeDecisionSession(
  session,
  random = Math.random,
  now = new Date().toISOString()
) {
  if (!session || session.status !== "open") throw new Error("This session is already closed.");
  const summary = decisionVoteSummary(session);
  if (!summary.length) throw new Error("Add at least one place before closing the session.");
  const topCount = summary[0].voteCount;
  const leaders = summary.filter((entry) => entry.voteCount === topCount);
  const index = Math.min(leaders.length - 1, Math.floor(random() * leaders.length));

  return {
    ...session,
    status: "closed",
    selectedRestaurantId: leaders[index].restaurantId,
    decidedAt: now,
    updatedAt: now
  };
}

export function reopenDecisionSession(session, now = new Date().toISOString()) {
  if (!session) throw new Error("Choose a session to reopen.");
  return {
    ...session,
    status: "open",
    selectedRestaurantId: null,
    decidedAt: null,
    updatedAt: now
  };
}

export function createSubmissionGate() {
  const active = new Set();
  return {
    isActive(key) {
      return active.has(key);
    },
    async run(key, task) {
      if (active.has(key)) return { accepted: false, value: undefined };
      active.add(key);
      try {
        return { accepted: true, value: await task() };
      } finally {
        active.delete(key);
      }
    }
  };
}

export function createTrailingRefreshQueue(refresh) {
  let running = false;
  let trailing = false;
  return {
    get running() {
      return running;
    },
    request() {
      if (running) {
        trailing = true;
        return;
      }
      running = true;
      void (async () => {
        try {
          do {
            trailing = false;
            await refresh();
          } while (trailing);
        } finally {
          running = false;
        }
      })();
    }
  };
}

export async function runCompensated(prepare, commit, cleanup) {
  const prepared = await prepare();
  try {
    return await commit(prepared);
  } catch (error) {
    await cleanup(prepared);
    throw error;
  }
}
