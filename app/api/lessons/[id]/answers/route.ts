import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { handleMessage, LearningError, openConversation } from "@/lib/learning";
import { getViewer } from "@/lib/viewer";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await getViewer();
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as { attemptId?: string; answer?: string } | null;
  if (!body?.attemptId || body.answer === undefined) return jsonError(viewer.locale, 400, "BAD_MESSAGE_ID");
  try {
    const opened = openConversation(getDb(), {
      ownerType: viewer.ownerType,
      ownerId: viewer.ownerId,
      lessonId: id,
      locale: viewer.locale,
    });
    const result = await handleMessage(getDb(), {
      ownerType: viewer.ownerType,
      ownerId: viewer.ownerId,
      conversationId: opened.conversation.id,
      clientMessageId: body.attemptId,
      text: body.answer,
      mode: "teach",
      locale: viewer.locale,
      level: viewer.level,
    });
    return NextResponse.json({
      correct: result.assessment?.correct ?? null,
      feedback: result.assessment?.feedback ?? result.messages.at(-1)?.text ?? "",
      rubricScores: result.assessment?.rubricScores ?? null,
      progress: result.progress,
    });
  } catch (error) {
    if (error instanceof LearningError) return jsonError(viewer.locale, error.status, error.code, error.retryable);
    throw error;
  }
}
