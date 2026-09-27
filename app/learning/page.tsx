import Link from "next/link";
import { Card } from "@/components/melearn-ui";
import { getLesson, getTeacher, lessonTitle } from "@/lib/content";
import { getDb } from "@/lib/db";
import { formatWhen } from "@/lib/format";
import { t } from "@/lib/i18n";
import { listLearning } from "@/lib/learning";
import { getViewer } from "@/lib/viewer";

export default async function LearningPage() {
  const viewer = await getViewer();
  const rows = listLearning(getDb(), viewer.ownerType, viewer.ownerId).flatMap((row) => {
    const lesson = getLesson(row.lesson_id);
    const teacher = lesson ? getTeacher(lesson.teacherId) : null;
    if (!lesson || !teacher) return [];
    return [{ row, lesson, teacher }];
  });

  return (
    <div className="mx-auto w-full max-w-[860px] px-5">
      <h1>{t(viewer.locale, "nav.progress")}</h1>
      {!viewer.user ? <p className="mt-2 text-sm text-muted-foreground">{t(viewer.locale, "guest.banner")}</p> : null}
      {rows.length === 0 ? (
        <Card className="mt-6">
          <p>{t(viewer.locale, "progress.empty")}</p>
          <Link href="/" className="mt-3 inline-flex min-h-12 items-center font-semibold text-primary">
            {t(viewer.locale, "progress.pickTeacher")}
          </Link>
        </Card>
      ) : (
        <div className="mt-6 grid gap-3">
          {rows.map(({ row, lesson, teacher }) => (
            <Card key={lesson.id}>
              <p className="text-sm text-muted-foreground">{teacher.name[viewer.locale]} · {teacher.subject[viewer.locale]}</p>
              <h2 className="mt-1 text-[18px]">{lessonTitle(lesson, viewer.locale)}</h2>
              <p className="text-sm">
                {row.status === "completed" ? t(viewer.locale, "lesson.completed") : t(viewer.locale, "lesson.inProgress")} · {formatWhen(row.updated_at, viewer.locale)}
              </p>
              <p className="text-sm text-muted-foreground">
                {t(viewer.locale, "chat.attempts")}: {row.attempts} · {t(viewer.locale, "chat.hints")}: {row.hints_used}
              </p>
              <Link href={`/learn/${lesson.id}`} className="mt-3 inline-flex min-h-12 items-center justify-center rounded-[14px] bg-primary px-4 font-semibold text-white">
                {row.status === "completed" ? t(viewer.locale, "lesson.review") : t(viewer.locale, "home.continue")}
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
