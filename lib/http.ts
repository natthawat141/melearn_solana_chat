import { NextResponse } from "next/server";
import { t } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

const messages = {
  LEARNING_PROFILE_INVALID: { th: "ข้อมูลการเรียนไม่ถูกต้อง กรุณาเลือกจากตัวเลือกที่มี", en: "Please choose a valid learning profile option." },
  PROFILE_IMAGE_INVALID: { th: "ใช้รูป JPG, PNG หรือ WebP ขนาดไม่เกิน 2 MB", en: "Use a JPG, PNG or WebP image up to 2 MB." },
  NOT_FOUND: { th: "ไม่พบรายการนี้", en: "We could not find that." },
  UNAUTHORIZED: { th: "ต้องเข้าสู่ระบบก่อน", en: "Sign in first." },
  ENTITLEMENT_REQUIRED: { th: "บทนี้ยังไม่ปลดล็อก", en: "This lesson is still locked." },
  TEACHER_UNAVAILABLE: { th: "ครูคนนี้ยังไม่เปิดในรอบนี้", en: "This teacher is not open in this MVP." },
  EMPTY: { th: "พิมพ์ข้อความก่อนส่ง", en: "Write a message before sending." },
  TOO_LONG: { th: "ข้อความยาวเกิน 2,000 ตัวอักษร", en: "Messages are limited to 2,000 characters." },
  BAD_MESSAGE_ID: { th: "รหัสข้อความไม่ถูกต้อง", en: "That message id is not valid." },
  RATE_LIMIT: { th: "ส่งถี่เกินไป รอสักครู่แล้วลองใหม่", en: "Too many messages. Wait a moment and try again." },
  INVALID: { th: "ชื่อหรือรหัสผ่านไม่ถูกต้อง", en: "That name or password is not correct." },
  TAKEN: { th: "ชื่อนี้ถูกใช้แล้ว ลองเข้าสู่ระบบ", en: "That name is taken. Try signing in." },
  PASSWORD: { th: "รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร", en: "Use at least 4 characters." },
  NAME: { th: "ใส่ชื่อที่อยากให้ครูเรียก", en: "Add the name you want the teacher to use." },
  OWNED: { th: "คุณปลดล็อกบทนี้แล้ว", en: "You already unlocked this lesson." },
  PRICE: { th: "บทยังไม่ได้ตั้งราคา จึงยังไม่เปิดชำระ", en: "This lesson has no price yet, so payment stays closed." },
  NETWORK: { th: "MVP นี้รับเฉพาะ Solana devnet", en: "This MVP accepts Solana devnet only." },
  LESSON: { th: "บทนี้ไม่เปิดให้ซื้อ", en: "This lesson is not for sale." },
  STATE: { th: "รายการนี้เปลี่ยนขั้นตอนไม่ได้", en: "This purchase cannot change step." },
  TX_NOT_FOUND: { th: "ยังไม่พบธุรกรรมบน devnet ถ้าส่งคนละเครือข่ายจะไม่ถูกนับ", en: "No transaction on devnet yet. A different network does not count." },
  TX_MISMATCH: { th: "ธุรกรรมไม่ตรงกับรายการ จึงไม่ปลดล็อก", en: "The transaction does not match this purchase, so it was not unlocked." },
  BAD_SIGNATURE: { th: "ลายเซ็นไม่ถูกต้อง", en: "That signature is not valid." },
  WALLET: { th: "เชื่อมกระเป๋าไม่สำเร็จ", en: "Could not link that wallet." },
  CHALLENGE: { th: "คำขอยืนยันกระเป๋าหมดอายุ ลองใหม่", en: "That wallet challenge expired. Try again." },
  GOOGLE_TOKEN_INVALID: { th: "การยืนยันบัญชี Google ไม่สำเร็จ กรุณาเข้าสู่ระบบใหม่", en: "Google account verification failed. Sign in again." },
  GOOGLE_AUTH_UNAVAILABLE: { th: "บริการเข้าสู่ระบบ Google ขัดข้องชั่วคราว ลองใหม่อีกสักครู่", en: "Google sign-in is temporarily unavailable. Try again shortly." },
  EMAIL_INVALID: { th: "รูปแบบอีเมลไม่ถูกต้อง หรือเป็นอีเมลชั่วคราวที่ไม่รองรับ", en: "Invalid email format or temporary email service not supported." },
  PASSWORD_SHORT: { th: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร", en: "Password must be at least 6 characters long." },
  EMAIL_TAKEN: { th: "อีเมลนี้มีผู้ใช้งานแล้ว ลองเข้าสู่ระบบหรือกดลืมรหัสผ่าน", en: "This email is already registered. Try signing in or reset password." },
  EMAIL_SEND_FAILED: { th: "ส่งอีเมลยืนยันไม่สำเร็จ กรุณาตรวจสอบอีเมลหรือลองใหม่อีกครั้ง", en: "Failed to send verification email. Please check your email and try again." },
  INVALID_CODE: { th: "รหัส OTP ไม่ถูกต้อง กรุณาตรวจสอบรหัสอีกครั้ง", en: "Incorrect verification code. Please check and try again." },
  EXPIRED_CODE: { th: "รหัส OTP หมดอายุแล้ว กรุณากดขอรหัสใหม่", en: "Verification code has expired. Please request a new one." },
  USER_NOT_FOUND: { th: "ไม่พบบัญชีผู้ใช้นี้ในระบบ", en: "No account found with this email." },
  EMAIL_VERIFICATION_REQUIRED: { th: "ต้องยืนยันอีเมลด้วยรหัส OTP ก่อนเข้าใช้งาน", en: "Email verification with OTP is required." },
} as const;

export function errorMessage(locale: Locale, code: string) {
  const known = messages[code as keyof typeof messages];
  if (known) return known[locale];
  return t(locale, "common.error");
}

export function jsonError(locale: Locale, status: number, code: string, retryable = false) {
  return NextResponse.json(
    { code, message: errorMessage(locale, code), retryable, requestId: crypto.randomUUID() },
    { status },
  );
}

export function clientIp(headerStore: Headers) {
  return headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

export function jsonWalletRateLimit(locale: Locale, retryAfterSeconds: number) {
  const minutes = Math.ceil(retryAfterSeconds / 60);
  const message = locale === "th"
    ? `บริการยืนยันกระเป๋าจำกัดคำขอชั่วคราว กรุณารอประมาณ ${minutes} นาที แล้วลองอีกครั้ง`
    : `Wallet verification is temporarily rate limited. Wait about ${minutes} minutes and try again.`;
  return NextResponse.json({code: "RATE_LIMIT", message, retryable: true}, {
    status: 429, headers: {"Retry-After": String(retryAfterSeconds)},
  });
}
