import Link from "next/link";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import { getViewer } from "@/lib/viewer";

export default async function NotFound() {
  const { locale } = await getViewer();
  return (
    <div className="mx-auto flex min-h-[50vh] w-full max-w-xl flex-col justify-center px-5 py-10">
      <h1>{t(locale, "notFound.title")}</h1>
      <p className="mt-2 text-muted-foreground">{t(locale, "notFound.body")}</p>
      <Button asChild className="mt-6 w-fit min-h-12">
        <Link href="/app">{t(locale, "notFound.home")}</Link>
      </Button>
    </div>
  );
}
