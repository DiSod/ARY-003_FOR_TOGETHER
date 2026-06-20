// CA message verification pipeline.
// Mirrors dev-1-data-model-draft.md §5.1-5.2 and ary-ca-integration-spec.md §2.1, §3.3.

import { stores } from "./stores.js";
import crypto from "node:crypto";

// --- Simulated key store ---
// In reality these would come from ca_connections table
const deviceKeys = new Map(); // deviceKeyId → { publicKeyPem, revoked: bool, appInstanceId }

function registerDeviceKey(appInstanceId, deviceKeyId, publicKeyPem) {
  deviceKeys.set(deviceKeyId, { appInstanceId, publicKeyPem, revoked: false });
}

function revokeDeviceKey(deviceKeyId) {
  const entry = deviceKeys.get(deviceKeyId);
  if (entry) entry.revoked = true;
}

// --- Signature helpers (simulated) ---
function normalizeBody(body) {
  return JSON.stringify(body, Object.keys(body).sort());
}

function computeBodyHash(normalized) {
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

// --- Verification ---
function verifyMessage(message) {
  const {
    appInstanceId,
    deviceKeyId,
    nonce,
    sequence,
    timestamp,
    caConnectionId,
    signature,
    body,
  } = message;

  const receiptId = crypto.randomUUID();
  const now = Date.now();

  // 1. Check appInstanceId is known
  const caConn = stores.caConnections.get(caConnectionId);
  if (!caConn) {
    return createReceipt(receiptId, caConnectionId, message, "app_instance_unknown");
  }
  if (caConn.appInstanceId !== appInstanceId) {
    return createReceipt(receiptId, caConnectionId, message, "app_instance_unknown");
  }

  // 2. Check deviceKeyId is valid and not revoked
  const keyEntry = deviceKeys.get(deviceKeyId);
  if (!keyEntry) {
    return createReceipt(receiptId, caConnectionId, message, "key_revoked");
  }
  if (keyEntry.revoked) {
    return createReceipt(receiptId, caConnectionId, message, "key_revoked");
  }
  if (keyEntry.appInstanceId !== appInstanceId) {
    return createReceipt(receiptId, caConnectionId, message, "app_instance_unknown");
  }

  // 3. Verify body hash
  const normalizedBody = normalizeBody(body);
  const computedHash = computeBodyHash(normalizedBody);
  if (signature.bodyHash !== computedHash) {
    return createReceipt(receiptId, caConnectionId, message, "body_hash_mismatch");
  }

  // 4. Verify signature (simulated via key presence + body hash)
  if (!signature.value || signature.value.length < 16) {
    return createReceipt(receiptId, caConnectionId, message, "signature_mismatch");
  }

  // 5. Timestamp check (allow ±5 min clock skew)
  const msgTime = new Date(timestamp).getTime();
  if (Math.abs(now - msgTime) > 5 * 60 * 1000) {
    return createReceipt(receiptId, caConnectionId, message, "timestamp_out_of_range");
  }

  // 6. Nonce uniqueness check (BEFORE sequence — replay detection first)
  const existingReceipt = stores.caMessageReceipts.first(
    (r) => r.idempotencyKey === message.idempotencyKey,
  );
  if (existingReceipt) {
    return createReceipt(receiptId, caConnectionId, message, "nonce_replayed");
  }

  // 7. Sequence monotonic check
  const prevReceipts = stores.caMessageReceipts.find(
    (r) => r.caConnectionId === caConnectionId,
  );
  const maxSeq = prevReceipts.reduce((max, r) => Math.max(max, r.sequence ?? 0), 0);
  if (sequence <= maxSeq) {
    return createReceipt(receiptId, caConnectionId, message, "sequence_regression");
  }

  // 8. All checks passed
  return createReceipt(receiptId, caConnectionId, message, "passed");
}

function createReceipt(receiptId, caConnectionId, message, verificationResult) {
  const receipt = {
    receiptId,
    caConnectionId,
    messageId: message.messageId,
    idempotencyKey: message.idempotencyKey,
    schemaVersion: message.schemaVersion ?? "ary.ca.riding_signal.v0.1",
    timestamp: message.timestamp,
    nonce: message.nonce,
    sequence: message.sequence,
    signatureAlgorithm: message.signature?.algorithm ?? "ecdsa-p256",
    signatureBodyHash: message.signature?.bodyHash ?? "",
    verificationResult,
    createdAt: new Date().toISOString(),
  };

  const result = stores.caMessageReceipts.insert(receipt);

  // If verification failed → create quarantine audit
  if (verificationResult !== "passed") {
    stores.caQuarantineAudits.insert({
      quarantineId: crypto.randomUUID(),
      receiptId,
      caConnectionId,
      raceProjectId: stores.caConnections.get(caConnectionId)?.raceProjectId ?? "unknown",
      registrationId: stores.caConnections.get(caConnectionId)?.registrationId ?? "unknown",
      failureReason: verificationResult,
      quarantineStatus: "pending_review",
      quarantinedAt: new Date().toISOString(),
      reviewedByUserId: null,
      reviewedAt: null,
      dispositionNote: null,
      rawMessageMetadata: { messageId: message.messageId, timestamp: message.timestamp },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return {
    receiptId,
    verificationResult,
    passed: verificationResult === "passed",
  };
}

// --- Session ingestion gate ---
function canEnterSession(session) {
  const caConn = stores.caConnections.get(session.caConnectionId);
  if (!caConn) return { ok: false, reason: "CAConnection 未登记" };
  if (caConn.ingestionStatus === "not_configured") return { ok: false, reason: "CAConnection 未握手" };
  if (caConn.ingestionStatus === "connected" && caConn.authenticityStatus !== "verified") {
    return { ok: false, reason: "CAConnection 未通过真实性校验" };
  }
  if (caConn.disabledAt) return { ok: false, reason: "CAConnection 已被禁用" };

  // Check raceProject ownership
  const rp = stores.raceProjects.get(caConn.raceProjectId);
  if (!rp) return { ok: false, reason: "RaceProject 不存在" };
  if (session.registrationId && rp.registrationId !== session.registrationId) {
    return { ok: false, reason: "归属错误" };
  }

  return { ok: true };
}

// --- Session summary generation gate ---
function canGenerateSessionSummary(sessionId) {
  const session = stores.sessions.get(sessionId);
  if (!session) return { ok: false, reason: "Session 不存在" };

  const caConn = stores.caConnections.get(session.caConnectionId);
  if (!caConn || caConn.authenticityStatus !== "verified" || caConn.disabledAt) {
    return { ok: false, reason: "CAConnection 真实性校验未通过或已禁用" };
  }
  return { ok: true };
}

function generateSessionSummary(sessionId) {
  const canGen = canGenerateSessionSummary(sessionId);
  if (!canGen.ok) return canGen;

  const session = stores.sessions.get(sessionId);
  const summary = {
    sessionSummaryId: crypto.randomUUID(),
    sessionId,
    caConnectionId: session.caConnectionId,
    raceProjectId: session.raceProjectId,
    registrationId: session.registrationId,
    summaryType: "auto_generated",
    content: `Session ${sessionId} summary`,
    metrics: session.metrics ?? {},
    capabilityTags: [],
    generatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return stores.sessionSummaries.insert(summary);
}

function resetKeys() {
  deviceKeys.clear();
}

export {
  verifyMessage,
  canEnterSession,
  canGenerateSessionSummary,
  generateSessionSummary,
  registerDeviceKey,
  revokeDeviceKey,
  resetKeys,
  computeBodyHash,
  normalizeBody,
};
