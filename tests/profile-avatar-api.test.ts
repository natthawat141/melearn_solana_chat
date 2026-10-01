import assert from "node:assert/strict";
import { AsyncLocalStorage } from "node:async_hooks";
import test from "node:test";
import sharp from "sharp";
import { openDatabase } from "../lib/db";
import { signSession, findUser } from "../lib/auth";

Object.assign(globalThis, { AsyncLocalStorage });

test("avatar upload requires login, updates only the session owner and persists on subsequent reads", async () => {
  const { POST } = await import("../app/api/me/avatar/route");
  const { workUnitAsyncStorage } = await import("next/dist/server/app-render/work-unit-async-storage.external.js");
  const { workAsyncStorage } = await import("next/dist/server/app-render/work-async-storage.external.js");
  const { RequestCookies, ResponseCookies } = await import("next/dist/server/web/spec-extension/cookies.js");
  const db = openDatabase(":memory:");
  const globalDb = globalThis as { melearnDb?: ReturnType<typeof openDatabase> };
  const previousDb = globalDb.melearnDb;
  const previousSecret = process.env.SESSION_SECRET;
  globalDb.melearnDb = db;
  process.env.SESSION_SECRET = "isolated-avatar-test-secret";
  try {
    for (const id of ["owner", "other"]) db.prepare("INSERT INTO users (id, display_name, password_hash, created_at) VALUES (?, ?, 'unused', ?)").run(id, id, new Date().toISOString());
    const image = await sharp({ create: { width: 40, height: 60, channels: 3, background: "#96cfff" } }).png().toBuffer();
    async function upload(authenticated: boolean, mime = "image/png") {
      const headers = new Headers({ cookie: `ml_guest=avatar-test${authenticated ? `; ml_session=${signSession("owner")}` : ""}` });
      const form = new FormData();
      form.set("image", new File([new Uint8Array(image)], "avatar.png", { type: mime }));
      // A supplied owner id must never select the account being updated.
      form.set("userId", "other");
      const request = new Request("http://127.0.0.1:43123/api/me/avatar", { method: "POST", headers, body: form });
      request.headers.set("content-length", String((await request.clone().arrayBuffer()).byteLength));
      const cookies = new ResponseCookies(new Headers());
      cookies.set("ml_guest", "avatar-test");
      if (authenticated) cookies.set("ml_session", signSession("owner"));
      const store = { type: "request", phase: "action", url: { pathname: "/api/me/avatar", search: "" }, headers, cookies: new RequestCookies(headers), mutableCookies: cookies, userspaceMutableCookies: cookies, draftMode: {}, renderResumeDataCache: null };
      return workAsyncStorage.run({ route: "/api/me/avatar", isStaticGeneration: false } as never, () => workUnitAsyncStorage.run(store as never, () => POST(request)));
    }
    assert.equal((await upload(false)).status, 401);
    assert.equal((await upload(true, "image/svg+xml")).status, 400);
    assert.equal(findUser(db, "owner")?.avatarUrl, null);
    const response = await upload(true);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.match(body.avatarUrl, /^data:image\/webp;base64,/);
    assert.equal(findUser(db, "owner")?.avatarUrl, body.avatarUrl);
    assert.equal(findUser(db, "other")?.avatarUrl, null);
  } finally {
    globalDb.melearnDb = previousDb;
    if (previousSecret === undefined) delete process.env.SESSION_SECRET; else process.env.SESSION_SECRET = previousSecret;
    db.close();
  }
});
