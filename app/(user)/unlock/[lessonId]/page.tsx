import { notFound, redirect } from "next/navigation";
import { getLesson, getTeacher } from "@/lib/content";

export default async function UnlockPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const lesson = getLesson(lessonId);
  const teacher = lesson ? getTeacher(lesson.teacherId) : null;
  if (!lesson || !teacher) notFound();
  if (!teacher.mvpEnabled) redirect(`/teachers/${teacher.id}`);
  redirect(`/learn/${lesson.id}`);
}
