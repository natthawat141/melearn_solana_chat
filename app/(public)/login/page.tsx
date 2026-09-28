import Image from "next/image";
import { redirect } from "next/navigation";
import { LoginPanel } from "@/components/landing/login-panel";
import { landingCopy } from "@/content/landing";
import { safeLearningDestination } from "@/lib/navigation";
import { getViewer } from "@/lib/viewer";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; mode?: string }> }) {
  const viewer = await getViewer();
  const params = await searchParams;
  const nextPath = safeLearningDestination(params.next);
  if (viewer.user) redirect(viewer.onboarded ? nextPath : `/setup?next=${encodeURIComponent(nextPath)}`);
  const copy = landingCopy(viewer.locale);
  return (
    <main id="main-content" className="m-auth-main">
      <div className="m-container m-auth-layout">
        <div className="m-auth-intro"><div className="m-auth-art"><Image src="/landing/math-background.webp" alt={copy.hero.artworkAlt} fill sizes="440px" /></div><h2>{copy.closing.title}</h2><p>{copy.closing.body}</p></div>
        <LoginPanel copy={copy.auth} locale={viewer.locale} initialMode={params.mode === "register" ? "register" : "login"} nextPath={nextPath} />
      </div>
    </main>
  );
}
