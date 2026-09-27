import { NextResponse } from "next/server";
import { t } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

const messages = {
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
