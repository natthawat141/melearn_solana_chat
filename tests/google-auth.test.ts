import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loginWithGoogle, registerUser } from "../lib/auth";
import { openDatabase } from "../lib/db";
import { verifyGoogleFirebaseIdToken } from "../lib/firebase-google";

test("Google ID token is checked by Firebase and returns only a Google identity", async () => {
  const originalFetch = globalThis.fetch;
  let requestBody = "";
  globalThis.fetch = async (input, init) => {
    assert.match(String(input), /^https:\/\/identitytoolkit\.googleapis\.com\/v1\/accounts:lookup\?key=/);
    assert.equal(init?.method, "POST");
    requestBody = String(init?.body);
    return new Response(JSON.stringify({ users: [{
      localId: "firebase-uid-1",
      displayName: "Ada Learner",
      photoUrl: "https://lh3.googleusercontent.com/photo.png",
      providerUserInfo: [{ providerId: "google.com" }],
    }] }), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    const result = await verifyGoogleFirebaseIdToken("signed-firebase-id-token");
    assert.deepEqual(JSON.parse(requestBody), { idToken: "signed-firebase-id-token" });
    assert.deepEqual(result, {
      ok: true,
      identity: { uid: "firebase-uid-1", displayName: "Ada Learner", photoUrl: "https://lh3.googleusercontent.com/photo.png" },
    });
  } finally { globalThis.fetch = originalFetch; }
});

test("Firebase rejects non-Google, disabled, and unavailable identities", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ users: [{ localId: "firebase-uid-1", providerUserInfo: [{ providerId: "password" }] }] }), { status: 200 });
    assert.deepEqual(await verifyGoogleFirebaseIdToken("signed-firebase-id-token"), { ok: false, reason: "invalid" });

    globalThis.fetch = async () => new Response("{}", { status: 503 });
    assert.deepEqual(await verifyGoogleFirebaseIdToken("signed-firebase-id-token"), { ok: false, reason: "unavailable" });
  } finally { globalThis.fetch = originalFetch; }
});

test("Google UID keeps one Melearn account, avoids username collisions, and migrates guest progress", async () => {
  const db = openDatabase(":memory:");
  try {
    const passwordUser = await registerUser(db, {
      displayName: "Ada Learner", password: "pass1234", guestId: "guest-password", locale: "th", level: null, goal: null, onboarded: false,
    });
    await db.prepare("INSERT INTO progress (owner_type, owner_id, lesson_id, lesson_version, status, updated_at) VALUES ('guest', ?, 'lesson-1', 1, 'started', ?)")
      .run("guest-google", new Date().toISOString());

    const first = await loginWithGoogle(db, {
      googleUid: "google-account-uid", displayName: "Ada Learner", photoUrl: "https://lh3.googleusercontent.com/first.png", guestId: "guest-google", locale: "en",
    });
    assert.notEqual(first.id, passwordUser.id);
    assert.notEqual(first.displayName, passwordUser.displayName);
    assert.equal(first.avatarUrl, "https://lh3.googleusercontent.com/first.png");
    assert.equal((await db.prepare("SELECT owner_id FROM progress WHERE lesson_id = 'lesson-1'").get<{ owner_id: string }>())?.owner_id, first.id);

    await db.prepare("UPDATE users SET display_name = ?, avatar_url = ? WHERE id = ?").run("My chosen name", "https://example.com/custom.png", first.id);
    const next = await loginWithGoogle(db, {
      googleUid: "google-account-uid", displayName: "Changed Google name", photoUrl: "https://lh3.googleusercontent.com/second.png", guestId: "guest-google-2", locale: "en",
    });
    assert.equal(next.id, first.id);
    assert.equal(next.displayName, "My chosen name");
    assert.equal(next.avatarUrl, "https://example.com/custom.png");
    assert.equal(((await db.prepare("SELECT count(*) AS n FROM users").get()) as { n: number }).n, 2);
  } finally { db.close(); }
});

test("opening an existing SQLite account database adds the Google identity column", async () => {
  const directory = mkdtempSync(join(tmpdir(), "melearn-google-auth-"));
  const filename = join(directory, "legacy.sqlite");
  const legacy = new DatabaseSync(filename);
  legacy.exec("CREATE TABLE users (id TEXT PRIMARY KEY, display_name TEXT NOT NULL COLLATE NOCASE UNIQUE, password_hash TEXT NOT NULL, locale TEXT NOT NULL DEFAULT 'th', level TEXT, goal TEXT, onboarded INTEGER NOT NULL DEFAULT 0, wallet_address TEXT, created_at TEXT NOT NULL)");
  legacy.close();
  try {
    const db = openDatabase(filename);
    try {
      const columns = await db.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
      assert.ok(columns.some((column) => column.name === "google_uid"));
      assert.ok(columns.some((column) => column.name === "avatar_url"));
      assert.ok(columns.some((column) => column.name === "education_stage"));
    } finally { db.close(); }
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
