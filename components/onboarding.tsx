"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LearningPreferences } from "@/components/learning-preferences";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { t } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

export function Onboarding({ locale, nextPath }: { locale: Locale; nextPath: string }) {
  const router = useRouter();
  const [level, setLevel] = useState("unsure");
  const [goal, setGoal] = useState("chat");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(skip: boolean) {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/preferences", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(skip ? { onboarded: true, level: "unsure", goal: null } : { onboarded: true, level, goal }),
      });
      if (!response.ok) throw new Error("Setup failed");
      router.replace(nextPath);
      router.refresh();
    } catch {
      setError(t(locale, "profile.saveError"));
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1>{t(locale, "onboarding.title")}</h1>
        </CardTitle>
        <CardDescription>{t(locale, "onboarding.body")}</CardDescription>
      </CardHeader>
      <CardContent>
        <LearningPreferences locale={locale} level={level} goal={goal} onLevel={setLevel} onGoal={setGoal} disabled={pending} />
        {error ? (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
      <CardFooter className="flex-wrap gap-3">
        <Button className="min-h-11" type="button" disabled={pending} onClick={() => void save(false)}>
          {pending ? <Spinner data-icon="inline-start" /> : null}
          {t(locale, "onboarding.start")}
        </Button>
        <Button className="min-h-11" type="button" variant="ghost" disabled={pending} onClick={() => void save(true)}>
          {t(locale, "onboarding.skip")}
        </Button>
      </CardFooter>
    </Card>
  );
}
