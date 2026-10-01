import assert from "node:assert/strict";
import { AsyncLocalStorage } from "node:async_hooks";
import test from "node:test";
import { openDatabase } from "../lib/db";
import { findUser, signSession } from "../lib/auth";

Object.assign(globalThis, { AsyncLocalStorage });

test("setup persists education per account, rejects invalid choices, supports skip and separate profile saves", async () => {
  const { PATCH } = await import("../app/api/preferences/route");
  const { workUnitAsyncStorage } = await import("next/dist/server/app-render/work-unit-async-storage.external.js");
  const { workAsyncStorage } = await import("next/dist/server/app-render/work-async-storage.external.js");
  const { RequestCookies, ResponseCookies } = await import("next/dist/server/web/spec-extension/cookies.js");
  const db = openDatabase(":memory:");
  const globalDb = globalThis as { melearnDb?: ReturnType<typeof openDatabase> };
  const previousDb = globalDb.melearnDb;
  const previousSecret = process.env.SESSION_SECRET;
  globalDb.melearnDb = db;
  process.env.SESSION_SECRET = "isolated-learning-profile-test";
  try {
    for (const id of ["owner", "other"]) await db.prepare("INSERT INTO users (id, display_name, password_hash, created_at) VALUES (?, ?, 'fixture', ?)").run(id, id, new Date().toISOString());
    async function patch(body: object, authenticated = true) {
      const headers = new Headers({ "content-type": "application/json", "x-guest-id": "setup-fixture" });
      const cookies = new ResponseCookies(new Headers());
      cookies.set("ml_guest", "setup-fixture");
      if (authenticated) cookies.set("ml_session", await signSession("owner"));
      const store = { type: "request", phase: "action", url: { pathname: "/api/preferences", search: "" }, headers, cookies: new RequestCookies(headers), mutableCookies: cookies, userspaceMutableCookies: cookies, draftMode: {}, renderResumeDataCache: null };
      const request = new Request("http://127.0.0.1:43123/api/preferences", { method: "PATCH", headers, body: JSON.stringify(body) });
      return workAsyncStorage.run({ route: "/api/preferences", isStaticGeneration: false } as never, () => workUnitAsyncStorage.run(store as never, () => PATCH(request)));
    }
    assert.equal((await patch({ educationStage: "university" }, false)).status, 401);
    assert.equal((await patch({ educationStage: "invalid", onboarded: true })).status, 400);
    assert.equal((await findUser(db, "owner"))?.onboarded, false);
    assert.equal((await patch({ educationStage: "secondary", preferredSubject: "math", level: "beginner", goal: "practice", onboarded: true })).status, 200);
    assert.equal((await findUser(db, "owner"))?.educationStage, "secondary");
    assert.equal((await findUser(db, "owner"))?.preferredSubject, "math");
    assert.equal((await findUser(db, "owner"))?.onboarded, true);
    assert.equal((await findUser(db, "other"))?.educationStage, null);
    assert.equal((await patch({ displayName: "renamed" })).status, 200);
    assert.equal((await findUser(db, "owner"))?.educationStage, "secondary");
    assert.equal((await findUser(db, "owner"))?.goal, "practice");
    assert.equal((await patch({ educationStage: null, preferredSubject: null, level: "unsure", goal: null, onboarded: true })).status, 200);
    assert.equal((await findUser(db, "owner"))?.educationStage, null);
    assert.equal((await findUser(db, "owner"))?.goal, null);
    assert.equal((await findUser(db, "owner"))?.onboarded, true);
  } finally {
    globalDb.melearnDb = previousDb;
    if (previousSecret === undefined) delete process.env.SESSION_SECRET; else process.env.SESSION_SECRET = previousSecret;
    db.close();
  }
});
