import { redirect } from "next/navigation";
import { Onboarding } from "@/components/onboarding";
import { safeLearningDestination } from "@/lib/navigation";
import { getViewer } from "@/lib/viewer";

export default async function SetupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const viewer = await getViewer();
  const nextPath = safeLearningDestination((await searchParams).next);
  if (!viewer.user) redirect(`/login?next=${encodeURIComponent(nextPath)}&mode=register`);
  if (viewer.onboarded) redirect(nextPath);
  return <main id="main-content" className="m-auth-main"><div className="m-container max-w-2xl"><Onboarding locale={viewer.locale} nextPath={nextPath} /></div></main>;
}
