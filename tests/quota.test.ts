import assert from "node:assert/strict";
import test from "node:test";
import { openDatabase } from "../lib/db.ts";
import { consumePrompt, PROMPT_LIMIT, readQuota } from "../lib/quota.ts";

test("ten prompts block the account until the 24 hour window reloads", async () => {
  const db = openDatabase(":memory:");
  const start = Date.parse("2026-09-27T00:00:00.000Z");
  for (let index = 0; index < PROMPT_LIMIT; index += 1) {
    const state = await consumePrompt(db, "user", "user-1", start + index);
    assert.equal(state.remaining, PROMPT_LIMIT - index - 1);
    assert.equal(state.blocked, index === PROMPT_LIMIT - 1);
  }
  const blocked = await consumePrompt(db, "user", "user-1", start + 20);
  assert.equal(blocked.blocked, true);
  assert.equal((await readQuota(db, "user", "user-1", start + 20)).remaining, 0);
  const later = await readQuota(db, "user", "user-1", start + 24 * 60 * 60 * 1000);
  assert.equal(later.blocked, false);
  assert.equal(later.remaining, PROMPT_LIMIT);
});
