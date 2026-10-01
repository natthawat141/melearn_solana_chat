import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { loginWithGoogle, signSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { clientIp, jsonError } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { getViewer } from "@/lib/viewer";
import { verifyGoogleFirebaseIdToken } from "@/lib/firebase-google";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const viewer = await getViewer();
  const headerStore = await headers();
  if (!rateLimit(`auth-google:${clientIp(headerStore)}`, 10, 60_000)) {
    return jsonError(viewer.locale, 429, "RATE_LIMIT", true);
  }

  const body = (await request.json().catch(() => null)) as { idToken?: unknown } | null;
  if (!body || typeof body.idToken !== "string" || body.idToken.length < 100 || body.idToken.length > 10_000) {
    return jsonError(viewer.locale, 400, "GOOGLE_TOKEN_INVALID");
  }

  const result = await verifyGoogleFirebaseIdToken(body.idToken);
  if (!result.ok) {
    return result.reason === "invalid"
      ? jsonError(viewer.locale, 401, "GOOGLE_TOKEN_INVALID")
      : jsonError(viewer.locale, 503, "GOOGLE_AUTH_UNAVAILABLE", true);
  }

  try {
    const user = await loginWithGoogle(await getDb(), {
      googleUid: result.identity.uid,
      displayName: result.identity.displayName,
      photoUrl: result.identity.photoUrl,
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
    return NextResponse.json({ user }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return jsonError(viewer.locale, 500, "GOOGLE_AUTH_UNAVAILABLE", true);
  }
}
