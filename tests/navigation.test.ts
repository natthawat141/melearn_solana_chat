import assert from "node:assert/strict";
import test from "node:test";
import { safeLearningDestination } from "../lib/navigation.ts";

test("login return path accepts learning routes and rejects external or malformed destinations", () => {
  assert.equal(safeLearningDestination("/learn/english-intro-01"), "/learn/english-intro-01");
  assert.equal(safeLearningDestination("/unlock/math-percent-01"), "/unlock/math-percent-01");
  assert.equal(safeLearningDestination("/chat"), "/chat");
  for (const path of [undefined, "https://example.com", "//example.com", "/\\example.com", "/login", "/api/auth/logout", "/app", "/chat?next=https://example.com", "/learn/../login"]) {
    assert.equal(safeLearningDestination(path), "/chat");
  }
});
