import Image from "next/image";
import Link from "next/link";
import { Onboarding } from "@/components/onboarding";
import { Card, Pill } from "@/components/ui";
import { getLesson, lessonTitle, teacherImage, teacherPersona, teachers } from "@/lib/content";
import { getDb } from "@/lib/db";
import { formatWhen } from "@/lib/format";
import { t } from "@/lib/i18n";
import { listLearning } from "@/lib/learning";
import { getViewer } from "@/lib/viewer";

export default async function HomePage() {
  const viewer = await getViewer();
  const rows = listLearning(getDb(), viewer.ownerType, viewer.ownerId);
  const latest = rows[0];
  const lesson = latest ? getLesson(latest.lesson_id) : null;
  const teacher = lesson ? teachers.find((item) => item.id === lesson.teacherId) : null;

  return (
    <div className="mx-auto w-full max-w-[1100px] px-5">
      <div className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -right-8 -top-10 size-36 rounded-full bg-cyan/30" />
        <p className="text-sm font-semibold text-primary">{t(viewer.locale, "landing.kicker")}</p>
        <h1 className="mt-2 max-w-xl">{t(viewer.locale, "home.title")}</h1>
        <p className="mt-2 max-w-2xl text-muted">{t(viewer.locale, "landing.subtitle")}</p>
      </div>
      {!viewer.onboarded ? (
        <div className="mt-6">
          <Onboarding locale={viewer.locale} />
        </div>
      ) : null}
      {latest && lesson && teacher ? (
        <Card className="mt-6">
          <p className="text-sm text-muted">{t(viewer.locale, "continue.with")} {teacher.name[viewer.locale]}</p>
          <h2 className="mt-1 text-[20px]">{lessonTitle(lesson, viewer.locale)}</h2>
          <p className="text-sm text-muted">
            {teacher.subject[viewer.locale]} · {formatWhen(latest.updated_at, viewer.locale)}
          </p>
          <Link href={`/learn/${lesson.id}`} className="mt-3 inline-flex min-h-12 items-center justify-center rounded-[14px] bg-primary px-4 font-semibold text-white">
            {latest.status === "completed" ? t(viewer.locale, "teacher.review") : t(viewer.locale, "home.continue")}
          </Link>
        </Card>
      ) : null}
      <section className="mt-8">
        <h2>{t(viewer.locale, "landing.stepsTitle")}</h2>
        <ol className="mt-3 grid gap-3 md:grid-cols-2">
          {(["landing.step1", "landing.step2", "landing.step3", "landing.step4"] as const).map((key, index) => (
            <li key={key} className="rounded-[20px] border border-border bg-surface p-4">
              <span className="text-sm font-semibold text-primary">0{index + 1}</span>
              <p className="mt-1 font-semibold">{t(viewer.locale, key)}</p>
            </li>
          ))}
        </ol>
      </section>
      <section className="mt-8">
        <h2>{t(viewer.locale, "home.teachers")}</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 min-[380px]:grid-cols-2 lg:grid-cols-3">
          {teachers.map((item) => {
            const image = teacherImage(item);
            const body = (
              <>
                {image ? (
                  <div className="relative aspect-square w-full" style={{ background: item.accentBackground }}>
                    <Image src={image} alt={item.name[viewer.locale]} fill sizes="(max-width: 768px) 100vw, 320px" className="object-cover" style={{ objectPosition: "50% 20%" }} />
                  </div>
                ) : (
                  <div className="grid aspect-square w-full place-items-center text-5xl font-semibold" style={{ background: item.accentBackground }} aria-hidden>
                    {item.name.en.replace("Teacher ", "").slice(0, 1)}
                  </div>
                )}
                <div className="p-3">
                  <p className="font-semibold">{item.name[viewer.locale]}</p>
                  <p className="text-sm text-muted">{item.subject[viewer.locale]}</p>
                  <p className="mt-2 line-clamp-2 text-sm">{teacherPersona(item, viewer.locale)}</p>
                  <div className="mt-3">
                    <Pill tone={item.mvpEnabled ? "blue" : "muted"}>{item.mvpEnabled ? t(viewer.locale, "teacher.start") : t(viewer.locale, "teacher.soon")}</Pill>
                  </div>
                </div>
              </>
            );
            if (!item.mvpEnabled) {
              return (
                <div key={item.id} role="group" aria-disabled="true" className="overflow-hidden rounded-[20px] border border-border bg-surface opacity-80">
                  {body}
                </div>
              );
            }
            return (
              <Link key={item.id} href={`/teachers/${item.id}`} className="overflow-hidden rounded-[20px] border border-border bg-surface">
                {body}
              </Link>
            );
          })}
        </div>
      </section>
      <p className="mt-8 text-sm text-muted">{t(viewer.locale, "landing.demoNote")}</p>
    </div>
  );
}
