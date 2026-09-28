import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { clientIp, jsonError } from "@/lib/http";
import { handleMessage, LearningError } from "@/lib/learning";
import { rateLimit } from "@/lib/rate-limit";
import { getViewer } from "@/lib/viewer";
import type { ChatMode } from "@/lib/types";

const modes = new Set<ChatMode>(["teach", "hint", "example", "practice"]);

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await getViewer();
  if (!viewer.user) return jsonError(viewer.locale, 401, "UNAUTHORIZED");
  const headerStore = await headers();
  if (!rateLimit(`msg:${clientIp(headerStore)}:${viewer.ownerId}`, 40, 60_000)) {
    return jsonError(viewer.locale, 429, "RATE_LIMIT", true);
  }
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as { clientMessageId?: string; text?: string; mode?: ChatMode } | null;
  if (!body?.clientMessageId || !body.mode || !modes.has(body.mode)) return jsonError(viewer.locale, 400, "BAD_MESSAGE_ID");
  try {
    const result = await handleMessage(getDb(), {
      ownerType: viewer.ownerType,
      ownerId: viewer.ownerId,
      conversationId: id,
      clientMessageId: body.clientMessageId,
      text: body.text || "",
      mode: body.mode,
      locale: viewer.locale,
      level: viewer.level,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof LearningError && error.code === "QUOTA" && error.resetAt) {
      const when = new Date(error.resetAt).toLocaleString(viewer.locale === "en" ? "en-GB" : "th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" });
      const message = viewer.locale === "en" ? `You have used 10 prompts. They reload on ${when}.` : `ใช้ครบ 10 ข้อความแล้ว จะใช้ได้อีกครั้ง ${when}`;
      return NextResponse.json({ code: "QUOTA", message, retryable: false, resetAt: error.resetAt }, { status: 429 });
    }
    if (error instanceof LearningError) return jsonError(viewer.locale, error.status, error.code, error.retryable);
    throw error;
  }
}
