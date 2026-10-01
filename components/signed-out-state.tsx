import Link from "next/link";
import { ArrowRight, BookOpenCheck, MessageCircle, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { t } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

export function SignedOutState({ locale, title, body, nextPath }: { locale: Locale; title: string; body: string; nextPath: string }) {
  const next = encodeURIComponent(nextPath);
  return (
    <div className="flex w-full flex-1 items-center justify-center py-4">
      <Card className="w-full max-w-[680px] gap-0 rounded-2xl ring-1 ring-primary/10 shadow-sm">
        <CardHeader className="gap-4 p-6 pb-5 sm:p-8 sm:pb-6">
          <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <UserRound aria-hidden="true" className="size-6" />
          </span>
          <div className="grid gap-2">
            <CardTitle className="text-xl font-semibold sm:text-2xl">{title}</CardTitle>
            <CardDescription className="max-w-lg text-sm leading-relaxed sm:text-base">{body}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-2 px-6 pb-6 sm:grid-cols-2 sm:px-8 sm:pb-7">
          <div className="flex items-center gap-3 rounded-xl bg-muted/60 px-3 py-3 text-sm text-muted-foreground">
            <MessageCircle aria-hidden="true" className="size-4 shrink-0 text-primary" />
            <span>{locale === "th" ? "เก็บประวัติแชตกับครู" : "Keep your teacher chats"}</span>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-muted/60 px-3 py-3 text-sm text-muted-foreground">
            <BookOpenCheck aria-hidden="true" className="size-4 shrink-0 text-primary" />
            <span>{locale === "th" ? "บันทึกความคืบหน้าการเรียน" : "Save learning progress"}</span>
          </div>
        </CardContent>
        <CardFooter className="flex-col items-stretch gap-2 rounded-b-2xl border-t-0 bg-muted/40 px-6 py-5 sm:flex-row sm:justify-end sm:px-8">
          <Button asChild variant="outline" className="min-h-11 sm:order-1">
            <Link href={`/login?next=${next}&mode=register`}>{t(locale, "auth.register")}</Link>
          </Button>
          <Button asChild className="min-h-11 sm:order-2">
            <Link href={`/login?next=${next}`}>
              {t(locale, "auth.login")}
              <ArrowRight data-icon="inline-end" aria-hidden="true" />
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
