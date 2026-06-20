// ARY MVP — Shared Business Logic
// All DEV-1 domain operations live here; both tests and UI call these functions.
// No raw store manipulation should happen in test files or app.js.
//
// Mirrors: dev-1-architecture-baseline.md, dev-1-state-transitions.md

import { stores } from "./stores.js";
import {
  registrationCanTransition,
  raceCanTransition,
  workCanTransition,
  generateReviewFlags,
  computeConnectionHealth,
} from "./state-machine.js";
import crypto from "node:crypto";

// ============ Helpers ============
function uid() { return crypto.randomUUID(); }
function now() { return new Date().toISOString(); }

// ============ Factory functions (shared by test + app) ============

export function createRace(overrides = {}) {
  return stores.races.insert({
    id: uid(), slug: `race-${uid().slice(0, 8)}`, title: "赛事",
    challengeBrief: "赛题摘要", status: "registration",
    timeWindows: {}, rules: "", submissionRequirements: "", awardSettings: [],
    organizerUserIds: [], createdByUserId: uid(), visibility: "public",
    createdAt: now(), updatedAt: now(), version: 1,
    ...overrides,
  });
}

export function createUser(overrides = {}) {
  return stores.users.insert({
    id: uid(), githubAccountId: `gh-${uid().slice(0, 8)}`, slug: `user-${uid().slice(0, 8)}`,
    displayName: "用户", profile: {}, roles: [],
    profileCompletionStatus: "complete", status: "active",
    createdAt: now(), updatedAt: now(), version: 1,
    ...overrides,
  });
}

export function createRegistration(overrides = {}) {
  return stores.registrations.insert({
    id: uid(), raceId: uid(), userId: uid(), status: "submitted",
    submittedAt: now(), approvedAt: null, approvedByUserId: null,
    rejectedAt: null, rejectedReason: null, withdrawnAt: null, reviewFlags: [],
    createdAt: now(), updatedAt: now(), version: 1,
    ...overrides,
  });
}

export function createRaceProject(overrides = {}) {
  return stores.raceProjects.insert({
    id: uid(), registrationId: uid(), raceId: uid(), userId: uid(),
    repoUrl: null, aggregateIngestionStatus: "not_configured", connectionHealth: "no_signal",
    authenticitySummary: {}, reviewFlags: [], currentPrimaryWorkId: null,
    createdAt: now(), updatedAt: now(), version: 1,
    ...overrides,
  });
}

export function createCAConnection(overrides = {}) {
  return stores.caConnections.insert({
    id: uid(), raceProjectId: uid(), registrationId: uid(), raceId: uid(), userId: uid(),
    caType: "codex", connectorId: `conn-${uid().slice(0, 8)}`, connectorVersion: "1.0",
    caProjectId: `caproj-${uid().slice(0, 8)}`, ingestionStatus: "connected",
    authenticityStatus: "verified", authenticityReason: null,
    appInstanceId: null, deviceKeyId: null, deviceKeyFingerprint: null,
    registeredAt: now(), lastHandshakeAt: now(), lastVerifiedAt: now(),
    disabledAt: null, disabledReason: null,
    createdAt: now(), updatedAt: now(), version: 1,
    ...overrides,
  });
}

export function createSession(overrides = {}) {
  return stores.sessions.insert({
    id: uid(), caConnectionId: uid(), raceProjectId: uid(), registrationId: uid(),
    caSessionId: `ext-${uid().slice(0, 8)}`, status: "active",
    startedAt: now(), completedAt: null, durationMs: null, taskCount: 0, metrics: {},
    createdAt: now(), updatedAt: now(), version: 1,
    ...overrides,
  });
}

export function createWork(overrides = {}) {
  return stores.works.insert({
    id: uid(), registrationId: uid(), raceId: uid(), ownerUserId: uid(),
    title: "作品", summary: null, description: null,
    demoUrl: null, videoUrl: null, repoUrl: null,
    status: "draft", visibility: "public",
    submittedAt: null, lockedAt: null,
    createdAt: now(), updatedAt: now(), version: 1,
    ...overrides,
  });
}

export function createJudgeAssignment(overrides = {}) {
  return stores.judgeAssignments.insert({
    id: uid(), raceId: uid(), workId: uid(), judgeUserId: uid(),
    assignedByUserId: uid(), status: "assigned",
    assignedAt: now(), completedAt: null,
    createdAt: now(), updatedAt: now(), version: 1,
    ...overrides,
  });
}

export function createJudgingRecord(overrides = {}) {
  return stores.judgingRecords.insert({
    id: uid(), judgeAssignmentId: uid(), workId: uid(), judgeUserId: uid(),
    scoreResult: {}, scoreRiding: {}, comments: "", status: "draft",
    submittedAt: null,
    createdAt: now(), updatedAt: now(), version: 1,
    ...overrides,
  });
}

export function createAward(overrides = {}) {
  return stores.awards.insert({
    id: uid(), raceId: uid(), registrationId: uid(), workId: null,
    awardName: "Award", rank: 1, decisionReason: null,
    status: "draft", publishedAt: null,
    createdAt: now(), updatedAt: now(), version: 1,
    ...overrides,
  });
}

// ============ Business operations ============

/**
 * 提交报名 — 唯一键 (raceId, userId) 由 stores 层 enforce。
 * 调用方不需要手动预检，insert 失败会返回 reason。
 */
export function submitRegistration(raceId, userId) {
  // 唯一键由 stores.registrations 自动校验
  const result = stores.registrations.insert({
    id: uid(), raceId, userId, status: "submitted",
    submittedAt: now(), approvedAt: null, approvedByUserId: null,
    rejectedAt: null, rejectedReason: null, withdrawnAt: null, reviewFlags: [],
    createdAt: now(), updatedAt: now(), version: 1,
  });
  if (!result.ok) {
    return { ok: false, reason: result.reason, constraintKey: result.key };
  }
  return { ok: true, registrationId: result.record.id };
}

/**
 * 审核通过 Registration，并幂等创建 RaceProject。
 * 包含：状态迁移校验 → Registration 状态更新 → RaceProject 幂等创建。
 */
export function approveRegistration(registrationId, approvedByUserId) {
  const reg = stores.registrations.get(registrationId);
  if (!reg) return { ok: false, reason: "Registration 不存在" };

  // Idempotent: already approved → just ensure RaceProject exists
  if (reg.status === "approved") {
    const existingRP = stores.raceProjects.first((x) => x.registrationId === registrationId);
    if (existingRP) {
      return { ok: true, raceProjectId: existingRP.id, reason: "RaceProject 已存在（幂等跳过）" };
    }
    // Approved but no RaceProject — create it (recovery)
    const rpResult = stores.raceProjects.insert({
      id: uid(), registrationId, raceId: reg.raceId, userId: reg.userId,
      repoUrl: null, aggregateIngestionStatus: "not_configured", connectionHealth: "no_signal",
      authenticitySummary: {}, reviewFlags: [],
      currentPrimaryWorkId: null,
      createdAt: now(), updatedAt: now(), version: 1,
    });
    if (!rpResult.ok) return { ok: false, reason: "RaceProject 创建失败: " + rpResult.reason };
    return { ok: true, raceProjectId: rpResult.record.id, reason: "RaceProject 已自动生成（补建）" };
  }

  // DEV-1: 状态迁移校验（仅当 status !== approved）
  const transition = registrationCanTransition(reg.status, "approved");
  if (!transition.ok) return { ok: false, reason: transition.reason };

  // 更新 Registration 状态
  const updated = stores.registrations.update(registrationId, {
    status: "approved",
    approvedAt: now(),
    approvedByUserId,
  });
  if (!updated.ok) return { ok: false, reason: "Registration 更新失败" };

  // DEV-1: 幂等创建 RaceProject — registrationId 唯一键 enforce 一个 Registration 最多一个
  const existingRP = stores.raceProjects.first((x) => x.registrationId === registrationId);
  if (existingRP) {
    return { ok: true, raceProjectId: existingRP.id, reason: "RaceProject 已存在（幂等跳过）" };
  }

  const rpResult = stores.raceProjects.insert({
    id: uid(), registrationId, raceId: reg.raceId, userId: reg.userId,
    repoUrl: null, aggregateIngestionStatus: "not_configured", connectionHealth: "no_signal",
    authenticitySummary: {}, reviewFlags: [],
    currentPrimaryWorkId: null,
    createdAt: now(), updatedAt: now(), version: 1,
  });

  if (!rpResult.ok) return { ok: false, reason: "RaceProject 创建失败: " + rpResult.reason };
  return { ok: true, raceProjectId: rpResult.record.id, reason: "RaceProject 已自动生成" };
}

/**
 * 提交 Work — 唯一键 (registrationId) 由 stores 层 enforce。
 */
export function submitWork(registrationId, overrides = {}) {
  const reg = stores.registrations.get(registrationId);
  if (!reg) return { ok: false, reason: "Registration 不存在" };

  const existing = stores.works.first((x) => x.registrationId === registrationId);
  const isUpdate = !!existing;

  if (isUpdate) {
    const transition = workCanTransition(existing.status, "submitted");
    if (!transition.ok) return { ok: false, reason: transition.reason };
    const result = stores.works.update(existing.id, {
      status: "submitted", submittedAt: now(), ...overrides,
    });
    return result.ok
      ? { ok: true, workId: result.record.id, updated: true }
      : { ok: false, reason: result.reason };
  }

  const result = stores.works.insert({
    id: uid(), registrationId, raceId: reg.raceId, ownerUserId: reg.userId,
    title: "作品", summary: null, description: null,
    demoUrl: null, videoUrl: null, repoUrl: null,
    status: "draft", visibility: "public",
    submittedAt: null, lockedAt: null,
    createdAt: now(), updatedAt: now(), version: 1,
    ...overrides,
  });
  if (!result.ok) return { ok: false, reason: result.reason };

  // Then submit
  const submitted = stores.works.update(result.record.id, {
    status: "submitted", submittedAt: now(),
  });
  if (!submitted.ok) return { ok: false, reason: "Work 提交失败" };
  return { ok: true, workId: submitted.record.id };
}

/**
 * 为 Registration 计算当前 DEV-1 约束状态（供 UI 展示）。
 */
export function computeRegistrationConstraints(registrationId) {
  const reg = stores.registrations.get(registrationId);
  if (!reg) return null;

  const rp = stores.raceProjects.first((x) => x.registrationId === registrationId);
  const works = stores.works.find((x) => x.registrationId === registrationId);
  const ccs = stores.caConnections.find((x) => x.raceProjectId === rp?.id);
  const regsForRace = stores.registrations.find((x) => x.raceId === reg.raceId && x.userId === reg.userId);

  return {
    registration: {
      ok: regsForRace.length === 1,
      label: "唯一 Registration",
      detail: regsForRace.length === 1
        ? "(raceId, userId) 唯一键正常"
        : `违反唯一键：${regsForRace.length} 条报名`,
    },
    raceProject: {
      ok: !!rp && stores.raceProjects.find((x) => x.registrationId === registrationId).length === 1,
      label: "RaceProject 存在且唯一",
      detail: rp
        ? `aggregateIngestionStatus: ${rp.aggregateIngestionStatus}`
        : "Registration 未 approved",
    },
    work: {
      ok: works.length <= 1,
      label: "主 Work 唯一",
      detail: works.length === 0
        ? "尚未创建 Work"
        : `${works.length} 个 Work（≤1 通过）`,
    },
    caConnection: {
      ok: true,
      label: "CAConnection 不重复登记",
      detail: `${ccs.length} 个 CAConnection — 唯一键保护`,
    },
    reviewFlags: reg.reviewFlags || [],
  };
}

// Export uid/now for convenience
export { uid, now };
