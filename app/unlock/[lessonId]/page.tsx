import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { UnlockPanel } from "@/components/unlock-panel";
import { getLesson, getTeacher, lessonObjectives, lessonSummary, lessonTitle, paymentRecipient, payments, priceLamports } from "@/lib/content";
import { getDb } from "@/lib/db";
import { formatSol } from "@/lib/format";
import { latestPurchase } from "@/lib/purchases";
import { lessonUnlocked, getViewer } from "@/lib/viewer";

export default async function UnlockPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const lesson = getLesson(lessonId);
  const teacher = lesson ? getTeacher(lesson.teacherId) : null;
  if (!lesson || !teacher) notFound();
  if (!teacher.mvpEnabled) redirect(`/teachers/${teacher.id}`);
  if (lesson.access === "free") redirect(`/learn/${lesson.id}`);
  const viewer = await getViewer();
  const owned = lessonUnlocked(viewer.user?.id ?? null, lesson.id, lesson.access);
  const purchase = viewer.user ? latestPurchase(getDb(), viewer.user.id, lesson.id) : null;
  const lamports = priceLamports(lesson.id);
  return (
    <div>
      <div className="mx-auto w-full max-w-[760px] px-5">
        <Link href={`/teachers/${teacher.id}`} className="inline-flex min-h-11 items-center font-semibold text-primary">
          {teacher.name[viewer.locale]}
        </Link>
      </div>
      <UnlockPanel
        locale={viewer.locale}
        lessonId={lesson.id}
        title={lessonTitle(lesson, viewer.locale)}
        summary={lessonSummary(lesson, viewer.locale)}
        objectives={lessonObjectives(lesson, viewer.locale)}
        priceLabel={lamports ? `${formatSol(lamports)} SOL` : null}
        lamports={lamports}
        recipient={paymentRecipient()}
        terms={payments.accessTerms[viewer.locale]}
        tokenLabel={payments.tokenLabel[viewer.locale]}
        signedIn={Boolean(viewer.user)}
        owned={owned}
        initialPurchase={purchase ? { id: purchase.id, status: purchase.status, signature: purchase.signature } : null}
      />
    </div>
  );
}
