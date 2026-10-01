import { ProfilePanel } from "@/components/profile-panel";
import { getDb } from "@/lib/db";
import { listLearning } from "@/lib/learning";
import { getLesson, lessonTitle } from "@/lib/content";
import { getViewer } from "@/lib/viewer";

export default async function ProfilePage() {
  const viewer = await getViewer();
  const learning = viewer.user ? listLearning(getDb(), "user", viewer.user.id).flatMap(row => {
    const lesson = getLesson(row.lesson_id);
    return lesson ? [{ id: lesson.id, title: lessonTitle(lesson, viewer.locale), status: row.status, updatedAt: row.updated_at }] : [];
  }) : [];
  return (
    <ProfilePanel
      locale={viewer.locale}
      learning={learning}
      educationStage={viewer.user?.educationStage ?? null}
      preferredSubject={viewer.user?.preferredSubject ?? null}
      signedIn={Boolean(viewer.user)}
      displayName={viewer.user?.displayName || ""}
      level={viewer.level}
      goal={viewer.goal}
      walletAddress={viewer.user?.walletAddress || null}
      avatarUrl={viewer.user?.avatarUrl ?? null}
    />
  );
}
