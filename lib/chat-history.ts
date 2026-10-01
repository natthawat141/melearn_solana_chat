import { getLesson, getTeacher, lessonTitle } from "@/lib/content";
import type { AppDatabase } from "@/lib/db";
import type { ChatHistoryItem } from "@/lib/chat-groups";
import { GENERAL_CHAT_ID, listChats } from "@/lib/learning";
import { localizedHistoryText } from "@/lib/tutor";
import type { Locale } from "@/lib/types";

export async function buildChatHistory(db: AppDatabase | null, locale: Locale, userId: string | null): Promise<ChatHistoryItem[]> {
  if (!db || !userId) return [];

  return (await listChats(db, "user", userId)).flatMap((chat) => {
    if (chat.teacher_id === GENERAL_CHAT_ID && chat.lesson_id === GENERAL_CHAT_ID) {
      const title = chat.title?.trim() || chat.first_user_text?.trim() || (locale === "en" ? "New chat" : "แชตใหม่");
      const compact = (value: string) => value.length > 56 ? `${value.slice(0, 55).trimEnd()}…` : value;
      return [{
        id: chat.id,
        href: `/chat/${chat.id}`,
        title: compact(title),
        fullTitle: title,
        subtitle: locale === "en" ? "General chat" : "แชตทั่วไป",
        preview: compact(chat.last_user_text?.trim() || ""),
        updatedAt: chat.updated_at,
      }];
    }
    const teacher = getTeacher(chat.teacher_id);
    const lesson = getLesson(chat.lesson_id);
    if (!teacher || !lesson) return [];
    const preview = chat.last_text ? localizedHistoryText(teacher, lesson, chat.last_text, locale) : "";
    return [{
      id: chat.id,
      href: `/learn/${lesson.id}`,
      title: chat.title?.trim() || lessonTitle(lesson, locale),
      fullTitle: chat.title?.trim() || lessonTitle(lesson, locale),
      subtitle: teacher.name[locale],
      preview,
      updatedAt: chat.updated_at,
    }];
  });
}
