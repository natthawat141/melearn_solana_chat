import { LoginPanel } from "@/components/landing/login-panel";
import { landingCopy } from "@/content/landing";
import { safeLearningDestination } from "@/lib/navigation";
import { getViewer } from "@/lib/viewer";
import { redirect } from "next/navigation";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; mode?: string }> }) {
  const viewer = await getViewer();
  const params = await searchParams;
  const nextPath = safeLearningDestination(params.next);
  if (viewer.user) redirect(viewer.onboarded ? nextPath : `/setup?next=${encodeURIComponent(nextPath)}`);

  const copy = landingCopy(viewer.locale);
  return (
    <LoginPanel
      key={params.mode === "register" ? "register" : "login"}
      copy={copy.auth}
      locale={viewer.locale}
      initialMode={params.mode === "register" ? "register" : "login"}
      nextPath={nextPath}
    />
  );
}
