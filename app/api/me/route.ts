import { NextResponse } from "next/server";
import { tutorMode } from "@/lib/content";
import { getDb } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { getViewer } from "@/lib/viewer";
import type { Locale } from "@/lib/types";

const levels = new Set(["beginner", "some", "unsure"]);
const goals = new Set(["chat", "review", "practice"]);

export async function GET() {
  const viewer = await getViewer();
  return NextResponse.json({
    user: viewer.user,
    locale: viewer.locale,
    level: viewer.level,
    goal: viewer.goal,
    onboarded: viewer.onboarded,
    tutor: tutorMode(),
  });
}

export async function PATCH(request: Request) {
  const viewer = await getViewer();
  const body = (await request.json().catch(() => null)) as {
    locale?: Locale;
    level?: string | null;
    goal?: string | null;
    onboarded?: boolean;
    displayName?: string;
  } | null;
  if (!body) return jsonError(viewer.locale, 400, "NAME");
  if (!viewer.user && body.onboarded !== undefined) return jsonError(viewer.locale, 401, "UNAUTHORIZED");
  const locale = body.locale === "en" || body.locale === "th" ? body.locale : undefined;
  const level = body.level === null ? null : body.level && levels.has(body.level) ? body.level : undefined;
  const goal = body.goal === null ? null : body.goal && goals.has(body.goal) ? body.goal : undefined;
  const db = getDb();
  if (viewer.user) {
    const name = body.displayName?.trim();
    if (name !== undefined && (!name || name.length > 40)) return jsonError(viewer.locale, 400, "NAME");
    if (name && name.toLowerCase() !== viewer.user.displayName.toLowerCase()) {
      const taken = db.prepare("SELECT id FROM users WHERE display_name = ? AND id != ?").get(name, viewer.user.id);
      if (taken) return jsonError(viewer.locale, 400, "TAKEN");
    }
    db.prepare(
      `UPDATE users SET
         locale = COALESCE(?, locale),
         level = CASE WHEN ? THEN NULL ELSE COALESCE(?, level) END,
         goal = CASE WHEN ? THEN NULL ELSE COALESCE(?, goal) END,
         onboarded = COALESCE(?, onboarded),
         display_name = COALESCE(?, display_name)
       WHERE id = ?`,
    ).run(
      locale ?? null,
      level === null ? 1 : 0,
      level === undefined ? null : level,
      goal === null ? 1 : 0,
      goal === undefined ? null : goal,
      body.onboarded === undefined ? null : body.onboarded ? 1 : 0,
      name || null,
      viewer.user.id,
    );
  } else {
    db.prepare(
      `UPDATE guests SET
         locale = COALESCE(?, locale),
         level = CASE WHEN ? THEN NULL ELSE COALESCE(?, level) END,
         goal = CASE WHEN ? THEN NULL ELSE COALESCE(?, goal) END,
         onboarded = COALESCE(?, onboarded)
       WHERE id = ?`,
    ).run(
      locale ?? null,
      level === null ? 1 : 0,
      level === undefined ? null : level,
      goal === null ? 1 : 0,
      goal === undefined ? null : goal,
      body.onboarded === undefined ? null : body.onboarded ? 1 : 0,
      viewer.guestId,
    );
  }
  return NextResponse.json({ ok: true });
}
