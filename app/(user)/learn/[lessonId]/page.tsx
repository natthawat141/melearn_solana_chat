import { notFound, redirect } from "next/navigation";
import { ChatRoom } from "@/components/chat-room";
import { getLesson, getTeacher } from "@/lib/content";
import { getDb } from "@/lib/db";
import { LearningError, openConversation } from "@/lib/learning";
import { readQuota, type QuotaState } from "@/lib/quota";
import { emptyProgress, localizedHistoryText, openingMessage } from "@/lib/tutor";
import { getViewer } from "@/lib/viewer";

export default async function LearnPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const lesson = getLesson(lessonId);
  const teacher = lesson ? getTeacher(lesson.teacherId) : null;
  if (!lesson || !teacher) notFound();
  if (!teacher.mvpEnabled) redirect(`/teachers/${teacher.id}`);
  const viewer = await getViewer();
  const lessonPath = `/learn/${lessonId}`;
  if (viewer.user && !viewer.onboarded) redirect(`/setup?next=${encodeURIComponent(lessonPath)}`);
  if (!viewer.user) {
    const previewQuota: QuotaState = { used: 0, limit: 0, remaining: 0, resetAt: new Date(0).toISOString(), blocked: false };
    return (
      <ChatRoom
        locale={viewer.locale}
        teacher={teacher}
        lesson={lesson}
        conversationId=""
        initialMessages={[{ id: `preview-${lessonId}`, role: "assistant", text: openingMessage(teacher, lesson, viewer.locale) }]}
        initialProgress={emptyProgress(lesson.practice.length)}
        initialQuota={previewQuota}
        isGuest
      />
    );
  }
  try {
    const opened = openConversation(getDb(), {
      ownerType: viewer.ownerType,
      ownerId: viewer.ownerId,
      lessonId,
      locale: viewer.locale,
    });
    return (
      <ChatRoom
        locale={viewer.locale}
        teacher={opened.teacher}
        lesson={opened.lesson}
        conversationId={opened.conversation.id}
        initialMessages={opened.messages.map((message) => ({
          id: message.id,
          role: message.role,
          text: localizedHistoryText(opened.teacher, opened.lesson, message.text, viewer.locale),
        }))}
        initialProgress={opened.progress}
        initialQuota={readQuota(getDb(), viewer.ownerType, viewer.ownerId)}
        isGuest={!viewer.user}
      />
    );
  } catch (error) {
    if (error instanceof LearningError && error.code === "ENTITLEMENT_REQUIRED") redirect(`/unlock/${lessonId}`);
    if (error instanceof LearningError && (error.code === "NOT_FOUND" || error.code === "TEACHER_UNAVAILABLE")) notFound();
    throw error;
  }
}
