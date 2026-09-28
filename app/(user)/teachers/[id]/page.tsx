import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getTeacher, lessonObjectives, lessonSummary, lessonTitle, lessonsForTeacher, teacherImage, teacherPersona } from "@/lib/content";
import { getDb } from "@/lib/db";
import { t } from "@/lib/i18n";
import { listLearning } from "@/lib/learning";
import { getViewer } from "@/lib/viewer";

export default async function TeacherPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const teacher = getTeacher(id);
  if (!teacher) notFound();
  const viewer = await getViewer();
  const lessons = lessonsForTeacher(teacher.id);
  const progress = viewer.user
    ? new Map(listLearning(getDb(), "user", viewer.user.id).map((row) => [row.lesson_id, row.status]))
    : new Map<string, string>();
  const image = teacherImage(teacher);

  return (
    <div className="mx-auto flex w-full max-w-[860px] flex-col gap-4 px-5">
      <Button asChild variant="link" className="min-h-11 w-fit px-0">
        <Link href="/app">{t(viewer.locale, "common.back")}</Link>
      </Button>
      <Card className="pt-0">
        {image ? (
          <div className="relative h-64 w-full md:h-80" style={{ background: teacher.accentBackground }}>
            <Image src={image} alt={teacher.name[viewer.locale]} fill sizes="100vw" className="object-cover" style={{ objectPosition: "50% 20%" }} />
          </div>
        ) : (
          <div className="grid h-64 place-items-center bg-muted text-6xl font-semibold md:h-80">{teacher.name.en.replace("Teacher ", "").slice(0, 1)}</div>
        )}
        <CardHeader>
          <Badge variant="secondary">
            {t(viewer.locale, "teacher.ai")} · {teacher.subject[viewer.locale]}
          </Badge>
          <CardTitle>
            <h1>{teacher.name[viewer.locale]}</h1>
          </CardTitle>
          <CardDescription>{teacherPersona(teacher, viewer.locale)}</CardDescription>
        </CardHeader>
        {!teacher.mvpEnabled ? (
          <CardContent>
            <p className="font-semibold">{t(viewer.locale, "teacher.disabledBody")}</p>
          </CardContent>
        ) : null}
      </Card>
      <div className="grid gap-3">
        {lessons.map((lesson) => {
          const status = progress.get(lesson.id);
          const label = !teacher.mvpEnabled
            ? t(viewer.locale, "teacher.soon")
            : !viewer.user
              ? t(viewer.locale, "teacher.preview")
              : status === "completed"
                ? t(viewer.locale, "teacher.review")
                : status
                  ? t(viewer.locale, "teacher.continue")
                  : t(viewer.locale, "teacher.start");
          const levelLabel = lesson.level === "beginner" ? t(viewer.locale, "lesson.level.beginner") : lesson.level;
          return (
            <Card key={lesson.id}>
              <CardHeader>
                <CardTitle>{lessonTitle(lesson, viewer.locale)}</CardTitle>
                <CardDescription>
                  {levelLabel} · {lesson.estimatedMinutes} {t(viewer.locale, "lesson.minutes")} · {lesson.access === "free" ? t(viewer.locale, "lesson.free") : t(viewer.locale, "lesson.freeDemo")}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p>{lessonSummary(lesson, viewer.locale)}</p>
                {viewer.user && status ? <Badge variant="outline">{status === "completed" ? t(viewer.locale, "lesson.completed") : t(viewer.locale, "lesson.inProgress")}</Badge> : null}
                <div>
                  <p className="text-sm font-semibold">{t(viewer.locale, "lesson.objectives")}</p>
                  <ul className="mt-1 list-disc pl-5 text-sm">
                    {lessonObjectives(lesson, viewer.locale).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
              <CardFooter>
                {teacher.mvpEnabled ? (
                  <Button asChild className="min-h-11">
                    <Link href={`/learn/${lesson.id}`}>{label}</Link>
                  </Button>
                ) : (
                  <Badge variant="outline">{label}</Badge>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
