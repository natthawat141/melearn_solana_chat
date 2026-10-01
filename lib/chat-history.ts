import { getLesson, getTeacher, lessonTitle } from "@/lib/content";
import type { AppDatabase } from "@/lib/db";
import type { ChatHistoryItem } from "@/lib/chat-groups";
import { listChats } from "@/lib/learning";
import { localizedHistoryText } from "@/lib/tutor";
import type { Locale } from "@/lib/types";

export async function buildChatHistory(db: AppDatabase | null, locale: Locale, userId: string | null): Promise<ChatHistoryItem[]> {
  if (!db || !userId) return [];

  return (await listChats(db, "user", userId)).flatMap((chat) => {
    const teacher = getTeacher(chat.teacher_id);
    const lesson = getLesson(chat.lesson_id);
    if (!teacher || !lesson) return [];
    const preview = chat.last_text ? localizedHistoryText(teacher, lesson, chat.last_text, locale) : "";
    return [{
      id: chat.id,
      href: `/learn/${lesson.id}`,
      title: lessonTitle(lesson, locale),
      subtitle: teacher.name[locale],
      preview,
      updatedAt: chat.updated_at,
    }];
  });
}
