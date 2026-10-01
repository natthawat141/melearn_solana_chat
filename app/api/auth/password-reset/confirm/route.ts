import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { findUser, resetUserPassword, signSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { isValidPassword, verifyEmailOtp } from "@/lib/email-service";
import { clientIp, jsonError } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { getViewer } from "@/lib/viewer";

export async function POST(request: Request) {
  const viewer = await getViewer();
  const headerStore = await headers();
  const ip = clientIp(headerStore);

  if (!rateLimit(`auth-reset-conf:${ip}`, 10, 60_000)) {
    return jsonError(viewer.locale, 429, "RATE_LIMIT", true);
  }

  const body = (await request.json().catch(() => null)) as {
    email?: string;
    code?: string;
    newPassword?: string;
  } | null;

  if (!body || !body.email || !body.code || !body.newPassword) {
    return jsonError(viewer.locale, 400, "INVALID");
  }

  const email = body.email.trim().toLowerCase();
  const code = body.code.trim();
  const newPassword = body.newPassword;

  if (!isValidPassword(newPassword)) {
    return jsonError(viewer.locale, 400, "PASSWORD_SHORT");
  }

  const db = await getDb();
  const result = await verifyEmailOtp(db, email, code, "reset_password");

  if (!result.ok) {
    const errorCode = result.error === "EXPIRED_CODE" ? "EXPIRED_CODE" : result.error === "TOO_MANY_ATTEMPTS" ? "RATE_LIMIT" : "INVALID_CODE";
    return jsonError(viewer.locale, 400, errorCode);
  }

  try {
    const userRow = await resetUserPassword(db, email, newPassword);
    const user = await findUser(db, userRow.id);

    const jar = await cookies();
    jar.set("ml_session", await signSession(userRow.id), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return NextResponse.json({ ok: true, user });
  } catch (error) {
    const code = error instanceof Error ? error.message : "INVALID";
    return jsonError(viewer.locale, 400, code);
  }
}
