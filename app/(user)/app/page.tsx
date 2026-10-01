import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getLesson, lessonTitle, teacherImage, teacherPersona, teachers } from "@/lib/content";
import { getDb } from "@/lib/db";
import { formatWhen } from "@/lib/format";
import { t } from "@/lib/i18n";
import { listLearning } from "@/lib/learning";
import { getViewer } from "@/lib/viewer";

export default async function HomePage() {
  const viewer = await getViewer();
  const latest = viewer.user ? (await listLearning(await getDb(), "user", viewer.user.id))[0] : undefined;
  const lesson = latest ? getLesson(latest.lesson_id) : null;
  const teacher = lesson ? teachers.find((item) => item.id === lesson.teacherId) : null;
  const orderedTeachers = [...teachers].sort((a, b) => Number(b.mvpEnabled) - Number(a.mvpEnabled));

  return (
    <div className="mx-auto flex w-full max-w-[1040px] flex-col gap-7 px-5 py-7 md:px-8 md:py-10">
      <div className="flex flex-col gap-2">
        <h1 className="max-w-xl text-2xl! font-semibold!">{t(viewer.locale, "home.title")}</h1>
        <p className="max-w-2xl text-muted-foreground">{t(viewer.locale, "home.lead")}</p>
      </div>
      {viewer.user && latest && lesson && teacher ? (
        <Card className="gap-4 rounded-xl bg-sidebar-accent/30 p-5 shadow-none ring-1 ring-border sm:flex-row sm:items-center sm:justify-between">
          <CardHeader className="min-w-0 flex-1 px-0">
            <CardTitle>{lessonTitle(lesson, viewer.locale)}</CardTitle>
            <CardDescription>{t(viewer.locale, "continue.with")} {teacher.name[viewer.locale]} · {formatWhen(latest.updated_at, viewer.locale)}</CardDescription>
          </CardHeader>
          <Button asChild className="h-10 shrink-0"><Link href={`/learn/${lesson.id}`}>{latest.status === "completed" ? t(viewer.locale, "teacher.review") : t(viewer.locale, "home.continue")}</Link></Button>
        </Card>
      ) : null}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg! font-medium!">{t(viewer.locale, "home.teachers")}</h2>
        <div className="grid auto-rows-fr grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {orderedTeachers.map((item) => {
            const image = teacherImage(item);
            return (
              <Card key={item.id} className="h-full gap-4 rounded-xl pt-0 shadow-none ring-1 ring-border">
                <div className="relative h-44 w-full overflow-hidden bg-sidebar-accent" style={image ? { background: item.accentBackground } : undefined}>
                  {image ? <Image src={image} alt={item.name[viewer.locale]} fill sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 320px" className="object-cover" style={{ objectPosition: "50% 20%" }} /> : <div className="grid h-full place-items-center text-4xl font-semibold text-sidebar-accent-foreground" aria-hidden>{item.name.en.replace("Teacher ", "").slice(0, 1)}</div>}
                </div>
                <CardHeader className="gap-1 px-5">
                  <div className="flex min-w-0 items-start justify-between gap-2"><CardTitle className="min-w-0">{item.name[viewer.locale]}</CardTitle>{!item.mvpEnabled ? <Badge variant="secondary" className="shrink-0">{t(viewer.locale, "teacher.soon")}</Badge> : null}</div>
                  <CardDescription>{item.subject[viewer.locale]}</CardDescription>
                </CardHeader>
                <CardContent className="px-5"><p className="line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-muted-foreground">{teacherPersona(item, viewer.locale)}</p></CardContent>
                <CardFooter className="mt-auto border-0 bg-transparent px-5 pb-5 pt-0">
                  {item.mvpEnabled ? <Button asChild className="h-11 w-full"><Link href={`/teachers/${item.id}`}>{t(viewer.locale, "home.pick")}</Link></Button> : <Button variant="outline" disabled className="h-11 w-full">{t(viewer.locale, "teacher.soon")}</Button>}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
