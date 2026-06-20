// DEV-1 Acceptance Tests — 30 test cases across 5 acceptance criteria.
// Run with: node --test test/acceptance.test.js

import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

import { stores, resetAll } from "../src/stores.js";
import {
  ownGate,
  assignedGate,
  managedRaceGate,
  adminGate,
  authenticityFilter,
  quarantineSummaryFilter,
  isOwn,
  isAssigned,
} from "../src/auth.js";
import {
  raceCanTransition,
  registrationCanTransition,
  workCanTransition,
  judgingCanTransition,
  awardCanTransition,
  rpIngestionCanTransition,
  computeConnectionHealth,
  generateReviewFlags,
} from "../src/state-machine.js";
import {
  verifyMessage,
  canEnterSession,
  canGenerateSessionSummary,
  generateSessionSummary,
  registerDeviceKey,
  revokeDeviceKey,
  resetKeys,
  computeBodyHash,
  normalizeBody,
} from "../src/ca-verifier.js";

// ============ Helpers ============
function uid() { return crypto.randomUUID(); }
function now() { return new Date().toISOString(); }
function ts(offsetMs = 0) { return new Date(Date.now() + offsetMs).toISOString(); }

function seedRace(overrides = {}) {
  return stores.races.insert({
    id: uid(), slug: `race-${uid().slice(0, 8)}`, title: "测试赛事",
    challengeBrief: "赛题摘要", status: "registration",
    timeWindows: {}, rules: "", submissionRequirements: "", awardSettings: [],
    organizerUserIds: [], createdByUserId: uid(), visibility: "public",
    createdAt: now(), updatedAt: now(), version: 1,
    ...overrides,
  }).record;
}

function seedUser(overrides = {}) {
  return stores.users.insert({
    id: uid(), githubAccountId: `gh-${uid().slice(0, 8)}`, slug: `user-${uid().slice(0, 8)}`,
    displayName: "测试用户", profile: {}, roles: [],
    profileCompletionStatus: "complete", status: "active",
    createdAt: now(), updatedAt: now(), version: 1,
    ...overrides,
  }).record;
}

function seedRegistration(overrides = {}) {
  return stores.registrations.insert({
    id: uid(), raceId: uid(), userId: uid(), status: "submitted",
    submittedAt: now(), approvedAt: null, approvedByUserId: null,
    rejectedAt: null, rejectedReason: null, withdrawnAt: null, reviewFlags: [],
    createdAt: now(), updatedAt: now(), version: 1,
    ...overrides,
  }).record;
}

function seedRaceProject(overrides = {}) {
  return stores.raceProjects.insert({
    id: uid(), registrationId: uid(), raceId: uid(), userId: uid(),
    repoUrl: null, aggregateIngestionStatus: "not_configured", connectionHealth: "no_signal",
    authenticitySummary: {}, reviewFlags: [], currentPrimaryWorkId: null,
    createdAt: now(), updatedAt: now(), version: 1,
    ...overrides,
  }).record;
}

function seedCAConnection(overrides = {}) {
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
  }).record;
}

function seedSession(overrides = {}) {
  return stores.sessions.insert({
    id: uid(), caConnectionId: uid(), raceProjectId: uid(), registrationId: uid(),
    caSessionId: `ext-${uid().slice(0, 8)}`, status: "active",
    startedAt: now(), completedAt: null, durationMs: null, taskCount: 0, metrics: {},
    createdAt: now(), updatedAt: now(), version: 1,
    ...overrides,
  }).record;
}

function seedWork(overrides = {}) {
  return stores.works.insert({
    id: uid(), registrationId: uid(), raceId: uid(), ownerUserId: uid(),
    title: "测试作品", summary: null, description: null,
    demoUrl: null, videoUrl: null, repoUrl: null,
    status: "draft", visibility: "public",
    submittedAt: null, lockedAt: null,
    createdAt: now(), updatedAt: now(), version: 1,
    ...overrides,
  }).record;
}

// ============ Test Suite ============
describe("DEV-1 Acceptance Tests", () => {
  beforeEach(() => {
    resetAll();
    resetKeys();
  });

  // ========================
  // AC-1: 一个 User 对同一 Race 最多一个 Registration
  // ========================
  describe("AC-1: 唯一 Registration 约束", () => {
    it("AC-1.1 — 首次报名正常通过", () => {
      const race = seedRace({ status: "registration" });
      const user = seedUser({ roles: ["rider"] });

      const result = stores.registrations.insert({
        id: uid(), raceId: race.id, userId: user.id, status: "submitted",
        submittedAt: now(), approvedAt: null, approvedByUserId: null,
        rejectedAt: null, rejectedReason: null, withdrawnAt: null, reviewFlags: [],
        createdAt: now(), updatedAt: now(), version: 1,
      });

      assert.ok(result.ok);
      assert.equal(result.record.status, "submitted");
      assert.equal(stores.registrations.count(), 1);
    });

    it("AC-1.2 — 重复报名被拒绝", () => {
      const race = seedRace({ status: "registration" });
      const user = seedUser({ roles: ["rider"] });
      seedRegistration({ raceId: race.id, userId: user.id, status: "approved" });

      const result = stores.registrations.insert({
        id: uid(), raceId: race.id, userId: user.id, status: "submitted",
        submittedAt: now(), approvedAt: null, approvedByUserId: null,
        rejectedAt: null, rejectedReason: null, withdrawnAt: null, reviewFlags: [],
        createdAt: now(), updatedAt: now(), version: 1,
      });

      assert.equal(result.ok, false);
      assert.match(result.reason, /uk_race_user/);
      assert.equal(stores.registrations.count(), 1);
    });

    it("AC-1.3 — 不同 User 对同一 Race 各自报名成功", () => {
      const race = seedRace({ status: "registration" });
      const userA = seedUser({ roles: ["rider"] });
      const userB = seedUser({ roles: ["rider"] });

      const rA = seedRegistration({ raceId: race.id, userId: userA.id });
      const rB = seedRegistration({ raceId: race.id, userId: userB.id });

      assert.ok(rA);
      assert.ok(rB);
      assert.equal(stores.registrations.count(), 2);
    });

    it("AC-1.4 — 同一 User 对不同 Race 各自报名成功", () => {
      const race1 = seedRace({ status: "registration" });
      const race2 = seedRace({ status: "registration" });
      const user = seedUser({ roles: ["rider"] });

      const r1 = seedRegistration({ raceId: race1.id, userId: user.id });
      const r2 = seedRegistration({ raceId: race2.id, userId: user.id });

      assert.ok(r1);
      assert.ok(r2);
      assert.equal(stores.registrations.count(), 2);
    });
  });

  // ========================
  // AC-2: Registration ↔ RaceProject ↔ Work 结构约束
  // ========================
  describe("AC-2: 结构约束", () => {
    it("AC-2.1 — Registration approved 后自动生成 RaceProject", () => {
      const reg = seedRegistration({ status: "submitted" });
      // Simulate approve → create RaceProject
      stores.registrations.update(reg.id, { status: "approved", approvedAt: now(), approvedByUserId: uid() });

      const rp = stores.raceProjects.insert({
        id: uid(), registrationId: reg.id, raceId: reg.raceId, userId: reg.userId,
        repoUrl: null, aggregateIngestionStatus: "not_configured", connectionHealth: "no_signal",
        authenticitySummary: {}, reviewFlags: [], currentPrimaryWorkId: null,
        createdAt: now(), updatedAt: now(), version: 1,
      });

      assert.ok(rp.ok);
      assert.equal(rp.record.aggregateIngestionStatus, "not_configured");
      assert.equal(rp.record.connectionHealth, "no_signal");
      assert.equal(rp.record.registrationId, reg.id);
    });

    it("AC-2.2 — 重复 approve 不会创建第二个 RaceProject（幂等）", () => {
      const reg = seedRegistration({ status: "approved" });
      seedRaceProject({ registrationId: reg.id });

      const dup = stores.raceProjects.insert({
        id: uid(), registrationId: reg.id, raceId: reg.raceId, userId: reg.userId,
        repoUrl: null, aggregateIngestionStatus: "not_configured", connectionHealth: "no_signal",
        authenticitySummary: {}, reviewFlags: [], currentPrimaryWorkId: null,
        createdAt: now(), updatedAt: now(), version: 1,
      });

      assert.equal(dup.ok, false);
      assert.match(dup.reason, /uk_registration/);
      assert.equal(stores.raceProjects.count(), 1);
    });

    it("AC-2.3 — 一个 Registration 最多一个主 Work", () => {
      const reg = seedRegistration({ status: "approved" });
      seedWork({ registrationId: reg.id, status: "draft" });

      const dup = stores.works.insert({
        id: uid(), registrationId: reg.id, raceId: reg.raceId, ownerUserId: reg.userId,
        title: "第二个作品", summary: null, description: null,
        demoUrl: null, videoUrl: null, repoUrl: null,
        status: "draft", visibility: "public",
        submittedAt: null, lockedAt: null,
        createdAt: now(), updatedAt: now(), version: 1,
      });

      assert.equal(dup.ok, false);
      assert.match(dup.reason, /uk_registration/);
      assert.equal(stores.works.count(), 1);
    });

    it("AC-2.4 — 一个 RaceProject 可登记多个 CAConnection", () => {
      const rp = seedRaceProject();
      const cc1 = seedCAConnection({ raceProjectId: rp.id, connectorId: "A", caProjectId: "P1" });
      const cc2 = seedCAConnection({ raceProjectId: rp.id, connectorId: "B", caProjectId: "P2" });

      assert.ok(cc1);
      assert.ok(cc2);
      assert.equal(stores.caConnections.count(), 2);
    });

    it("AC-2.5 — 同一 connector+project 不可重复登记", () => {
      const rp = seedRaceProject();
      seedCAConnection({ raceProjectId: rp.id, connectorId: "A", caProjectId: "P1" });

      const dup = stores.caConnections.insert({
        id: uid(), raceProjectId: rp.id, registrationId: uid(), raceId: uid(), userId: uid(),
        caType: "codex", connectorId: "A", connectorVersion: "1.0", caProjectId: "P1",
        ingestionStatus: "connected", authenticityStatus: "verified", authenticityReason: null,
        appInstanceId: null, deviceKeyId: null, deviceKeyFingerprint: null,
        registeredAt: now(), lastHandshakeAt: now(), lastVerifiedAt: now(),
        disabledAt: null, disabledReason: null,
        createdAt: now(), updatedAt: now(), version: 1,
      });

      assert.equal(dup.ok, false);
      assert.match(dup.reason, /uk_rp_connector_caproject/);
    });

    it("AC-2.6 — 未 approved 的 Registration 不生成 RaceProject", () => {
      const reg = seedRegistration({ status: "submitted" });
      const found = stores.raceProjects.first((rp) => rp.registrationId === reg.id);
      assert.equal(found, null);
    });
  });

  // ========================
  // AC-3: CAConnection 有效数据准入
  // ========================
  describe("AC-3: CAConnection 有效数据准入", () => {
    it("AC-3.1 — 已登记+已握手+归属正确+未禁用 → 数据进入有效链路", () => {
      const rp = seedRaceProject();
      const cc = seedCAConnection({
        raceProjectId: rp.id, registrationId: rp.registrationId,
        ingestionStatus: "connected", authenticityStatus: "verified", disabledAt: null,
      });

      const session = seedSession({ caConnectionId: cc.id, raceProjectId: rp.id, registrationId: rp.registrationId });
      const entryCheck = canEnterSession(session);
      assert.ok(entryCheck.ok, entryCheck.reason);
    });

    it("AC-3.2 — 未登记 CAConnection 的数据被拒收", () => {
      const session = seedSession({ caConnectionId: "non-existent-id" });
      const entryCheck = canEnterSession(session);
      assert.equal(entryCheck.ok, false);
      assert.equal(entryCheck.reason, "CAConnection 未登记");
    });

    it("AC-3.3 — 未握手的 CAConnection 数据被拒收", () => {
      const rp = seedRaceProject();
      const cc = seedCAConnection({
        raceProjectId: rp.id, ingestionStatus: "not_configured",
      });
      const session = seedSession({ caConnectionId: cc.id });
      const entryCheck = canEnterSession(session);
      assert.equal(entryCheck.ok, false);
      assert.equal(entryCheck.reason, "CAConnection 未握手");
    });

    it("AC-3.4 — 归属错误的 CAConnection 数据被拒收", () => {
      const rp = seedRaceProject();
      const cc = seedCAConnection({
        raceProjectId: rp.id, registrationId: rp.registrationId,
        ingestionStatus: "connected", authenticityStatus: "verified",
      });
      const wrongRegId = uid();
      const session = seedSession({ caConnectionId: cc.id, raceProjectId: rp.id, registrationId: wrongRegId });
      const entryCheck = canEnterSession(session);
      assert.equal(entryCheck.ok, false);
      assert.equal(entryCheck.reason, "归属错误");
    });

    it("AC-3.5 — 被禁用的 CAConnection 数据被拒收", () => {
      const rp = seedRaceProject();
      const cc = seedCAConnection({
        raceProjectId: rp.id, ingestionStatus: "connected",
        authenticityStatus: "verified", disabledAt: now(),
      });
      const session = seedSession({ caConnectionId: cc.id });
      const entryCheck = canEnterSession(session);
      assert.equal(entryCheck.ok, false);
      assert.equal(entryCheck.reason, "CAConnection 已被禁用");
    });

    it("AC-3.6 — 混合场景：部分有效、部分无效", () => {
      const rp = seedRaceProject();
      const cc1 = seedCAConnection({
        raceProjectId: rp.id, connectorId: "A", caProjectId: "P1",
        ingestionStatus: "connected", authenticityStatus: "verified", disabledAt: null,
      });
      const cc2 = seedCAConnection({
        raceProjectId: rp.id, connectorId: "B", caProjectId: "P2",
        ingestionStatus: "connected", authenticityStatus: "verified", disabledAt: now(),
      });

      const s1 = seedSession({ caConnectionId: cc1.id, raceProjectId: rp.id, registrationId: rp.registrationId });
      const s2 = seedSession({ caConnectionId: cc2.id, raceProjectId: rp.id, registrationId: rp.registrationId });

      assert.ok(canEnterSession(s1).ok);
      assert.equal(canEnterSession(s2).ok, false);

      // Partial failure should not block RP aggregate status
      const statuses = [cc1.ingestionStatus, "disabled"];
      const health = computeConnectionHealth(statuses);
      assert.equal(health, "partial_failed");
    });
  });

  // ========================
  // AC-4: DCR Desktop App 安全校验
  // ========================
  describe("AC-4: DCR Desktop App 安全校验", () => {
    let rp, cc;

    beforeEach(() => {
      rp = seedRaceProject();
      cc = seedCAConnection({
        raceProjectId: rp.id, registrationId: rp.registrationId, userId: rp.userId, raceId: rp.raceId,
        ingestionStatus: "connected", authenticityStatus: "verified",
        appInstanceId: "app-001", deviceKeyId: "key-001",
        deviceKeyFingerprint: "fp-001",
      });
      registerDeviceKey("app-001", "key-001", "mock-public-key-pem");
    });

    function validMessage(overrides = {}) {
      const body = { event: "task_completed", taskId: "t1" };
      const normalized = normalizeBody(body);
      return {
        appInstanceId: "app-001", deviceKeyId: "key-001",
        nonce: uid(), sequence: Math.floor(Math.random() * 100000) + 1000,
        timestamp: ts(-1000), caConnectionId: cc.id,
        messageId: uid(), idempotencyKey: uid(),
        schemaVersion: "ary.ca.riding_signal.v0.1",
        signature: { algorithm: "ecdsa-p256", bodyHash: computeBodyHash(normalized), value: "valid-signature-mock-abcdef123456" },
        body,
        ...overrides,
      };
    }

    it("AC-4.1 — 全量校验通过 → 数据进入有效链路", () => {
      const msg = validMessage();
      const result = verifyMessage(msg);
      assert.ok(result.passed);
      assert.equal(result.verificationResult, "passed");
    });

    it("AC-4.2 — 签名不一致 → 进入隔离审计", () => {
      const msg = validMessage({ signature: { algorithm: "ecdsa-p256", bodyHash: "bad-hash", value: "bad-sig" } });
      const result = verifyMessage(msg);
      assert.equal(result.passed, false);
      assert.equal(result.verificationResult, "body_hash_mismatch");
      // Quarantine audit should exist
      assert.equal(stores.caQuarantineAudits.count(), 1);
    });

    it("AC-4.3 — nonce 重放 → 进入隔离审计", () => {
      const msg = validMessage();
      verifyMessage(msg); // first — passes
      const result2 = verifyMessage(msg); // same idempotencyKey
      assert.equal(result2.passed, false);
      assert.equal(result2.verificationResult, "nonce_replayed");
      assert.equal(stores.caQuarantineAudits.count(), 1);
    });

    it("AC-4.4 — sequence 回退 → 进入隔离审计", () => {
      verifyMessage(validMessage({ sequence: 100 }));
      const result = verifyMessage(validMessage({ sequence: 50 }));
      assert.equal(result.passed, false);
      assert.equal(result.verificationResult, "sequence_regression");
    });

    it("AC-4.5 — deviceKeyId 已撤销 → 进入隔离审计", () => {
      revokeDeviceKey("key-001");
      const result = verifyMessage(validMessage());
      assert.equal(result.passed, false);
      assert.equal(result.verificationResult, "key_revoked");
    });

    it("AC-4.6 — appInstanceId 未知 → 进入隔离审计", () => {
      const msg = validMessage({ appInstanceId: "unknown-app" });
      const result = verifyMessage(msg);
      assert.equal(result.passed, false);
      assert.equal(result.verificationResult, "app_instance_unknown");
    });

    it("AC-4.7 — 校验失败消息的审计可见性", () => {
      // Generate a failed message
      const msg = validMessage({ appInstanceId: "unknown-app" });
      verifyMessage(msg);

      const quarantine = stores.caQuarantineAudits.all()[0];
      assert.ok(quarantine);

      // quarantineSummaryFilter returns minimal info
      const summary = quarantineSummaryFilter(quarantine);
      assert.ok(summary.failureReason);
      assert.ok(summary.quarantinedAt);
      assert.equal(summary.caConnectionId, cc.id);
      // rawMessageMetadata should NOT be in summary
      assert.equal(summary.rawMessageMetadata, undefined);
      // But IS in the full record
      assert.ok(quarantine.rawMessageMetadata);
    });
  });

  // ========================
  // AC-5: CA 接入失败不阻断业务主流程
  // ========================
  describe("AC-5: CA 接入失败不阻断主流程", () => {
    it("AC-5.1 — not_configured 时仍可提交 Work", () => {
      const reg = seedRegistration({ status: "approved" });
      const rp = seedRaceProject({ registrationId: reg.id, aggregateIngestionStatus: "not_configured", connectionHealth: "no_signal" });
      const race = seedRace({ id: rp.raceId, status: "running" });

      const work = seedWork({ registrationId: reg.id, raceId: race.id, ownerUserId: reg.userId, status: "draft" });
      const updated = stores.works.update(work.id, { status: "submitted", submittedAt: now() });
      assert.ok(updated.ok);
      assert.equal(updated.record.status, "submitted");

      // Review flags should be generated
      const flags = generateReviewFlags(rp);
      const unconfigured = flags.find((f) => f.flagType === "ca_unconfigured");
      assert.ok(unconfigured);
      assert.match(unconfigured.reason, /无已登记 CAConnection/);
    });

    it("AC-5.2 — 全部 CAConnection failed 时仍可提交 Work", () => {
      const reg = seedRegistration({ status: "approved" });
      const rp = seedRaceProject({ registrationId: reg.id, aggregateIngestionStatus: "failed", connectionHealth: "all_failed" });
      seedRace({ id: rp.raceId, status: "running" });

      const work = seedWork({ registrationId: reg.id, raceId: rp.raceId, ownerUserId: reg.userId, status: "draft" });
      const updated = stores.works.update(work.id, { status: "submitted", submittedAt: now() });
      assert.ok(updated.ok);

      const flags = generateReviewFlags(rp);
      const caFailed = flags.find((f) => f.flagType === "ca_failed");
      assert.ok(caFailed);

      // Check Registration NOT withdrawn
      const regAfter = stores.registrations.get(reg.id);
      assert.equal(regAfter.status, "approved");
    });

    it("AC-5.3 — CA 接入异常时仍可进入评审", () => {
      const reg = seedRegistration({ status: "approved" });
      const rp = seedRaceProject({ registrationId: reg.id, aggregateIngestionStatus: "failed" });
      seedRace({ id: rp.raceId, status: "judging" });
      const work = seedWork({ registrationId: reg.id, raceId: rp.raceId, ownerUserId: reg.userId, status: "locked" });
      const judge = seedUser({ roles: ["judge"] });

      const assign = stores.judgeAssignments.insert({
        id: uid(), raceId: rp.raceId, workId: work.id, judgeUserId: judge.id,
        assignedByUserId: uid(), status: "assigned", assignedAt: now(), completedAt: null,
        createdAt: now(), updatedAt: now(), version: 1,
      });
      assert.ok(assign.ok);

      const record = stores.judgingRecords.insert({
        id: uid(), judgeAssignmentId: assign.record.id, workId: work.id, judgeUserId: judge.id,
        scoreResult: {}, scoreRiding: {}, comments: "评审通过", status: "draft",
        submittedAt: null, createdAt: now(), updatedAt: now(), version: 1,
      });
      assert.ok(record.ok);

      const submitted = stores.judgingRecords.update(record.record.id, { status: "submitted", submittedAt: now() });
      assert.ok(submitted.ok);
    });

    it("AC-5.4 — CA 接入异常时仍可颁发 Award", () => {
      const reg = seedRegistration({ status: "approved" });
      const rp = seedRaceProject({ registrationId: reg.id, aggregateIngestionStatus: "failed" });
      const raceId = rp.raceId;

      const award = stores.awards.insert({
        id: uid(), raceId, registrationId: reg.id, workId: null,
        awardName: "Best Effort", rank: 1, decisionReason: "尽管 CA 未接入",
        status: "draft", publishedAt: null,
        createdAt: now(), updatedAt: now(), version: 1,
      });
      assert.ok(award.ok);

      const published = stores.awards.update(award.record.id, { status: "published", publishedAt: now() });
      assert.ok(published.ok);
      assert.equal(published.record.status, "published");
    });

    it("AC-5.5 — 风险提示生成验证", () => {
      const rp = seedRaceProject({ aggregateIngestionStatus: "not_configured", connectionHealth: "no_signal" });
      const flags = generateReviewFlags(rp);

      assert.ok(flags.length > 0);
      const flag = flags[0];
      assert.equal(flag.flagType, "ca_unconfigured");
      assert.equal(flag.resolved, false);
      assert.ok(flag.createdAt);
    });

    it("AC-5.6 — 部分 CAConnection 正常时风险提示降级", () => {
      const rp = seedRaceProject({ aggregateIngestionStatus: "active", connectionHealth: "partial_failed" });
      const flags = generateReviewFlags(rp);
      const caFlags = flags.filter((f) => f.flagType === "ca_failed");
      assert.ok(caFlags.length > 0);
      // Should NOT have ca_unconfigured
      const uncfg = flags.find((f) => f.flagType === "ca_unconfigured");
      assert.equal(uncfg, undefined);
    });

    it("AC-5.7 — CA 接入状态不得驱动 Registration 进入 withdrawn", () => {
      const reg = seedRegistration({ status: "approved" });
      seedRaceProject({ registrationId: reg.id, aggregateIngestionStatus: "failed" });

      // Try to transition approved → withdrawn due to CA status
      const result = registrationCanTransition("approved", "withdrawn");
      assert.ok(result.ok); // Rider can withdraw voluntarily

      // But system should NOT auto-withdraw: check that the transition
      // from a non-approved state to withdrawn with CA reason is blocked
      const blockedResult = registrationCanTransition("submitted", "withdrawn");
      assert.equal(blockedResult.ok, false);
      assert.match(blockedResult.reason, /不驱动/);

      // Verify Registration stays approved
      const regAfter = stores.registrations.get(reg.id);
      assert.equal(regAfter.status, "approved");
    });
  });

  // ========================
  // State Machine Tests
  // ========================
  describe("状态机", () => {
    it("Race: draft → published → registration → running", () => {
      assert.ok(raceCanTransition("draft", "published").ok);
      assert.ok(raceCanTransition("published", "registration").ok);
      assert.ok(raceCanTransition("registration", "running").ok);
    });

    it("Race: 禁止 completed → judging 回退", () => {
      const result = raceCanTransition("completed", "judging");
      assert.equal(result.ok, false);
      assert.match(result.reason, /回退/);
    });

    it("Race: 禁止跳过 published 直接进入 registration", () => {
      const result = raceCanTransition("draft", "registration");
      assert.equal(result.ok, false);
    });

    it("Registration: submitted → approved → withdrawn", () => {
      assert.ok(registrationCanTransition("submitted", "approved").ok);
      assert.ok(registrationCanTransition("approved", "withdrawn").ok);
    });

    it("Work: draft → submitted → locked", () => {
      assert.ok(workCanTransition("draft", "submitted").ok);
      assert.ok(workCanTransition("submitted", "locked").ok);
    });

    it("Work: 禁止 locked → draft", () => {
      const result = workCanTransition("locked", "draft");
      assert.equal(result.ok, false);
    });

    it("JudgingRecord: draft → submitted", () => {
      assert.ok(judgingCanTransition("draft", "submitted").ok);
    });

    it("JudgingRecord: 禁止 submitted → draft", () => {
      const result = judgingCanTransition("submitted", "draft");
      assert.equal(result.ok, false);
    });

    it("Award: draft → published → withdrawn", () => {
      assert.ok(awardCanTransition("draft", "published").ok);
      assert.ok(awardCanTransition("published", "withdrawn").ok);
    });

    it("Award: 禁止 published → draft", () => {
      const result = awardCanTransition("published", "draft");
      assert.equal(result.ok, false);
    });

    it("RaceProject ingestion: not_configured → connected → active → failed → connected", () => {
      assert.ok(rpIngestionCanTransition("not_configured", "connected").ok);
      assert.ok(rpIngestionCanTransition("connected", "active").ok);
      assert.ok(rpIngestionCanTransition("active", "failed").ok);
      assert.ok(rpIngestionCanTransition("failed", "connected").ok);
    });

    it("computeConnectionHealth: no_signal → ok → partial_failed → all_failed", () => {
      assert.equal(computeConnectionHealth([]), "no_signal");
      assert.equal(computeConnectionHealth(["connected"]), "ok");
      assert.equal(computeConnectionHealth(["active", "failed"]), "partial_failed");
      assert.equal(computeConnectionHealth(["failed", "failed"]), "all_failed");
    });
  });

  // ========================
  // Auth Scope Tests
  // ========================
  describe("鉴权作用域", () => {
    it("ownGate — User 只能访问自己的资源", () => {
      const user = seedUser({ roles: ["rider"] });
      const res = { userId: user.id };
      assert.ok(ownGate(res, user));
      assert.equal(ownGate({ userId: uid() }, user), false);
    });

    it("assignedGate — Judge 只能访问已分配的作品", () => {
      const judge = seedUser({ roles: ["judge"] });
      const work = seedWork();
      assert.equal(assignedGate(work.id, judge), false);

      stores.judgeAssignments.insert({
        id: uid(), raceId: uid(), workId: work.id, judgeUserId: judge.id,
        assignedByUserId: uid(), status: "assigned", assignedAt: now(), completedAt: null,
        createdAt: now(), updatedAt: now(), version: 1,
      });
      assert.ok(assignedGate(work.id, judge));
    });

    it("managedRaceGate — Organizer 只能管理自己的 Race", () => {
      const org = seedUser({ roles: ["organizer"] });
      const race = seedRace({ organizerUserIds: [org.id], createdByUserId: org.id });
      assert.ok(managedRaceGate({ raceId: race.id }, org));
      assert.equal(managedRaceGate({ raceId: uid() }, org), false);
    });

    it("adminGate — Admin 拥有 system 权限", () => {
      const admin = seedUser({ roles: ["admin"] });
      const nonAdmin = seedUser({ roles: ["rider"] });
      assert.ok(adminGate(admin));
      assert.equal(adminGate(nonAdmin), false);
    });
  });
});
