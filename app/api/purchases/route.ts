import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { createPurchase } from "@/lib/purchases";
import { getViewer } from "@/lib/viewer";

export async function POST(request: Request) {
  const viewer = await getViewer();
  if (!viewer.user) return jsonError(viewer.locale, 401, "UNAUTHORIZED");
  const body = (await request.json().catch(() => null)) as { lessonId?: string } | null;
  if (!body?.lessonId) return jsonError(viewer.locale, 400, "LESSON");
  try {
    const purchase = await createPurchase(await getDb(), viewer.user.id, body.lessonId);
    return NextResponse.json({ purchase });
  } catch (error) {
    const code = error instanceof Error ? error.message : "LESSON";
    const status = code === "OWNED" ? 409 : 400;
    return jsonError(viewer.locale, status, code);
  }
}
