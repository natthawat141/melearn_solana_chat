import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { WalletAuthError } from "../lib/wallet-auth-error";
import { WalletRateLimitError } from "../lib/wallet-auth-error";
import * as diagnostics from "../lib/wallet-diagnostics";

test("the alert reference matches saved logs and excludes request bodies and credentials", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "wallet-diagnostics-"));
  try {
    const error = Object.assign(new WalletAuthError("SIGNATURE_INVALID", "signature"), {
      jwt: "private-jwt", signature: "private-signature", messageToSign: "private-message", publicKey: "private-address",
    });
    const report = diagnostics.walletFailure("th", error, {
      requestId: "11111111-1111-4111-8111-111111111111", action: "verify", stage: "account", wallet: "phantom", chain: "SOL", startedAt: Date.now(),
    }, dir);
    assert.equal(report.status, 400);
    assert.equal(report.body.requestId, "11111111-1111-4111-8111-111111111111");
    assert.equal(report.body.diagnostic.reason, "SIGNATURE_INVALID");
    const log = readFileSync(path.join(dir, "wallet-auth.jsonl"), "utf8");
    assert.ok(log.includes(report.body.requestId));
    assert.ok(log.includes('"stage":"signature"'));
    assert.ok(!log.includes("private-"));
    assert.ok(!JSON.stringify(report).includes("private-"));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("rate limit errors expose the same retry delay to the alert and HTTP header", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "wallet-diagnostics-"));
  try {
    const error = new WalletRateLimitError(60, "input");
    const report = diagnostics.walletFailure("en", error, { requestId: crypto.randomUUID(), action: "challenge", stage: "input", startedAt: Date.now() }, dir);
    assert.equal(report.status, 429);
    assert.equal(report.body.retryAfterSeconds, 60);
    assert.equal(report.headers["Retry-After"], "60");
    assert.equal(report.body.diagnostic.stage, "input");
    assert.match(report.body.message, /1 minutes/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("unexpected account errors are logged by stage without exposing raw messages", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "wallet-diagnostics-"));
  try {
    const report = diagnostics.walletFailure("th", new Error("private-database-details"), { requestId: crypto.randomUUID(), action: "verify", stage: "account", startedAt: Date.now() }, dir);
    assert.equal(report.status, 500);
    assert.equal(report.body.diagnostic.reason, "WALLET_INTERNAL_ERROR");
    assert.equal(report.body.diagnostic.stage, "account");
    assert.ok(!readFileSync(path.join(dir, "wallet-auth.jsonl"), "utf8").includes("private-"));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
