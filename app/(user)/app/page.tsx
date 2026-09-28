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
  const latest = viewer.user ? listLearning(getDb(), "user", viewer.user.id)[0] : undefined;
  const lesson = latest ? getLesson(latest.lesson_id) : null;
  const teacher = lesson ? teachers.find((item) => item.id === lesson.teacherId) : null;

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-8 px-5">
      <div className="flex flex-col gap-2">
        <h1 className="max-w-xl">{t(viewer.locale, "home.title")}</h1>
        <p className="max-w-2xl text-muted-foreground">{t(viewer.locale, "home.lead")}</p>
      </div>
      {viewer.user && latest && lesson && teacher ? (
        <Card>
          <CardHeader>
            <CardDescription>
              {t(viewer.locale, "continue.with")} {teacher.name[viewer.locale]}
            </CardDescription>
            <CardTitle>{lessonTitle(lesson, viewer.locale)}</CardTitle>
            <CardDescription>
              {teacher.subject[viewer.locale]} · {formatWhen(latest.updated_at, viewer.locale)}
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild className="min-h-11">
              <Link href={`/learn/${lesson.id}`}>
                {latest.status === "completed" ? t(viewer.locale, "teacher.review") : t(viewer.locale, "home.continue")}
              </Link>
            </Button>
          </CardFooter>
        </Card>
      ) : null}
      <section className="flex flex-col gap-4">
        <h2>{t(viewer.locale, "home.teachers")}</h2>
        <div className="grid grid-cols-1 gap-4 min-[380px]:grid-cols-2 lg:grid-cols-3">
          {teachers.map((item) => {
            const image = teacherImage(item);
            return (
              <Card key={item.id} className="pt-0">
                {image ? (
                  <div className="relative aspect-square w-full" style={{ background: item.accentBackground }}>
                    <Image src={image} alt={item.name[viewer.locale]} fill sizes="(max-width: 768px) 100vw, 320px" className="object-cover" style={{ objectPosition: "50% 20%" }} />
                  </div>
                ) : (
                  <div className="grid aspect-square w-full place-items-center bg-muted text-5xl font-semibold" aria-hidden>
                    {item.name.en.replace("Teacher ", "").slice(0, 1)}
                  </div>
                )}
                <CardHeader>
                  <CardTitle>{item.name[viewer.locale]}</CardTitle>
                  <CardDescription>{item.subject[viewer.locale]}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="line-clamp-3">{teacherPersona(item, viewer.locale)}</p>
                </CardContent>
                <CardFooter>
                  {item.mvpEnabled ? (
                    <Button asChild className="min-h-11">
                      <Link href={`/teachers/${item.id}`}>{t(viewer.locale, "home.pick")}</Link>
                    </Button>
                  ) : (
                    <Badge variant="outline">{t(viewer.locale, "teacher.soon")}</Badge>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
