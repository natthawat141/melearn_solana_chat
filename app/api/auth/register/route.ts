import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { registerUser, signSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { getViewer } from "@/lib/viewer";

export async function POST(request: Request) {
  const viewer = await getViewer();
  const body = (await request.json().catch(() => null)) as { displayName?: string; password?: string } | null;
  if (!body) return jsonError(viewer.locale, 400, "NAME");
  try {
    const user = registerUser(getDb(), {
      displayName: body.displayName || "",
      password: body.password || "",
      guestId: viewer.guestId,
      locale: viewer.locale,
      level: viewer.level,
      goal: viewer.goal,
      onboarded: viewer.onboarded,
    });
    const jar = await cookies();
    jar.set("ml_session", signSession(user.id), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return NextResponse.json({ user });
  } catch (error) {
    const code = error instanceof Error ? error.message : "NAME";
    const status = code === "TAKEN" || code === "PASSWORD" || code === "NAME" ? 400 : 400;
    return jsonError(viewer.locale, status, code);
  }
}
