import crypto from "crypto";
import type { AppDatabase } from "@/lib/db";
import type { Locale } from "@/lib/types";

// Blacklist of common disposable email domains to prevent spam accounts
export const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "tempmail.com",
  "temp-mail.org",
  "10minutemail.com",
  "guerrillamail.com",
  "mailinator.com",
  "yopmail.com",
  "dispostable.com",
  "throwawaymail.com",
  "trashmail.com",
  "getairmail.com",
  "mytemp.email",
  "fakeinbox.com",
  "sharklasers.com",
  "generator.email",
  "inboxkitten.com",
  "nada.ltd",
  "mohmal.com",
  "crazymailing.com",
  "dropmail.me",
  "burnermail.io",
]);

export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const clean = email.trim();
  if (clean.length < 5 || clean.length > 254) return false;
  // RFC 5322 standard regex
  const regex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!regex.test(clean)) return false;

  const domain = clean.split("@")[1]?.toLowerCase();
  if (!domain || DISPOSABLE_EMAIL_DOMAINS.has(domain)) return false;
  return true;
}

export function isValidPassword(password: string): boolean {
  return typeof password === "string" && password.length >= 6 && password.length <= 72;
}

export type EmailCodeType = "verify_email" | "reset_password";

export function issueEmailOtp(
  db: AppDatabase,
  email: string,
  type: EmailCodeType,
  payload?: Record<string, unknown>,
  ttlMinutes = 10
): string {
  const cleanEmail = email.trim().toLowerCase();
  // Invalidate prior unused OTPs for this email and type
  db.prepare(
    "UPDATE email_codes SET used_at = ? WHERE email = ? AND type = ? AND used_at IS NULL"
  ).run(Date.now(), cleanEmail, type);

  // Generate secure 6-digit numeric OTP (100000 - 999999 inclusive)
  const code = String(crypto.randomInt(100000, 1000000));
  const id = crypto.randomUUID();
  const expiresAt = Date.now() + ttlMinutes * 60 * 1000;
  const createdAt = new Date().toISOString();
  const payloadJson = payload ? JSON.stringify(payload) : null;

  db.prepare(
    "INSERT INTO email_codes (id, email, code, type, payload_json, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(id, cleanEmail, code, type, payloadJson, expiresAt, createdAt);

  return code;
}

export function verifyEmailOtp(
  db: AppDatabase,
  email: string,
  code: string,
  type: EmailCodeType,
  maxAttempts = 5
): { ok: boolean; payload?: Record<string, unknown>; error?: string } {
  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = code.trim();

  const record = db.prepare(
    "SELECT * FROM email_codes WHERE email = ? AND type = ? AND used_at IS NULL ORDER BY created_at DESC LIMIT 1"
  ).get(cleanEmail, type) as {
    id: string;
    code: string;
    payload_json: string | null;
    expires_at: number;
    attempts?: number;
  } | undefined;

  if (!record) {
    return { ok: false, error: "INVALID_CODE" };
  }

  if (record.expires_at < Date.now()) {
    return { ok: false, error: "EXPIRED_CODE" };
  }

  const currentAttempts = (record.attempts ?? 0) + 1;

  if (record.code !== cleanCode) {
    if (currentAttempts >= maxAttempts) {
      db.prepare("UPDATE email_codes SET used_at = ?, attempts = ? WHERE id = ?").run(Date.now(), currentAttempts, record.id);
      return { ok: false, error: "TOO_MANY_ATTEMPTS" };
    }
    db.prepare("UPDATE email_codes SET attempts = ? WHERE id = ?").run(currentAttempts, record.id);
    return { ok: false, error: "INVALID_CODE" };
  }

  // Mark as used
  db.prepare("UPDATE email_codes SET used_at = ?, attempts = ? WHERE id = ?").run(Date.now(), currentAttempts, record.id);

  let payload: Record<string, unknown> | undefined;
  if (record.payload_json) {
    try {
      payload = JSON.parse(record.payload_json) as Record<string, unknown>;
    } catch {
      // ignore
    }
  }

  return { ok: true, payload };
}

export function buildOtpEmailHtml({
  code,
  type,
  locale = "en",
}: {
  code: string;
  type: EmailCodeType;
  locale?: Locale;
}) {
  const isReset = type === "reset_password";
  const title = isReset
    ? locale === "th"
      ? "รหัสรีเซ็ตรหัสผ่าน Melearn Chat"
      : "Reset your Melearn Chat password"
    : locale === "th"
      ? "รหัสยืนยันการสมัครสมาชิก Melearn Chat"
      : "Verify your Melearn Chat email";

  const description = isReset
    ? locale === "th"
      ? "เราได้รับคำขอรีเซ็ตรหัสผ่านสำหรับบัญชีของคุณ กรุณาใช้รหัส OTP ด้านล่างนี้เพื่อตั้งรหัสผ่านใหม่:"
      : "We received a request to reset your password. Use the verification code below to set a new password:"
    : locale === "th"
      ? "ขอบคุณที่สมัคร Melearn Chat! กรุณาใช้รหัส OTP ด้านล่างนี้เพื่อยืนยันอีเมลของคุณ:"
      : "Thank you for joining Melearn Chat! Use the verification code below to confirm your email:";

  const note =
    locale === "th"
      ? "รหัสนี้จะหมดอายุภายใน 10 นาที หากคุณไม่ได้ส่งคำขอนี้ สามารถเพิกเฉยต่ออีเมลนี้ได้อย่างปลอดภัย"
      : "This code expires in 10 minutes. If you did not make this request, you can safely ignore this email.";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f8fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="min-height: 100vh; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 500px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.08); overflow: hidden; border: 1px solid #e2e8f0;">
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; background: linear-gradient(180deg, #e0f2fe 0%, #ffffff 100%);">
              <h1 style="margin: 0 0 12px; font-size: 22px; font-weight: 700; color: #0f172a; line-height: 1.3;">
                ${title}
              </h1>
              <p style="margin: 0; font-size: 15px; color: #475569; line-height: 1.5;">
                ${description}
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 16px 32px 24px;">
              <div style="display: inline-block; background-color: #f0f7ff; border: 2px dashed #93c5fd; border-radius: 12px; padding: 16px 32px; letter-spacing: 8px; font-size: 32px; font-weight: 800; color: #1d4ed8; font-family: monospace;">
                ${code}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 32px; text-align: center;">
              <p style="margin: 0 0 20px; font-size: 13px; color: #64748b; line-height: 1.5;">
                ${note}
              </p>
              <div style="border-top: 1px solid #f1f5f9; padding-top: 20px;">
                <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                  Melearn Chat · Learn with character
                </p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

export async function sendOtpEmail({
  email,
  code,
  type,
  locale = "en",
}: {
  email: string;
  code: string;
  type: EmailCodeType;
  locale?: Locale;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY is missing. Email will not be sent.");
    return { ok: false, error: "EMAIL_KEY_MISSING" };
  }

  const isReset = type === "reset_password";
  const subject = isReset
    ? locale === "th"
      ? `รหัสรีเซ็ตรหัสผ่าน Melearn Chat: ${code}`
      : `Your Melearn Chat password reset code: ${code}`
    : locale === "th"
      ? `รหัสยืนยันการสมัคร Melearn Chat: ${code}`
      : `Your Melearn Chat verification code: ${code}`;

  const html = buildOtpEmailHtml({ code, type, locale });
  const text = isReset
    ? `รหัสรีเซ็ตรหัสผ่าน Melearn Chat ของคุณคือ: ${code} (หมดอายุใน 10 นาที)`
    : `รหัสยืนยันการสมัครสมาชิก Melearn Chat ของคุณคือ: ${code} (หมดอายุใน 10 นาที)`;

  const configuredFrom = process.env.EMAIL_FROM?.trim() || "Melearn Chat <auth@melearn.io>";

  async function postResend(fromAddress: string) {
    return fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        "user-agent": "resend-node:2.0.0",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [email.trim().toLowerCase()],
        subject,
        html,
        text,
      }),
      signal: AbortSignal.timeout(10_000),
    });
  }

  try {
    let res = await postResend(configuredFrom);
    if (!res.ok && res.status === 403 && configuredFrom !== "onboarding@resend.dev") {
      // If custom domain is not yet verified on Resend, fallback to onboarding@resend.dev
      console.warn(`[email] Resend rejected '${configuredFrom}', falling back to onboarding@resend.dev`);
      res = await postResend("Melearn Chat <onboarding@resend.dev>");
    }

    const data = (await res.json().catch(() => null)) as { id?: string; message?: string; name?: string } | null;

    if (!res.ok) {
      console.warn(`[email] Resend error (${res.status}):`, data?.message || data?.name);
      return { ok: false, error: data?.message || "SEND_FAILED" };
    }

    return { ok: true, id: data?.id };
  } catch (err) {
    console.error("[email] send exception:", err);
    return { ok: false, error: err instanceof Error ? err.message : "NETWORK_ERROR" };
  }
}
