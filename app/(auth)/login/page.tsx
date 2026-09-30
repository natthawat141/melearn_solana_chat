import { LoginPanel } from "@/components/landing/login-panel";
import { landingCopy } from "@/content/landing";
import { getLesson, getTeacher, lessonTitle } from "@/lib/content";
import { t } from "@/lib/i18n";
import { safeLearningDestination } from "@/lib/navigation";
import { getViewer } from "@/lib/viewer";
import { redirect } from "next/navigation";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; mode?: string }> }) {
  const viewer = await getViewer();
  const params = await searchParams;
  const nextPath = safeLearningDestination(params.next);
  if (viewer.user) redirect(viewer.onboarded ? nextPath : `/setup?next=${encodeURIComponent(nextPath)}`);

  const copy = landingCopy(viewer.locale);
  const lessonId = nextPath.startsWith("/learn/") ? nextPath.slice("/learn/".length) : "";
  const lesson = lessonId ? getLesson(lessonId) : null;
  const teacher = lesson ? getTeacher(lesson.teacherId) : null;

  return (
    <div className="w-full max-w-2xl">
      {lesson && teacher ? (
        <p>{t(viewer.locale, "auth.returningToLesson")} {teacher.name[viewer.locale]} — {lessonTitle(lesson, viewer.locale)}</p>
      ) : null}
      <LoginPanel
        key={params.mode === "register" ? "register" : "login"}
        copy={copy.auth}
        locale={viewer.locale}
        initialMode={params.mode === "register" ? "register" : "login"}
        nextPath={nextPath}
      />
      <p><a className="underline" href={nextPath}>{t(viewer.locale, lesson ? "auth.backToLesson" : "auth.backToLearning")}</a></p>
    </div>
  );
}
