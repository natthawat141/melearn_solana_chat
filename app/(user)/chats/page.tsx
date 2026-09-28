import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { getLesson, getTeacher, lessonTitle, lessons } from "@/lib/content";
import { getDb } from "@/lib/db";
import { formatWhen } from "@/lib/format";
import { t } from "@/lib/i18n";
import { listChats } from "@/lib/learning";
import { localizedHistoryText } from "@/lib/tutor";
import { getViewer } from "@/lib/viewer";

export default async function ChatsPage() {
  const viewer = await getViewer();
  if (!viewer.user) {
    const rooms = lessons.flatMap((lesson) => {
      const teacher = getTeacher(lesson.teacherId);
      if (!teacher?.mvpEnabled) return [];
      return [{ lesson, teacher }];
    });
    return (
      <div className="mx-auto flex w-full max-w-[860px] flex-col gap-4 px-5">
        <div className="flex flex-col gap-2">
          <h1>{t(viewer.locale, "chats.title")}</h1>
          <p className="text-muted-foreground">{t(viewer.locale, "chats.guestBody")}</p>
        </div>
        <div className="grid gap-3">
          {rooms.map(({ lesson, teacher }) => (
            <Card key={lesson.id}>
              <CardHeader>
                <CardDescription>{teacher.name[viewer.locale]}</CardDescription>
                <CardTitle>{lessonTitle(lesson, viewer.locale)}</CardTitle>
              </CardHeader>
              <CardFooter>
                <Button asChild className="min-h-11">
                  <Link href={`/learn/${lesson.id}`}>{t(viewer.locale, "chats.open")}</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }
  const chats = listChats(getDb(), "user", viewer.user.id);

  return (
    <div className="mx-auto flex w-full max-w-[860px] flex-col gap-4 px-5">
      <h1>{t(viewer.locale, "chats.title")}</h1>
      {chats.length === 0 ? (
        <Empty className="border bg-card">
          <EmptyHeader>
            <EmptyTitle>{t(viewer.locale, "chats.empty")}</EmptyTitle>
            <EmptyDescription>{t(viewer.locale, "home.lead")}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild className="min-h-11">
              <Link href="/app">{t(viewer.locale, "progress.pickTeacher")}</Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid gap-3">
          {chats.map((chat) => {
            const teacher = getTeacher(chat.teacher_id);
            const lesson = getLesson(chat.lesson_id);
            if (!teacher || !lesson) return null;
            return (
              <Card key={chat.id}>
                <CardHeader>
                  <CardDescription>{teacher.name[viewer.locale]}</CardDescription>
                  <CardTitle>{lessonTitle(lesson, viewer.locale)}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-1">
                  <p className="line-clamp-2 text-sm">{chat.last_text ? localizedHistoryText(teacher, lesson, chat.last_text, viewer.locale) : ""}</p>
                  <p className="text-xs text-muted-foreground">{formatWhen(chat.updated_at, viewer.locale)}</p>
                </CardContent>
                <CardFooter>
                  <Button asChild variant="outline" className="min-h-11">
                    <Link href={`/learn/${lesson.id}`}>{t(viewer.locale, "chats.open")}</Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
