import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { clientIp, jsonError } from "@/lib/http";
import { handleGeneralMessage, LearningError } from "@/lib/learning";
import { rateLimit } from "@/lib/rate-limit";
import { readQuota } from "@/lib/quota";
import { getViewer } from "@/lib/viewer";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await getViewer();
  if (!viewer.user) return jsonError(viewer.locale, 401, "UNAUTHORIZED");
  const headerStore = await headers();
  if (!rateLimit(`msg:${clientIp(headerStore)}:${viewer.ownerId}`, 40, 60_000)) {
    return jsonError(viewer.locale, 429, "RATE_LIMIT", true);
  }
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as { clientMessageId?: string; text?: string } | null;
  if (typeof body?.clientMessageId !== "string") return jsonError(viewer.locale, 400, "BAD_MESSAGE_ID");
  if (body.text !== undefined && typeof body.text !== "string") return jsonError(viewer.locale, 400, "EMPTY");
  const db = await getDb();
  try {
    const result = await handleGeneralMessage(db, {
      ownerId: viewer.user.id,
      conversationId: id,
      clientMessageId: body.clientMessageId,
      text: body.text || "",
      locale: viewer.locale,
      level: viewer.level,
      educationStage: viewer.user.educationStage,
      preferredSubject: viewer.user.preferredSubject,
      goal: viewer.goal,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof LearningError && error.code === "QUOTA" && error.resetAt) {
      const when = new Date(error.resetAt).toLocaleString(viewer.locale === "en" ? "en-GB" : "th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" });
      const message = viewer.locale === "en" ? `You have used 10 prompts. They reload on ${when}.` : `ใช้ครบ 10 ข้อความแล้ว จะใช้ได้อีกครั้ง ${when}`;
      const quota = await readQuota(db, "user", viewer.user.id);
      return NextResponse.json({ code: "QUOTA", message, retryable: false, resetAt: error.resetAt, quota }, { status: 429 });
    }
    if (error instanceof LearningError) return jsonError(viewer.locale, error.status, error.code, error.retryable);
    throw error;
  }
}
