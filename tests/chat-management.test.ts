import assert from "node:assert/strict";
import test from "node:test";
import { openDatabase } from "../lib/db.ts";
import { deleteChat, renameChat, validChatTitle } from "../lib/chat-management.ts";
import { buildChatHistory } from "../lib/chat-history.ts";

async function fixture() {
  const db = openDatabase(":memory:");
  for (const [id, type, owner] of [["mine", "user", "alice"], ["other", "user", "bob"], ["guest", "guest", "alice"]]) {
    await db.prepare("INSERT INTO conversations (id, owner_type, owner_id, teacher_id, lesson_id, created_at, updated_at) VALUES (?, ?, ?, 'general', 'general', '2026-10-01', '2026-10-01')").run(id, type, owner);
    await db.prepare("INSERT INTO messages (id, conversation_id, role, text, created_at) VALUES (?, ?, 'user', 'Original prompt', '2026-10-01')").run(`${id}-msg`, id);
  }
  return db;
}

test("rename persists a custom title without editing messages or activity dates", async () => {
  const db = await fixture();
  assert.equal(await renameChat(db, "alice", "mine", "  My learning notes  "), true);
  const history = await buildChatHistory(db, "en", "alice");
  assert.equal(history[0]?.title, "My learning notes");
  assert.equal(history[0]?.updatedAt, "2026-10-01");
  assert.equal((await db.prepare("SELECT text FROM messages WHERE id = 'mine-msg'").get<{ text: string }>())?.text, "Original prompt");
  assert.equal(await renameChat(db, "alice", "other", "stolen"), false);
  assert.equal(await renameChat(db, "alice", "guest", "guest"), false);
  for (const title of ["", "  ", "x".repeat(101), null, {}]) assert.equal(validChatTitle(title), false);
  await assert.rejects(renameChat(db, "alice", "mine", "  "), /INVALID_TITLE/);
});

test("delete removes only the owner's selected chat and messages, preserving progress and quota", async () => {
  const db = await fixture();
  await db.prepare("INSERT INTO quotas (owner_type, owner_id, used, window_started_at) VALUES ('user', 'alice', 8, '2026-10-01')").run();
  await db.prepare("INSERT INTO progress (owner_type, owner_id, lesson_id, lesson_version, status, updated_at) VALUES ('user', 'alice', 'english-intro-01', 1, 'completed', '2026-10-01')").run();
  assert.equal(await deleteChat(db, "alice", "other"), false);
  assert.equal(await deleteChat(db, "alice", "guest"), false);
  assert.equal(await deleteChat(db, "alice", "mine"), true);
  assert.equal(await deleteChat(db, "alice", "mine"), false);
  assert.equal((await db.prepare("SELECT id FROM messages").all()).length, 2);
  assert.equal((await db.prepare("SELECT id FROM conversations").all()).length, 2);
  assert.equal((await db.prepare("SELECT used FROM quotas").get<{ used: number }>())?.used, 8);
  assert.equal((await db.prepare("SELECT status FROM progress").get<{ status: string }>())?.status, "completed");
});

test("Cloudflare migrations add chat titles without removing existing conversations", async () => {
  const { DatabaseSync } = await import("node:sqlite");
  const { readFileSync, readdirSync } = await import("node:fs");
  const db = new DatabaseSync(":memory:");
  try {
    const directory = new URL("../cloudflare/migrations/", import.meta.url);
    const migrations = readdirSync(directory).filter(name => name.endsWith(".sql")).sort();
    for (const migration of migrations.filter(name => name !== "0006_conversation_title.sql")) db.exec(readFileSync(new URL(migration, directory), "utf8"));
    db.prepare("INSERT INTO conversations (id, owner_type, owner_id, teacher_id, lesson_id, created_at, updated_at) VALUES ('existing', 'user', 'alice', 'general', 'general', '2026-10-01', '2026-10-01')").run();
    db.exec(readFileSync(new URL("0006_conversation_title.sql", directory), "utf8"));
    const row = db.prepare("SELECT id, title FROM conversations").get();
    assert.equal(row?.id, "existing");
    assert.equal(row?.title, null);
  } finally {
    db.close();
  }
});
