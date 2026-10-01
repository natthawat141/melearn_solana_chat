import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { openDatabase } from "../lib/db";
import { exportCloudflareData } from "../scripts/export-cloudflare-data.mjs";

test("Cloudflare export round-trips account, photo and history without modifying its source", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "melearn-export-"));
  const filename = path.join(directory, "source.db");
  const output = path.join(directory, "import.sql");
  const source = openDatabase(filename);
  const target = new DatabaseSync(":memory:");
  try {
    const stamp = new Date().toISOString();
    const name = "ครู 'Bill'; --";
    source.prepare("INSERT INTO users (id, display_name, password_hash, avatar_url, created_at) VALUES ('owner', ?, 'fixture', 'data:image/webp;base64,fixture', ?)").run(name, stamp);
    source.prepare("INSERT INTO conversations (id, owner_type, owner_id, teacher_id, lesson_id, created_at, updated_at) VALUES ('chat', 'user', 'owner', 'ray', 'english-intro-01', ?, ?)").run(stamp, stamp);
    source.prepare("INSERT INTO messages (id, conversation_id, role, text, created_at) VALUES ('message', 'chat', 'user', ?, ?)").run("hello\nสวัสดี ' ", stamp);
    source.prepare("INSERT INTO wallet_challenges (nonce, user_id, message, expires_at) VALUES ('nonce', 'owner', 'proof', ?)").run(stamp);
    const counts = exportCloudflareData(filename, output);
    assert.equal(counts.users, 1);
    assert.equal(counts.messages, 1);
    assert.equal(statSync(output).mode & 0o777, 0o600);
    target.exec(readFileSync(new URL("../cloudflare/migrations/0001_initial.sql", import.meta.url), "utf8"));
    target.exec(readFileSync(new URL("../cloudflare/migrations/0002_learning_profile.sql", import.meta.url), "utf8"));
    target.exec(readFileSync(new URL("../cloudflare/migrations/0003_google_auth.sql", import.meta.url), "utf8"));
    target.exec(readFileSync(new URL("../cloudflare/migrations/0004_email_auth.sql", import.meta.url), "utf8"));
    target.exec(readFileSync(output, "utf8"));
    for (const table of ["users", "conversations", "messages"]) assert.deepEqual(target.prepare(`SELECT * FROM ${table}`).all(), source.prepare(`SELECT * FROM ${table}`).all());
    assert.equal((target.prepare("SELECT count(*) AS n FROM wallet_challenges").get() as { n: number }).n, 0);
    assert.equal((source.prepare("SELECT count(*) AS n FROM wallet_challenges").get() as { n: number }).n, 1);
    assert.throws(() => exportCloudflareData(filename, output), /EEXIST/);
    assert.throws(() => exportCloudflareData(filename, filename), /separate file/);
  } finally { source.close(); target.close(); rmSync(directory, { recursive: true, force: true }); }
});
