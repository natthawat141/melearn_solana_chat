import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { teachers, teacherPersona } from "@/lib/content";
import { t } from "@/lib/i18n";
import { getViewer } from "@/lib/viewer";

export default async function LandingPage() {
  const viewer = await getViewer();
  const locale = viewer.locale;
  return (
    <div>
      <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-3 px-4 py-4 sm:px-5">
        <Link href="/" className="flex min-h-11 items-center gap-2">
          <Image src="/brand/logo.png" alt="Melearn Chat" width={40} height={40} className="size-10 object-contain" />
          <span className="font-semibold">Melearn Chat</span>
        </Link>
        <nav className="ml-auto flex items-center gap-2">
          <Button asChild variant="ghost" className="hidden min-h-11 px-3 sm:inline-flex">
            <Link href="/pricing">{t(locale, "landing.pricing")}</Link>
          </Button>
          <ThemeToggle label={locale === "en" ? "Theme" : "ธีม"} />
          <Button asChild className="min-h-11 px-4">
            <Link href="/learn/english-intro-01">{t(locale, "landing.try")}</Link>
          </Button>
        </nav>
      </header>
      <main className="mx-auto grid w-full max-w-6xl gap-10 px-5 pb-16 pt-8 md:grid-cols-[1.2fr_0.8fr] md:items-center">
        <div>
          <Badge variant="secondary">{t(locale, "landing.kicker")}</Badge>
          <h1 className="mt-4 max-w-xl text-4xl">{t(locale, "landing.hero")}</h1>
          <p className="mt-4 max-w-xl text-muted-foreground">{t(locale, "landing.subtitle")}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg" className="min-h-12 px-5 text-base">
              <Link href="/learn/english-intro-01">{t(locale, "landing.try")}</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="min-h-12 px-5 text-base">
              <Link href="/pricing">{t(locale, "landing.pricing")}</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">{t(locale, "landing.freeNote")}</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{t(locale, "home.teachers")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {teachers.filter((teacher) => teacher.mvpEnabled).map((teacher) => (
              <div key={teacher.id} className="rounded-xl border border-border p-3">
                <p className="font-semibold">{teacher.name[locale]}</p>
                <p className="text-sm text-muted-foreground">{teacher.subject[locale]}</p>
                <p className="mt-1 text-sm">{teacherPersona(teacher, locale)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
