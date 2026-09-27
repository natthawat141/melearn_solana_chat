import { NextResponse } from "next/server";
import { getTeacher, lessonsForTeacher, priceLamports } from "@/lib/content";
import { jsonError } from "@/lib/http";
import { lessonUnlocked, getViewer } from "@/lib/viewer";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const teacher = getTeacher(id);
  const viewer = await getViewer();
  if (!teacher) return jsonError(viewer.locale, 404, "NOT_FOUND");
  const lessons = lessonsForTeacher(teacher.id).map((lesson) => {
    const unlocked = lessonUnlocked(viewer.user?.id ?? null, lesson.id, lesson.access);
    return {
      id: lesson.id,
      title: lesson.title,
      titleEn: lesson.titleEn,
      access: lesson.access,
      unlocked,
      priceLamports: lesson.access === "paid" ? priceLamports(lesson.id) : null,
      estimatedMinutes: lesson.estimatedMinutes,
    };
  });
  return NextResponse.json({ teacherId: teacher.id, enabled: teacher.mvpEnabled, lessons });
}
