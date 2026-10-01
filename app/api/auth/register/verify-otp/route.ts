import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { registerVerifiedUser, signSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { verifyEmailOtp } from "@/lib/email-service";
import { clientIp, jsonError } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { getViewer } from "@/lib/viewer";

export async function POST(request: Request) {
  const viewer = await getViewer();
  const headerStore = await headers();
  const ip = clientIp(headerStore);

  if (!rateLimit(`auth-ver-otp:${ip}`, 10, 60_000)) {
    return jsonError(viewer.locale, 429, "RATE_LIMIT", true);
  }

  const body = (await request.json().catch(() => null)) as {
    email?: string;
    code?: string;
  } | null;

  if (!body || !body.email || !body.code) {
    return jsonError(viewer.locale, 400, "INVALID_CODE");
  }

  const email = body.email.trim().toLowerCase();
  const code = body.code.trim();

  const db = await getDb();
  const result = await verifyEmailOtp(db, email, code, "verify_email");

  if (!result.ok) {
    const errorCode = result.error === "EXPIRED_CODE" ? "EXPIRED_CODE" : result.error === "TOO_MANY_ATTEMPTS" ? "RATE_LIMIT" : "INVALID_CODE";
    return jsonError(viewer.locale, 400, errorCode);
  }

  const payload = result.payload as { passwordHash?: string; password?: string; displayName?: string } | undefined;
  if (!payload?.passwordHash && !payload?.password) {
    return jsonError(viewer.locale, 400, "EXPIRED_CODE");
  }

  try {
    const user = await registerVerifiedUser(db, {
      email,
      displayName: payload.displayName,
      password: payload.password,
      passwordHash: payload.passwordHash,
      guestId: viewer.guestId,
      locale: viewer.locale,
    });

    const jar = await cookies();
    jar.set("ml_session", await signSession(user.id), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return NextResponse.json({ user });
  } catch (error) {
    const code = error instanceof Error ? error.message : "NAME";
    return jsonError(viewer.locale, 400, code);
  }
}
