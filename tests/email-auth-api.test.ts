import assert from "node:assert/strict";
import { AsyncLocalStorage } from "node:async_hooks";
import test from "node:test";
import { openDatabase } from "../lib/db";
import { loginUser, readSession } from "../lib/auth";

Object.assign(globalThis, { AsyncLocalStorage });
const origin = "http://127.0.0.1:43123";

async function call(
  handler: (request: Request) => Promise<Response>,
  endpoint: string,
  body: object,
  guest = "guest-test-1"
) {
  const { workUnitAsyncStorage } = await import("next/dist/server/app-render/work-unit-async-storage.external.js");
  const { workAsyncStorage } = await import("next/dist/server/app-render/work-async-storage.external.js");
  const { RequestCookies, ResponseCookies } = await import("next/dist/server/web/spec-extension/cookies.js");
  const headers = new Headers({
    "content-type": "application/json",
    origin,
    cookie: `ml_guest=${guest}`,
    "x-guest-id": guest,
    "x-forwarded-for": "127.0.0.1",
  });
  const request = new Request(`${origin}${endpoint}`, { method: "POST", headers, body: JSON.stringify(body) });
  const cookieStore = new ResponseCookies(new Headers());
  cookieStore.set("ml_guest", guest);
  const store = {
    type: "request" as const,
    phase: "action" as const,
    url: { pathname: endpoint, search: "" },
    headers,
    cookies: new RequestCookies(headers),
    mutableCookies: cookieStore,
    userspaceMutableCookies: cookieStore,
    draftMode: {},
    renderResumeDataCache: null,
  };
  const response = await workAsyncStorage.run(
    { route: endpoint, isStaticGeneration: false } as never,
    () => workUnitAsyncStorage.run(store as never, () => handler(request))
  );
  return { response, body: await response.json(), cookie: cookieStore.get("ml_session") };
}

test("email OTP registration and password reset API lifecycle", async (t) => {
  const { POST: requestOtp } = await import("../app/api/auth/register/request-otp/route");
  const { POST: verifyOtp } = await import("../app/api/auth/register/verify-otp/route");
  const { POST: requestReset } = await import("../app/api/auth/password-reset/request/route");
  const { POST: confirmReset } = await import("../app/api/auth/password-reset/confirm/route");

  const db = openDatabase(":memory:");
  (globalThis as { melearnDb?: ReturnType<typeof openDatabase> }).melearnDb = db;
  process.env.SESSION_SECRET = "test-session-secret-email-auth";

  // Mock RESEND_API_KEY so email sending is attempted, but we can intercept or let it skip sending gracefully
  process.env.RESEND_API_KEY = "re_test_mock_key";

  // 1. Invalid email
  const badEmailRes = await call(requestOtp, "/api/auth/register/request-otp", {
    email: "not-an-email",
    password: "password123",
  });
  assert.equal(badEmailRes.response.status, 400);
  assert.equal(badEmailRes.body.code, "EMAIL_INVALID");

  // 2. Disposable email
  const disposableRes = await call(requestOtp, "/api/auth/register/request-otp", {
    email: "fake@tempmail.com",
    password: "password123",
  });
  assert.equal(disposableRes.response.status, 400);
  assert.equal(disposableRes.body.code, "EMAIL_INVALID");

  // 3. Short password
  const shortPassRes = await call(requestOtp, "/api/auth/register/request-otp", {
    email: "learner@example.com",
    password: "123",
  });
  assert.equal(shortPassRes.response.status, 400);
  assert.equal(shortPassRes.body.code, "PASSWORD_SHORT");

  // 4. Successful OTP issuance in DB (we simulate DB directly if Resend mock returns network fail, or test issueEmailOtp)
  // Let's test the database flow directly
  const testEmail = "learner@melearn.io";
  const testPass = "securePass123";

  // Insert code into DB directly as issueEmailOtp would
  const { issueEmailOtp } = await import("../lib/email-service");
  const issuedCode = issueEmailOtp(db, testEmail, "verify_email", { password: testPass, displayName: "Learner Bill" });
  assert.match(issuedCode, /^\d{6}$/);

  // 5. Verify OTP with wrong code
  const wrongCodeRes = await call(verifyOtp, "/api/auth/register/verify-otp", {
    email: testEmail,
    code: "000000",
  });
  assert.equal(wrongCodeRes.response.status, 400);
  assert.equal(wrongCodeRes.body.code, "INVALID_CODE");

  // 6. Verify OTP with correct code
  const validVerifyRes = await call(verifyOtp, "/api/auth/register/verify-otp", {
    email: testEmail,
    code: issuedCode,
  });
  assert.equal(validVerifyRes.response.status, 200);
  assert.equal(validVerifyRes.body.user.displayName, "Learner Bill");
  assert.ok(validVerifyRes.cookie?.value);

  const sessionId = readSession(validVerifyRes.cookie.value);
  assert.equal(sessionId, validVerifyRes.body.user.id);

  // Verify user in db has email_verified = 1
  const dbUser = db.prepare("SELECT * FROM users WHERE email = ?").get(testEmail) as { email_verified: number | string };
  assert.equal(Number(dbUser.email_verified), 1);

  // 7. Password reset request
  t.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({ id: "test-email" }), { status: 200 }));
  const requestedReset = await call(requestReset, "/api/auth/password-reset/request", { email: "Learner Bill" });
  assert.equal(requestedReset.response.status, 200);
  assert.equal(requestedReset.body.email, testEmail);
  const resetCode = (db.prepare("SELECT code FROM email_codes WHERE email = ? AND type = ? AND used_at IS NULL").get(testEmail, "reset_password") as { code: string }).code;
  assert.match(resetCode, /^\d{6}$/);

  // 8. Confirm reset with short password
  const shortNewPassRes = await call(confirmReset, "/api/auth/password-reset/confirm", {
    email: testEmail,
    code: resetCode,
    newPassword: "123",
  });
  assert.equal(shortNewPassRes.response.status, 400);
  assert.equal(shortNewPassRes.body.code, "PASSWORD_SHORT");

  // 9. Confirm reset with correct OTP
  const validResetRes = await call(confirmReset, "/api/auth/password-reset/confirm", {
    email: testEmail,
    code: resetCode,
    newPassword: "newSecurePassword456",
  });
  assert.equal(validResetRes.response.status, 200);
  assert.ok(validResetRes.cookie?.value);

  // 10. Login with new password works
  const loggedIn = loginUser(db, {
    displayName: testEmail,
    password: "newSecurePassword456",
    guestId: "guest-test-2",
  });
  assert.equal(loggedIn.id, validVerifyRes.body.user.id);
});
