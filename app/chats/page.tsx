import Link from "next/link";
import { Card } from "@/components/melearn-ui";
import { getLesson, getTeacher, lessonTitle } from "@/lib/content";
import { getDb } from "@/lib/db";
import { formatWhen } from "@/lib/format";
import { t } from "@/lib/i18n";
import { listChats } from "@/lib/learning";
import { getViewer } from "@/lib/viewer";

export default async function ChatsPage() {
  const viewer = await getViewer();
  const chats = listChats(getDb(), viewer.ownerType, viewer.ownerId);

  return (
    <div className="mx-auto w-full max-w-[860px] px-5">
      <h1>{t(viewer.locale, "chats.title")}</h1>
      {chats.length === 0 ? (
        <Card className="mt-6">
          <p>{t(viewer.locale, "chats.empty")}</p>
          <Link href="/" className="mt-3 inline-flex min-h-12 items-center font-semibold text-primary">
            {t(viewer.locale, "progress.pickTeacher")}
          </Link>
        </Card>
      ) : (
        <div className="mt-6 grid gap-3">
          {chats.map((chat) => {
            const teacher = getTeacher(chat.teacher_id);
            const lesson = getLesson(chat.lesson_id);
            if (!teacher || !lesson) return null;
            return (
              <Card key={chat.id}>
                <p className="text-sm text-muted-foreground">{teacher.name[viewer.locale]}</p>
                <h2 className="text-[18px]">{lessonTitle(lesson, viewer.locale)}</h2>
                <p className="line-clamp-2 text-sm">{chat.last_text}</p>
                <p className="text-xs text-muted-foreground">{formatWhen(chat.updated_at, viewer.locale)}</p>
                <Link href={`/learn/${lesson.id}`} className="mt-2 inline-flex min-h-11 items-center font-semibold text-primary">
                  {t(viewer.locale, "chats.open")}
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
