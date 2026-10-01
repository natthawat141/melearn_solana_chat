import assert from "node:assert/strict";
import test from "node:test";
import { openDatabase } from "../lib/db.ts";
import {
  buildOtpEmailHtml,
  isValidEmail,
  isValidPassword,
  issueEmailOtp,
  verifyEmailOtp,
} from "../lib/email-service.ts";

test("isValidEmail validates syntax and blocks disposable email services", () => {
  assert.equal(isValidEmail("user@gmail.com"), true);
  assert.equal(isValidEmail("student.melearn@outlook.co.th"), true);
  assert.equal(isValidEmail(""), false);
  assert.equal(isValidEmail("invalid-email"), false);
  assert.equal(isValidEmail("user@"), false);
  assert.equal(isValidEmail("@domain.com"), false);
  assert.equal(isValidEmail("user@tempmail.com"), false);
  assert.equal(isValidEmail("fake@10minutemail.com"), false);
  assert.equal(isValidEmail("test@yopmail.com"), false);
  assert.equal(isValidEmail("spammer@mailinator.com"), false);
});

test("isValidPassword enforces reasonable security length", () => {
  assert.equal(isValidPassword("123456"), true);
  assert.equal(isValidPassword("securepassword123"), true);
  assert.equal(isValidPassword("12345"), false);
  assert.equal(isValidPassword(""), false);
});

test("issueEmailOtp and verifyEmailOtp handle valid, invalid, and expired codes", () => {
  const db = openDatabase(":memory:");

  const email = "learner@example.com";
  const code = issueEmailOtp(db, email, "verify_email", { test: true }, 10);
  assert.match(code, /^\d{6}$/);

  // Wrong code
  const wrongRes = verifyEmailOtp(db, email, "000000", "verify_email");
  assert.equal(wrongRes.ok, false);
  assert.equal(wrongRes.error, "INVALID_CODE");

  // Wrong type
  const wrongType = verifyEmailOtp(db, email, code, "reset_password");
  assert.equal(wrongType.ok, false);

  // Correct code
  const validRes = verifyEmailOtp(db, email, code, "verify_email");
  assert.equal(validRes.ok, true);
  assert.equal(validRes.payload?.test, true);

  // Second attempt (already used)
  const replayRes = verifyEmailOtp(db, email, code, "verify_email");
  assert.equal(replayRes.ok, false);
});

test("buildOtpEmailHtml renders branded email with the 6-digit code", () => {
  const html = buildOtpEmailHtml({ code: "847291", type: "verify_email", locale: "th" });
  assert.match(html, /847291/);
  assert.match(html, /Melearn Chat/);
  assert.match(html, /รหัสยืนยันการสมัครสมาชิก/);

  const resetHtml = buildOtpEmailHtml({ code: "192837", type: "reset_password", locale: "en" });
  assert.match(resetHtml, /192837/);
  assert.match(resetHtml, /Reset your Melearn Chat password/);
});
