import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { UpgradeButton } from "@/components/upgrade-button";
import { t } from "@/lib/i18n";
import { getViewer } from "@/lib/viewer";

export default async function PricingPage() {
  const { locale } = await getViewer();
  const free = ["pricing.free1", "pricing.free2", "pricing.free3"] as const;
  const pro = ["pricing.pro1", "pricing.pro2", "pricing.pro3"] as const;
  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-8">
      <h1>{t(locale, "pricing.title")}</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">{t(locale, "pricing.lead")}</p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t(locale, "pricing.freeName")}</CardTitle>
            <p className="text-3xl font-semibold">{t(locale, "pricing.freePrice")}</p>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 text-sm">
              {free.map((key) => (
                <li key={key}>{t(locale, key)}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card className="border-primary">
          <CardHeader>
            <Badge className="w-fit">{t(locale, "pricing.proName")}</Badge>
            <CardTitle className="text-3xl">{t(locale, "pricing.proPrice")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 text-sm">
              {pro.map((key) => (
                <li key={key}>{t(locale, key)}</li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <UpgradeButton locale={locale} className="min-h-12 w-full" />
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
