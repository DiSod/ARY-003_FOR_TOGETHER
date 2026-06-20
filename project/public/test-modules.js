// ARY MVP — Test Shims (browser-side only).
// Must be loaded AFTER app-core.js.
// This file ONLY provides test-specific forgery / injection abilities:
//   - Identity forgery (pre-built demo users)
//   - Message forgery (simulated DCR Desktop App messages)
//   - Key injection (fake device keys for CA verify page)
// All production runtime logic lives in app-core.js (window.ARY_CORE).

(function () {
  "use strict";

  if (!window.ARY_CORE) {
    console.warn("test-modules.js: ARY_CORE not found — app-core.js must load first");
    return;
  }

  const { uid, now, stores, caVerifier } = window.ARY_CORE;

  const identities = {
    alice: { displayName: "Alice Chen", roles: ["rider"], bio: "HKU CS / 大三" },
    bob:   { displayName: "Bob Xu", roles: ["rider", "judge"], bio: "FinTech Studio" },
    carol: { displayName: "Carol Wang", roles: ["organizer"], bio: "赛事主办方" },
    admin: { displayName: "Admin", roles: ["admin"], bio: "" },
  };

  function seedIdentities() {
    for (const [key, id] of Object.entries(identities)) {
      const result = stores.users.insert({
        id: uid(), githubAccountId: `gh-${key}`, slug: key,
        displayName: id.displayName, profile: { bio: id.bio, avatarUrl: "" },
        roles: id.roles, profileCompletionStatus: "complete", status: "active",
        createdAt: now(), updatedAt: now(), version: 1,
      });
      id.id = result.record?.id;
    }
    return identities;
  }

  let testSeqCounter = 1000;

  function sendTestMsg(caId, type) {
    const cc = stores.caConnections.get(caId);
    if (!cc) return { ok: false, reason: "CAConnection 不存在" };
    const body = { event: "test_verification", ts: now() };
    const sortedKeys = Object.keys(body).sort();
    const sortedBody = {};
    sortedKeys.forEach((k) => (sortedBody[k] = body[k]));
    const normalized = JSON.stringify(sortedBody);
    let h = 0;
    for (let i = 0; i < normalized.length; i++) { h = ((h << 5) - h + normalized.charCodeAt(i)) | 0; }
    const computedHash = h.toString(16);

    return caVerifier.verifyMessage({
      appInstanceId: type === "unknownapp" ? "bad-app" : "app-test",
      deviceKeyId: type === "keyrevoke" ? "key-old" : "key-test",
      nonce: type === "replay" ? "dup-nonce-123" : uid(),
      sequence: type === "seqback" ? 10 : ++testSeqCounter,
      timestamp: new Date(Date.now() - 1000).toISOString(),
      caConnectionId: caId, messageId: uid(),
      idempotencyKey: type === "replay" ? "dup-nonce-123" : uid(),
      schemaVersion: "ary.ca.riding_signal.v0.1",
      signature: { algorithm: "ecdsa-p256", bodyHash: type === "badhash" ? "bad-hash-xxx" : computedHash, value: type === "badhash" ? "short" : "valid-sig-testing-ok" },
      body,
    });
  }

  function injectDefaultKeys() { caVerifier.registerDeviceKey("app-test", "key-test"); }

  window.ARY_CORE.testShims = { identities, seedIdentities, sendTestMsg, injectDefaultKeys };
  window.ARY_TEST = window.ARY_CORE; // legacy alias
})();
