import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { Card, Pill } from "@/components/melearn-ui";
import { getTeacher, lessonObjectives, lessonSummary, lessonTitle, lessonsForTeacher, priceLamports, teacherImage, teacherPersona } from "@/lib/content";
import { formatSol } from "@/lib/format";
import { getDb } from "@/lib/db";
import { t } from "@/lib/i18n";
import { listLearning } from "@/lib/learning";
import { getViewer, lessonUnlocked } from "@/lib/viewer";

export default async function TeacherPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const teacher = getTeacher(id);
  if (!teacher) notFound();
  const viewer = await getViewer();
  const lessons = lessonsForTeacher(teacher.id);
  const progress = new Map(listLearning(getDb(), viewer.ownerType, viewer.ownerId).map((row) => [row.lesson_id, row.status]));
  const image = teacherImage(teacher);

  return (
    <div className="mx-auto w-full max-w-[860px] px-5">
      <Link href="/" className="inline-flex min-h-11 items-center gap-2 font-semibold text-primary">
        <Icon name="back" className="size-4" />
        {t(viewer.locale, "common.back")}
      </Link>
      <div className="mt-3 overflow-hidden rounded-[20px] border border-border bg-surface">
        {image ? (
          <div className="relative h-64 w-full md:h-80" style={{ background: teacher.accentBackground }}>
            <Image src={image} alt={teacher.name[viewer.locale]} fill sizes="100vw" className="object-cover" style={{ objectPosition: "50% 20%" }} />
          </div>
        ) : (
          <div className="grid h-64 place-items-center text-6xl font-semibold md:h-80" style={{ background: teacher.accentBackground }}>
            {teacher.name.en.replace("Teacher ", "").slice(0, 1)}
          </div>
        )}
        <div className="p-4">
          <Pill>{t(viewer.locale, "teacher.ai")} · {teacher.subject[viewer.locale]}</Pill>
          <h1 className="mt-3">{teacher.name[viewer.locale]}</h1>
          <p className="mt-2 text-muted-foreground">{teacherPersona(teacher, viewer.locale)}</p>
          {!teacher.mvpEnabled ? <p className="mt-3 font-semibold">{t(viewer.locale, "teacher.disabledBody")}</p> : null}
        </div>
      </div>
      <div className="mt-4 grid gap-3">
        {lessons.map((lesson) => {
          const unlocked = lessonUnlocked(viewer.user?.id ?? null, lesson.id, lesson.access);
          const status = progress.get(lesson.id);
          const href = unlocked && teacher.mvpEnabled ? `/learn/${lesson.id}` : `/unlock/${lesson.id}`;
          const label = !teacher.mvpEnabled
            ? t(viewer.locale, "teacher.soon")
            : !unlocked
              ? t(viewer.locale, "teacher.unlock")
              : status === "completed"
                ? t(viewer.locale, "teacher.review")
                : status
                  ? t(viewer.locale, "teacher.continue")
                  : t(viewer.locale, "teacher.start");
          const price = priceLamports(lesson.id);
          return (
            <Card key={lesson.id}>
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-[18px]">{lessonTitle(lesson, viewer.locale)}</h2>
                {lesson.access === "paid" && !unlocked ? <Icon name="lock" /> : null}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {t(viewer.locale, "lesson.level.beginner")} · {lesson.estimatedMinutes} {t(viewer.locale, "lesson.minutes")} · {lesson.access === "free" ? t(viewer.locale, "lesson.free") : t(viewer.locale, "lesson.paid")}
                {price ? ` · ${formatSol(price)} SOL` : ""}
              </p>
              <p className="mt-2">{lessonSummary(lesson, viewer.locale)}</p>
              <p className="mt-3 text-sm font-semibold">{t(viewer.locale, "lesson.objectives")}</p>
              <ul className="mt-1 list-disc pl-5 text-sm">
                {lessonObjectives(lesson, viewer.locale).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              {teacher.mvpEnabled ? (
                <Link href={href} className="mt-4 inline-flex min-h-12 items-center justify-center rounded-[14px] bg-primary px-4 font-semibold text-white">
                  {label}
                </Link>
              ) : (
                <p className="mt-4 inline-flex min-h-12 items-center rounded-[14px] bg-border px-4 font-semibold text-muted-foreground">{label}</p>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
