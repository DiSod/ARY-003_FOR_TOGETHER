// In-memory data stores with unique key enforcement.
// Each store is a Map; unique constraints are enforced via composite-key index Maps.

const stores = {};

function key(...parts) {
  return parts.join("::");
}

// --- Generic store factory ---
function createStore(name, uniqueIndexes = []) {
  const data = new Map();
  const indexes = {};
  for (const idx of uniqueIndexes) {
    // idx: { fields: ["raceId","userId"], name: "uk_race_user" }
    indexes[idx.name] = { fields: idx.fields, map: new Map() };
  }

  function checkUnique(record, operation) {
    for (const [idxName, idx] of Object.entries(indexes)) {
      const idxKey = key(...idx.fields.map((f) => record[f]));
      if (operation === "insert" && idx.map.has(idxKey)) {
        return { ok: false, reason: `UNIQUE_${idxName}: ${idxKey}`, key: idxKey };
      }
    }
    return { ok: true };
  }

  function updateIndexes(record, operation) {
    for (const idx of Object.values(indexes)) {
      const idxKey = key(...idx.fields.map((f) => record[f]));
      if (operation === "insert") {
        idx.map.set(idxKey, record.id);
      } else if (operation === "delete") {
        idx.map.delete(idxKey);
      }
    }
  }

  const store = {
    name,
    data,
    indexes,
    insert(record) {
      const check = checkUnique(record, "insert");
      if (!check.ok) return { ok: false, ...check };
      data.set(record.id, { ...record });
      updateIndexes(record, "insert");
      return { ok: true, record: data.get(record.id) };
    },
    update(id, patch) {
      const existing = data.get(id);
      if (!existing) return { ok: false, reason: "NOT_FOUND" };
      const merged = { ...existing, ...patch, id };
      // For update, remove old index entries and re-insert
      updateIndexes(existing, "delete");
      const check = checkUnique(merged, "insert");
      if (!check.ok) {
        // Restore old indexes
        updateIndexes(existing, "insert");
        return { ok: false, ...check };
      }
      data.set(id, merged);
      updateIndexes(merged, "insert");
      return { ok: true, record: merged };
    },
    get(id) {
      return data.get(id) ?? null;
    },
    find(fn) {
      return Array.from(data.values()).filter(fn);
    },
    first(fn) {
      return Array.from(data.values()).find(fn) ?? null;
    },
    all() {
      return Array.from(data.values());
    },
    delete(id) {
      const existing = data.get(id);
      if (!existing) return { ok: false, reason: "NOT_FOUND" };
      updateIndexes(existing, "delete");
      data.delete(id);
      return { ok: true };
    },
    has(id) {
      return data.has(id);
    },
    count() {
      return data.size;
    },
    reset() {
      data.clear();
      for (const idx of Object.values(indexes)) idx.map.clear();
    },
  };
  return store;
}

// --- All stores reset ---
function resetAll() {
  for (const store of Object.values(stores)) {
    store.reset();
  }
}

// --- Concrete stores ---
stores.races = createStore("races", [{ fields: ["slug"], name: "uk_slug" }]);

stores.users = createStore("users", [
  { fields: ["githubAccountId"], name: "uk_github" },
  { fields: ["slug"], name: "uk_slug" },
]);

stores.registrations = createStore("registrations", [
  { fields: ["raceId", "userId"], name: "uk_race_user" },
]);

stores.raceProjects = createStore("raceProjects", [
  { fields: ["registrationId"], name: "uk_registration" },
]);

stores.caConnections = createStore("caConnections", [
  { fields: ["raceProjectId", "connectorId", "caProjectId"], name: "uk_rp_connector_caproject" },
]);

stores.sessions = createStore("sessions", [
  { fields: ["caConnectionId", "caSessionId"], name: "uk_cc_session" },
]);

stores.works = createStore("works", [
  { fields: ["registrationId"], name: "uk_registration" },
]);

stores.judgeAssignments = createStore("judgeAssignments", [
  { fields: ["workId", "judgeUserId"], name: "uk_work_judge" },
]);

stores.judgingRecords = createStore("judgingRecords", [
  { fields: ["judgeAssignmentId"], name: "uk_assignment" },
]);

stores.awards = createStore("awards", [
  { fields: ["raceId", "awardName", "rank"], name: "uk_race_award_rank" },
  { fields: ["raceId", "registrationId", "awardName"], name: "uk_race_reg_award" },
]);

stores.evidences = createStore("evidences", []);

stores.reports = createStore("reports", [
  { fields: ["raceId", "reportType", "subjectRegistrationId"], name: "uk_race_type_subject" },
]);

stores.announcements = createStore("announcements", []);

stores.caMessageReceipts = createStore("caMessageReceipts", [
  { fields: ["idempotencyKey"], name: "uk_idempotency" },
  { fields: ["caConnectionId", "sequence"], name: "uk_cc_sequence" },
]);

stores.caQuarantineAudits = createStore("caQuarantineAudits", [
  { fields: ["receiptId"], name: "uk_receipt" },
]);

stores.sessionSummaries = createStore("sessionSummaries", [
  { fields: ["sessionId"], name: "uk_session" },
]);

export { stores, resetAll, key };
