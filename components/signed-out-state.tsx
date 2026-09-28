import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { t } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

export function SignedOutState({ locale, title, body, nextPath }: { locale: Locale; title: string; body: string; nextPath: string }) {
  const next = encodeURIComponent(nextPath);
  return (
    <Empty className="border bg-card">
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{body}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild className="min-h-11">
          <Link href={`/login?next=${next}`}>{t(locale, "auth.login")}</Link>
        </Button>
        <Button asChild variant="outline" className="min-h-11">
          <Link href={`/login?next=${next}&mode=register`}>{t(locale, "auth.register")}</Link>
        </Button>
      </EmptyContent>
    </Empty>
  );
}
