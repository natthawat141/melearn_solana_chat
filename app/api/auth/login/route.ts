import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { loginUser, signSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { clientIp, jsonError } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { getViewer } from "@/lib/viewer";

export async function POST(request: Request) {
  const viewer = await getViewer();
  const headerStore = await headers();
  if (!rateLimit(`auth-login:${clientIp(headerStore)}`, 10, 60_000)) {
    return jsonError(viewer.locale, 429, "RATE_LIMIT", true);
  }
  const body = (await request.json().catch(() => null)) as { displayName?: string; password?: string } | null;
  if (!body) return jsonError(viewer.locale, 400, "INVALID");
  try {
    const user = await loginUser(await getDb(), {
      displayName: body.displayName || "",
      password: body.password || "",
      guestId: viewer.guestId,
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
  } catch {
    return jsonError(viewer.locale, 401, "INVALID");
  }
}
