// ARY MVP — Application Core (browser runtime).
// Exposed as window.ARY_CORE = { stores, auth, stateMachine, caVerifier, factory, business }
// This is the production runtime; test shims live in test-modules.js and attach separately.
//
// Node equivalent: project/src/*.js (stores.js, auth.js, state-machine.js, ca-verifier.js, business.js)

(function () {
  "use strict";

  // --- UUID helper ---
  function uid() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
  function now() {
    return new Date().toISOString();
  }

  // --- Simple hash ---
  function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      hash = (hash << 5) - hash + ch;
      hash |= 0;
    }
    return hash.toString(16);
  }

  // ============ STORES ============
  function createStore(name, uniqueIndexes) {
    const data = new Map();
    const indexes = {};
    for (const idx of uniqueIndexes) {
      indexes[idx.name] = { fields: idx.fields, map: new Map() };
    }

    function idxKey(record, fields) {
      return fields.map((f) => record[f]).join("::");
    }

    function checkUnique(record) {
      for (const [idxName, idx] of Object.entries(indexes)) {
        const k = idxKey(record, idx.fields);
        if (idx.map.has(k)) return { ok: false, reason: "UNIQUE_" + idxName + ": " + k, key: k };
      }
      return { ok: true };
    }

    function updateIndexes(record, op) {
      for (const idx of Object.values(indexes)) {
        const k = idxKey(record, idx.fields);
        if (op === "insert") idx.map.set(k, record.id);
        else idx.map.delete(k);
      }
    }

    const store = {
      name,
      data,
      indexes,
      insert(record) {
        const check = checkUnique(record);
        if (!check.ok) return { ok: false, ...check };
        data.set(record.id, { ...record });
        updateIndexes(record, "insert");
        return { ok: true, record: data.get(record.id) };
      },
      update(id, patch) {
        const existing = data.get(id);
        if (!existing) return { ok: false, reason: "NOT_FOUND" };
        const merged = { ...existing, ...patch, id };
        updateIndexes(existing, "delete");
        const check = checkUnique(merged);
        if (!check.ok) { updateIndexes(existing, "insert"); return { ok: false, ...check }; }
        data.set(id, merged);
        updateIndexes(merged, "insert");
        return { ok: true, record: merged };
      },
      get(id) { return data.get(id) ?? null; },
      find(fn) { return Array.from(data.values()).filter(fn); },
      first(fn) { return Array.from(data.values()).find(fn) ?? null; },
      all() { return Array.from(data.values()); },
      count() { return data.size; },
      delete(id) {
        const existing = data.get(id);
        if (!existing) return { ok: false, reason: "NOT_FOUND" };
        updateIndexes(existing, "delete");
        data.delete(id);
        return { ok: true };
      },
      reset() { data.clear(); for (const idx of Object.values(indexes)) idx.map.clear(); },
    };
    return store;
  }

  const stores = {};
  stores.races = createStore("races", [{ fields: ["slug"], name: "uk_slug" }]);
  stores.users = createStore("users", [{ fields: ["githubAccountId"], name: "uk_github" }, { fields: ["slug"], name: "uk_slug" }]);
  stores.registrations = createStore("registrations", [{ fields: ["raceId", "userId"], name: "uk_race_user" }]);
  stores.raceProjects = createStore("raceProjects", [{ fields: ["registrationId"], name: "uk_registration" }]);
  stores.caConnections = createStore("caConnections", [{ fields: ["raceProjectId", "connectorId", "caProjectId"], name: "uk_rp_connector_caproject" }]);
  stores.sessions = createStore("sessions", [{ fields: ["caConnectionId", "caSessionId"], name: "uk_cc_session" }]);
  stores.works = createStore("works", [{ fields: ["registrationId"], name: "uk_registration" }]);
  stores.judgeAssignments = createStore("judgeAssignments", [{ fields: ["workId", "judgeUserId"], name: "uk_work_judge" }]);
  stores.judgingRecords = createStore("judgingRecords", [{ fields: ["judgeAssignmentId"], name: "uk_assignment" }]);
  stores.awards = createStore("awards", [{ fields: ["raceId", "awardName", "rank"], name: "uk_race_award_rank" }, { fields: ["raceId", "registrationId", "awardName"], name: "uk_race_reg_award" }]);
  stores.evidences = createStore("evidences", []);
  stores.reports = createStore("reports", [{ fields: ["raceId", "reportType", "subjectRegistrationId"], name: "uk_race_type_subject" }]);
  stores.announcements = createStore("announcements", []);
  stores.caMessageReceipts = createStore("caMessageReceipts", [{ fields: ["idempotencyKey"], name: "uk_idempotency" }, { fields: ["caConnectionId", "sequence"], name: "uk_cc_sequence" }]);
  stores.caQuarantineAudits = createStore("caQuarantineAudits", [{ fields: ["receiptId"], name: "uk_receipt" }]);
  stores.sessionSummaries = createStore("sessionSummaries", [{ fields: ["sessionId"], name: "uk_session" }]);

  function resetAll() { for (const s of Object.values(stores)) s.reset(); }

  // ============ AUTH ============
  function isOwn(resource, user) {
    if (!user) return false;
    const userId = user.id || user.userId;
    if (resource.userId === userId) return true;
    if (resource.ownerUserId === userId) return true;
    if (resource.subjectRegistrationId) {
      const reg = stores.registrations.get(resource.subjectRegistrationId);
      if (reg && reg.userId === userId) return true;
    }
    return false;
  }

  function isAssigned(workId, user) {
    if (!user || !(user.roles || []).includes("judge")) return false;
    const uid = user.id || user.userId;
    return !!stores.judgeAssignments.first((a) => a.workId === workId && a.judgeUserId === uid && a.status !== "completed");
  }

  function isManagedRace(resource, user) {
    if (!user) return false;
    if (!(user.roles || []).includes("organizer") && !(user.roles || []).includes("admin")) return false;
    const uid = user.id || user.userId;
    let raceId = resource.raceId;
    if (!raceId && resource.registrationId) {
      const reg = stores.registrations.get(resource.registrationId);
      if (reg) raceId = reg.raceId;
    }
    if (!raceId) return false;
    const race = stores.races.get(raceId);
    if (!race) return false;
    return (race.organizerUserIds || []).includes(uid) || race.createdByUserId === uid;
  }

  function isSystem(user) { return user && (user.roles || []).includes("admin"); }

  function ownGate(resource, user) { return isOwn(resource, user); }
  function assignedGate(workId, user) { return isAssigned(workId, user); }
  function managedRaceGate(resource, user) { return isManagedRace(resource, user); }
  function adminGate(user) { return isSystem(user); }

  function authenticityFilter(result) {
    const allowed = ["verified", "verification_failed", "quarantined"];
    if (!allowed.includes(result.authenticityStatus)) return { status: "filtered", allowed: false };
    return { status: result.authenticityStatus, reason: result.authenticityReason ?? null, lastVerifiedAt: result.lastVerifiedAt ?? null };
  }

  function quarantineSummaryFilter(record) {
    if (!record) return null;
    return { failureReason: record.failureReason, quarantinedAt: record.quarantinedAt, quarantineStatus: record.quarantineStatus, caConnectionId: record.caConnectionId };
  }

  // ============ STATE MACHINE ============
  const RACE_TRANSITIONS = { draft: ["published", "archived"], published: ["registration"], registration: ["running"], running: ["submitting"], submitting: ["judging"], judging: ["completed"], completed: ["archived"], archived: [] };
  const REGISTRATION_TRANSITIONS = { submitted: ["approved", "rejected"], approved: ["withdrawn"], rejected: [], withdrawn: [] };
  const WORK_TRANSITIONS = { draft: ["submitted", "hidden"], submitted: ["locked"], locked: ["hidden"], hidden: [] };
  const JUDGING_TRANSITIONS = { draft: ["submitted"], submitted: [] };
  const AWARD_TRANSITIONS = { draft: ["published"], published: ["withdrawn"], withdrawn: [] };
  const RP_INGESTION_TRANSITIONS = { not_configured: ["connected"], connected: ["active", "failed"], active: ["connected", "failed"], failed: ["connected"] };

  function raceCanTransition(from, to) { const allowed = RACE_TRANSITIONS[from] || []; if (allowed.includes(to)) return { ok: true }; if (from === "completed" && to === "judging") return { ok: false, reason: "赛后结果不可回退重评" }; if (from === "archived") return { ok: false, reason: "归档态是终态" }; if (from === "draft" && to === "registration") return { ok: false, reason: "必须先发布才能报名" }; if (from === "running" && to === "judging") return { ok: false, reason: "必须给选手提交窗口" }; return { ok: false, reason: "不允许 " + from + " → " + to }; }
  function registrationCanTransition(from, to) { const allowed = REGISTRATION_TRANSITIONS[from] || []; if (allowed.includes(to)) return { ok: true }; if (to === "withdrawn" && from !== "approved") return { ok: false, reason: "CA 接入状态不驱动 Registration 进入 withdrawn" }; return { ok: false, reason: "不允许 " + from + " → " + to }; }
  function workCanTransition(from, to) { const allowed = WORK_TRANSITIONS[from] || []; if (allowed.includes(to)) return { ok: true }; if (from === "locked" && to === "draft") return { ok: false, reason: "locked 不可回退到 draft" }; if (from === "submitted" && to === "draft") return { ok: false, reason: "submitted 不可回退到 draft" }; return { ok: false, reason: "Work 不允许 " + from + " → " + to }; }
  function judgingCanTransition(from, to) { const allowed = JUDGING_TRANSITIONS[from] || []; if (allowed.includes(to)) return { ok: true }; return { ok: false, reason: "JudgingRecord 不允许 " + from + " → " + to }; }
  function awardCanTransition(from, to) { const allowed = AWARD_TRANSITIONS[from] || []; if (allowed.includes(to)) return { ok: true }; if (from === "published" && to === "draft") return { ok: false, reason: "已发布赛果不可撤回草稿" }; return { ok: false, reason: "Award 不允许 " + from + " → " + to }; }
  function rpIngestionCanTransition(from, to) { const allowed = RP_INGESTION_TRANSITIONS[from] || []; if (allowed.includes(to)) return { ok: true }; return { ok: false, reason: "RaceProject.aggregateIngestionStatus 不允许 " + from + " → " + to }; }

  function computeConnectionHealth(statuses) {
    const total = statuses.length;
    if (total === 0) return "no_signal";
    const active = statuses.filter((s) => s === "active").length;
    const connected = statuses.filter((s) => s === "connected").length;
    const failed = statuses.filter((s) => s === "failed").length;
    const disabled = statuses.filter((s) => s === "disabled").length;
    const usable = active + connected;
    if (usable === 0) return "all_failed";
    if (failed > 0 || disabled > 0) return "partial_failed";
    if (usable === total) return "ok";
    return "ok";
  }

  function generateReviewFlags(rp) {
    const flags = [];
    if (rp.aggregateIngestionStatus === "not_configured") flags.push({ flagType: "ca_unconfigured", reason: "RaceProject 下无已登记 CAConnection", createdAt: now(), resolved: false });
    if (rp.aggregateIngestionStatus === "failed") flags.push({ flagType: "ca_failed", reason: "全部 CAConnection 接入失败", createdAt: now(), resolved: false });
    if (rp.connectionHealth === "partial_failed") flags.push({ flagType: "ca_failed", reason: "部分 CAConnection 接入异常", createdAt: now(), resolved: false });
    return flags;
  }

  // ============ CA VERIFIER ============
  const deviceKeys = new Map();
  function registerDeviceKey(appInstanceId, deviceKeyId) { deviceKeys.set(deviceKeyId, { appInstanceId, revoked: false }); }
  function revokeDeviceKey(deviceKeyId) { const e = deviceKeys.get(deviceKeyId); if (e) e.revoked = true; }
  function resetKeys() { deviceKeys.clear(); }

  function normalizeBody(body) {
    const keys = Object.keys(body).sort();
    const result = {};
    for (const k of keys) result[k] = body[k];
    return JSON.stringify(result);
  }

  function verifyMessage(message) {
    const { appInstanceId, deviceKeyId, nonce, sequence, timestamp, caConnectionId, signature, body } = message;
    const receiptId = uid();
    const nowTs = Date.now();

    const caConn = stores.caConnections.get(caConnectionId);
    if (!caConn || caConn.appInstanceId !== appInstanceId) return createReceipt(receiptId, caConnectionId, message, "app_instance_unknown");

    const keyEntry = deviceKeys.get(deviceKeyId);
    if (!keyEntry || keyEntry.revoked) return createReceipt(receiptId, caConnectionId, message, "key_revoked");
    if (keyEntry.appInstanceId !== appInstanceId) return createReceipt(receiptId, caConnectionId, message, "app_instance_unknown");

    const normalized = normalizeBody(body);
    const computedHash = simpleHash(normalized);
    if (signature.bodyHash !== computedHash) return createReceipt(receiptId, caConnectionId, message, "body_hash_mismatch");
    if (!signature.value || signature.value.length < 8) return createReceipt(receiptId, caConnectionId, message, "signature_mismatch");

    const msgTime = new Date(timestamp).getTime();
    if (Math.abs(nowTs - msgTime) > 5 * 60 * 1000) return createReceipt(receiptId, caConnectionId, message, "timestamp_out_of_range");

    const existing = stores.caMessageReceipts.first((r) => r.idempotencyKey === message.idempotencyKey);
    if (existing) return createReceipt(receiptId, caConnectionId, message, "nonce_replayed");

    const prev = stores.caMessageReceipts.find((r) => r.caConnectionId === caConnectionId);
    const maxSeq = prev.reduce((m, r) => Math.max(m, r.sequence ?? 0), 0);
    if (sequence <= maxSeq) return createReceipt(receiptId, caConnectionId, message, "sequence_regression");

    return createReceipt(receiptId, caConnectionId, message, "passed");
  }

  function createReceipt(receiptId, caConnectionId, message, verificationResult) {
    stores.caMessageReceipts.insert({
      id: receiptId, receiptId, caConnectionId, messageId: message.messageId, idempotencyKey: message.idempotencyKey,
      schemaVersion: message.schemaVersion ?? "ary.ca.riding_signal.v0.1", timestamp: message.timestamp, nonce: message.nonce,
      sequence: message.sequence, signatureAlgorithm: message.signature?.algorithm ?? "ecdsa-p256",
      signatureBodyHash: message.signature?.bodyHash ?? "", verificationResult, createdAt: now(),
    });
    if (verificationResult !== "passed") {
      stores.caQuarantineAudits.insert({
        id: uid(), quarantineId: uid(), receiptId, caConnectionId,
        raceProjectId: stores.caConnections.get(caConnectionId)?.raceProjectId ?? "unknown",
        registrationId: stores.caConnections.get(caConnectionId)?.registrationId ?? "unknown",
        failureReason: verificationResult, quarantineStatus: "pending_review", quarantinedAt: now(),
        reviewedByUserId: null, reviewedAt: null, dispositionNote: null,
        rawMessageMetadata: { messageId: message.messageId, timestamp: message.timestamp },
        createdAt: now(), updatedAt: now(),
      });
    }
    return { receiptId, verificationResult, passed: verificationResult === "passed" };
  }

  function canEnterSession(session) {
    const caConn = stores.caConnections.get(session.caConnectionId);
    if (!caConn) return { ok: false, reason: "CAConnection 未登记" };
    if (caConn.ingestionStatus === "not_configured") return { ok: false, reason: "CAConnection 未握手" };
    if (caConn.ingestionStatus === "connected" && caConn.authenticityStatus !== "verified") return { ok: false, reason: "CAConnection 未通过真实性校验" };
    if (caConn.disabledAt) return { ok: false, reason: "CAConnection 已被禁用" };
    const rp = stores.raceProjects.get(caConn.raceProjectId);
    if (!rp) return { ok: false, reason: "RaceProject 不存在" };
    if (session.registrationId && rp.registrationId !== session.registrationId) return { ok: false, reason: "归属错误" };
    return { ok: true };
  }

  function canGenerateSessionSummary(sessionId) {
    const session = stores.sessions.get(sessionId);
    if (!session) return { ok: false, reason: "Session 不存在" };
    const caConn = stores.caConnections.get(session.caConnectionId);
    if (!caConn || caConn.authenticityStatus !== "verified" || caConn.disabledAt) {
      return { ok: false, reason: "CAConnection 真实性校验未通过或已禁用 — 数据不得进入 Evidence/Projection" };
    }
    return { ok: true };
  }

  function generateSessionSummary(sessionId) {
    const canGen = canGenerateSessionSummary(sessionId);
    if (!canGen.ok) return canGen;
    const session = stores.sessions.get(sessionId);
    return stores.sessionSummaries.insert({
      id: uid(), sessionSummaryId: uid(), sessionId, caConnectionId: session.caConnectionId,
      raceProjectId: session.raceProjectId, registrationId: session.registrationId,
      summaryType: "auto_generated", content: "Session " + sessionId.slice(0,8) + " 骑行摘要", metrics: session.metrics || {},
      capabilityTags: [], generatedAt: now(), createdAt: now(), updatedAt: now(),
    });
  }

  // ============ FACTORY ============
  const factory = {
    race(overrides = {}) {
      return stores.races.insert({ id: uid(), slug: `race-${uid().slice(0, 8)}`, title: "赛事", challengeBrief: "赛题摘要", status: "registration", timeWindows: {}, rules: "", submissionRequirements: "", awardSettings: [], organizerUserIds: [], createdByUserId: uid(), visibility: "public", createdAt: now(), updatedAt: now(), version: 1, ...overrides });
    },
    user(overrides = {}) {
      return stores.users.insert({ id: uid(), githubAccountId: `gh-${uid().slice(0, 8)}`, slug: `user-${uid().slice(0, 8)}`, displayName: "用户", profile: {}, roles: [], profileCompletionStatus: "complete", status: "active", createdAt: now(), updatedAt: now(), version: 1, ...overrides });
    },
    registration(overrides = {}) {
      return stores.registrations.insert({ id: uid(), raceId: uid(), userId: uid(), status: "submitted", submittedAt: now(), approvedAt: null, approvedByUserId: null, rejectedAt: null, rejectedReason: null, withdrawnAt: null, reviewFlags: [], createdAt: now(), updatedAt: now(), version: 1, ...overrides });
    },
  };

  // ============ BUSINESS ============
  const business = {
    submitRegistration(raceId, userId) {
      return stores.registrations.insert({ id: uid(), raceId, userId, status: "submitted", submittedAt: now(), approvedAt: null, approvedByUserId: null, rejectedAt: null, rejectedReason: null, withdrawnAt: null, reviewFlags: [], createdAt: now(), updatedAt: now(), version: 1 });
    },
    approveRegistration(registrationId, approvedByUserId) {
      const reg = stores.registrations.get(registrationId);
      if (!reg) return { ok: false, reason: "Registration 不存在" };
      if (reg.status === "approved") {
        const existingRP = stores.raceProjects.first((x) => x.registrationId === registrationId);
        if (existingRP) return { ok: true, raceProjectId: existingRP.id, reason: "RaceProject 已存在（幂等跳过）" };
        const rpResult = stores.raceProjects.insert({ id: uid(), registrationId, raceId: reg.raceId, userId: reg.userId, repoUrl: null, aggregateIngestionStatus: "not_configured", connectionHealth: "no_signal", authenticitySummary: {}, reviewFlags: [], currentPrimaryWorkId: null, createdAt: now(), updatedAt: now(), version: 1 });
        if (!rpResult.ok) return { ok: false, reason: "RaceProject 创建失败: " + rpResult.reason };
        return { ok: true, raceProjectId: rpResult.record.id, reason: "RaceProject 已自动生成（补建）" };
      }
      const allowed = registrationCanTransition(reg.status, "approved");
      if (!allowed.ok) return { ok: false, reason: allowed.reason };
      stores.registrations.update(registrationId, { status: "approved", approvedAt: now(), approvedByUserId });
      const existingRP = stores.raceProjects.first((x) => x.registrationId === registrationId);
      if (existingRP) return { ok: true, raceProjectId: existingRP.id, reason: "RaceProject 已存在（幂等跳过）" };
      const rpResult = stores.raceProjects.insert({ id: uid(), registrationId, raceId: reg.raceId, userId: reg.userId, repoUrl: null, aggregateIngestionStatus: "not_configured", connectionHealth: "no_signal", authenticitySummary: {}, reviewFlags: [], currentPrimaryWorkId: null, createdAt: now(), updatedAt: now(), version: 1 });
      if (!rpResult.ok) return { ok: false, reason: "RaceProject 创建失败: " + rpResult.reason };
      return { ok: true, raceProjectId: rpResult.record.id, reason: "RaceProject 已自动生成" };
    },
    syncRaceProjectStatus(rpId) {
      const rp = stores.raceProjects.get(rpId);
      if (!rp) return;
      const ccs = stores.caConnections.find((x) => x.raceProjectId === rpId);
      const activeCcs = ccs.filter((c) => !c.disabledAt && c.authenticityStatus === "verified");
      const hasSession = stores.sessions.first((x) => ccs.some((c) => c.id === x.caConnectionId));
      const statuses = ccs.map((c) => c.disabledAt ? "disabled" : c.ingestionStatus);
      const health = computeConnectionHealth(statuses);
      const aggStatus = ccs.length === 0 ? "not_configured" : activeCcs.length === 0 ? "failed" : hasSession ? "active" : "connected";
      stores.raceProjects.update(rpId, { aggregateIngestionStatus: aggStatus, connectionHealth: health });
    },
  };

  // ============ EXPORT ============
  window.ARY_CORE = {
    uid, now, stores, resetAll, resetKeys,
    auth: { ownGate, assignedGate, managedRaceGate, adminGate, authenticityFilter, quarantineSummaryFilter },
    stateMachine: { raceCanTransition, registrationCanTransition, workCanTransition, judgingCanTransition, awardCanTransition, rpIngestionCanTransition, computeConnectionHealth, generateReviewFlags },
    caVerifier: { verifyMessage, canEnterSession, registerDeviceKey, revokeDeviceKey, resetKeys, normalizeBody, simpleHash, canGenerateSessionSummary, generateSessionSummary },
    factory,
    business,
  };

  // Legacy alias — remove once all consumers migrated
  window.ARY_TEST = window.ARY_CORE;
})();
