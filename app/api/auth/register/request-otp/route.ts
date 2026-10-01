import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { findUserByNameOrEmail, hashPassword } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { issueEmailOtp, isValidEmail, isValidPassword, sendOtpEmail } from "@/lib/email-service";
import { clientIp, jsonError } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { getViewer } from "@/lib/viewer";

export async function POST(request: Request) {
  const viewer = await getViewer();
  const headerStore = await headers();
  const ip = clientIp(headerStore);

  if (!rateLimit(`auth-reg-otp:${ip}`, 5, 60_000)) {
    return jsonError(viewer.locale, 429, "RATE_LIMIT", true);
  }

  const body = (await request.json().catch(() => null)) as {
    email?: string;
    password?: string;
    displayName?: string;
  } | null;

  if (!body || !body.email || !body.password) {
    return jsonError(viewer.locale, 400, "EMAIL_INVALID");
  }

  const email = body.email.trim().toLowerCase();
  const password = body.password;

  if (!isValidEmail(email)) {
    return jsonError(viewer.locale, 400, "EMAIL_INVALID");
  }

  if (!isValidPassword(password)) {
    return jsonError(viewer.locale, 400, "PASSWORD_SHORT");
  }

  const db = getDb();
  const existing = findUserByNameOrEmail(db, email);
  if (existing) {
    return jsonError(viewer.locale, 400, "EMAIL_TAKEN");
  }

  const displayName = body.displayName?.trim() || email.split("@")[0];
  const passwordHash = hashPassword(password);

  const code = issueEmailOtp(db, email, "verify_email", { passwordHash, displayName }, 10);
  const sendRes = await sendOtpEmail({
    email,
    code,
    type: "verify_email",
    locale: viewer.locale,
  });

  if (!sendRes.ok) {
    if (sendRes.error?.includes("melearn.vmi@gmail.com") || sendRes.error?.includes("only send testing emails")) {
      return NextResponse.json(
        {
          code: "RESEND_SANDBOX_RESTRICTION",
          message:
            viewer.locale === "th"
              ? "Resend ยังอยู่ในโหมดทดสอบ (Sandbox) ส่งได้เฉพาะอีเมลเจ้าของบัญชี melearn.vmi@gmail.com กรุณาเพิ่ม DNS ใน Cloudflare ให้ melearn.io เพื่อส่งหาอีเมลทั่วไปได้"
              : "Resend is in sandbox mode. It can only send to melearn.vmi@gmail.com until DNS is verified in Cloudflare for melearn.io.",
          retryable: false,
        },
        { status: 400 }
      );
    }
    return jsonError(viewer.locale, 500, "EMAIL_SEND_FAILED");
  }

  return NextResponse.json({ ok: true, email });
}
