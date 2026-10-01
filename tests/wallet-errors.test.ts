import assert from "node:assert/strict";
import test from "node:test";
import { walletErrorKey, walletErrorCode, walletDiagnostic, walletRetryUntil } from "../lib/wallet-errors";

test("connection errors must not be reported as cancelled signatures", () => {
  assert.equal(walletErrorKey(new Error("transport broken"), "connect"), "auth.walletConnectFailed");
  assert.equal(walletErrorKey({ code: 4001 }, "connect"), "auth.walletConnectRejected");
  assert.equal(walletErrorKey({ code: 4001 }, "sign"), "auth.walletRejected");
});

test("copyable browser diagnostics keep only support fields", () => {
  const result = walletDiagnostic({ requestId: "11111111-1111-4111-8111-111111111111", jwt: "private-token", diagnostic: {
    reason: "WALLET_RATE_LIMIT", stage: "provider", providerStatus: 429, signature: "private-signature", message: "private-message",
  } }, "phantom", "verify", 429);
  assert.equal(result.reason, "WALLET_RATE_LIMIT");
  assert.equal(result.requestId, "11111111-1111-4111-8111-111111111111");
  assert.ok(!JSON.stringify(result).includes("private-"));
});

test("rate limit cooldown honors server retry time and is bounded", () => {
  const now = 10000;
  assert.equal(walletRetryUntil(429, { retryAfterSeconds: 3425 }, null, now), now + 3425000);
  assert.equal(walletRetryUntil(429, null, "120", now), now + 120000);
  assert.equal(walletRetryUntil(429, null, new Date(now + 120000).toUTCString(), now), now + 120000);
  assert.equal(walletRetryUntil(400, { retryAfterSeconds: 3425 }, null, now), 0);
  assert.equal(walletRetryUntil(429, { retryAfterSeconds: Number.POSITIVE_INFINITY }, null, now), now + 60000);
});
test("pending and wrapped MetaMask errors are recognized without exposing error data", () => {
  assert.equal(walletErrorKey({ code: -32002 }, "connect"), "auth.walletRequestPending");
  assert.equal(walletErrorCode({ code: 53, rpcCode: 4001, message: "private" }), 4001);
  assert.equal(walletErrorKey({ code: 53, rpcCode: 4001 }, "sign"), "auth.walletRejected");
});
test("server and signing failures retain their failed stage", () => {
  assert.equal(walletErrorKey(new TypeError("fetch failed"), "challenge"), "auth.walletChallengeFailed");
  assert.equal(walletErrorKey(new Error("broken"), "sign"), "auth.walletSignFailed");
  assert.equal(walletErrorKey(new TypeError("fetch failed"), "verify"), "auth.walletVerifyFailed");
  assert.equal(walletErrorKey({ code: 4001 }, "verify"), "auth.walletVerifyFailed");
  assert.equal(walletErrorCode(null), undefined);
});
