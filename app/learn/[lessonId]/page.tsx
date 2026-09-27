import { notFound, redirect } from "next/navigation";
import { ChatRoom } from "@/components/chat-room";
import { getLesson, getTeacher } from "@/lib/content";
import { getDb } from "@/lib/db";
import { LearningError, openConversation } from "@/lib/learning";
import { getViewer } from "@/lib/viewer";

export default async function LearnPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const lesson = getLesson(lessonId);
  const teacher = lesson ? getTeacher(lesson.teacherId) : null;
  if (!lesson || !teacher) notFound();
  if (!teacher.mvpEnabled) redirect(`/teachers/${teacher.id}`);
  const viewer = await getViewer();
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
        initialMessages={opened.messages.map((message) => ({ id: message.id, role: message.role, text: message.text }))}
        initialProgress={opened.progress}
        isGuest={!viewer.user}
      />
    );
  } catch (error) {
    if (error instanceof LearningError && error.code === "ENTITLEMENT_REQUIRED") redirect(`/unlock/${lessonId}`);
    notFound();
  }
}
