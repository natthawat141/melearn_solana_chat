import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { LearningError, listChats, openConversation } from "@/lib/learning";
import { getViewer } from "@/lib/viewer";

export async function GET() {
  const viewer = await getViewer();
  if (!viewer.user) return jsonError(viewer.locale, 401, "UNAUTHORIZED");
  const db = await getDb();
  const conversations = await listChats(db, viewer.ownerType, viewer.ownerId);
  return NextResponse.json({ conversations });
}

export async function POST(request: Request) {
  const viewer = await getViewer();
  if (!viewer.user) return jsonError(viewer.locale, 401, "UNAUTHORIZED");
  const body = (await request.json().catch(() => null)) as { lessonId?: string } | null;
  if (!body?.lessonId) return jsonError(viewer.locale, 400, "LESSON");
  try {
    const opened = await openConversation(await getDb(), {
      ownerType: viewer.ownerType,
      ownerId: viewer.ownerId,
      lessonId: body.lessonId,
      locale: viewer.locale,
    });
    return NextResponse.json({
      conversationId: opened.conversation.id,
      messages: opened.messages,
      progress: opened.progress,
    });
  } catch (error) {
    if (error instanceof LearningError) return jsonError(viewer.locale, error.status, error.code, error.retryable);
    throw error;
  }
}
