import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { getLesson, getTeacher, lessonTitle } from "@/lib/content";
import { getDb } from "@/lib/db";
import { formatWhen } from "@/lib/format";
import { t } from "@/lib/i18n";
import { listLearning } from "@/lib/learning";
import { getViewer } from "@/lib/viewer";

export default async function LearningPage() {
  const viewer = await getViewer();
  if (!viewer.user) {
    return (
      <div className="mx-auto flex w-full max-w-[860px] flex-col gap-4 px-5">
        <h1>{t(viewer.locale, "nav.progress")}</h1>
        <Empty className="border bg-card">
          <EmptyHeader>
            <EmptyTitle>{t(viewer.locale, "progress.empty")}</EmptyTitle>
            <EmptyDescription>{t(viewer.locale, "progress.guestBody")}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild className="min-h-11">
              <Link href="/chats">{t(viewer.locale, "chats.open")}</Link>
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    );
  }
  const rows = listLearning(getDb(), "user", viewer.user.id).flatMap((row) => {
    const lesson = getLesson(row.lesson_id);
    const teacher = lesson ? getTeacher(lesson.teacherId) : null;
    if (!lesson || !teacher) return [];
    return [{ row, lesson, teacher }];
  });

  return (
    <div className="mx-auto flex w-full max-w-[860px] flex-col gap-4 px-5">
      <h1>{t(viewer.locale, "nav.progress")}</h1>
      {rows.length === 0 ? (
        <Empty className="border bg-card">
          <EmptyHeader>
            <EmptyTitle>{t(viewer.locale, "progress.empty")}</EmptyTitle>
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
          {rows.map(({ row, lesson, teacher }) => (
            <Card key={lesson.id}>
              <CardHeader>
                <CardDescription>
                  {teacher.name[viewer.locale]} · {teacher.subject[viewer.locale]}
                </CardDescription>
                <CardTitle>{lessonTitle(lesson, viewer.locale)}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Badge variant="outline">{row.status === "completed" ? t(viewer.locale, "lesson.completed") : t(viewer.locale, "lesson.inProgress")}</Badge>
                <p className="text-sm text-muted-foreground">{formatWhen(row.updated_at, viewer.locale)}</p>
                <p className="text-sm text-muted-foreground">
                  {t(viewer.locale, "chat.attempts")}: {row.attempts} · {t(viewer.locale, "chat.hints")}: {row.hints_used}
                </p>
              </CardContent>
              <CardFooter>
                <Button asChild className="min-h-11">
                  <Link href={`/learn/${lesson.id}`}>{row.status === "completed" ? t(viewer.locale, "lesson.review") : t(viewer.locale, "home.continue")}</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
