"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";
import { t } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

const levels = ["beginner", "some", "unsure"] as const;
const goals = ["chat", "review", "practice"] as const;

export function Onboarding({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [level, setLevel] = useState<(typeof levels)[number]>("beginner");
  const [goal, setGoal] = useState<(typeof goals)[number]>("chat");
  const [pending, setPending] = useState(false);

  async function save(skip: boolean) {
    setPending(true);
    await fetch("/api/preferences", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(skip ? { onboarded: true, level: "unsure", goal: null } : { onboarded: true, level, goal }),
    });
    setPending(false);
    router.refresh();
  }

  return (
    <Card className="mb-6 bg-[#E5F4FF]">
      <h2>{t(locale, "onboarding.title")}</h2>
      <p className="mt-1 text-muted">{t(locale, "onboarding.body")}</p>
      <p className="mt-4 text-sm font-semibold">{t(locale, "onboarding.level")}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {levels.map((item) => (
          <button key={item} type="button" aria-pressed={level === item} onClick={() => setLevel(item)} className={`min-h-11 rounded-full px-3 text-sm font-semibold ${level === item ? "bg-primary text-white" : "bg-surface text-ink"}`}>
            {t(locale, `level.${item}`)}
          </button>
        ))}
      </div>
      <p className="mt-4 text-sm font-semibold">{t(locale, "onboarding.goal")}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {goals.map((item) => (
          <button key={item} type="button" aria-pressed={goal === item} onClick={() => setGoal(item)} className={`min-h-11 rounded-full px-3 text-sm font-semibold ${goal === item ? "bg-primary text-white" : "bg-surface text-ink"}`}>
            {t(locale, `goal.${item}`)}
          </button>
        ))}
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <Button type="button" disabled={pending} onClick={() => save(false)}>
          {t(locale, "onboarding.start")}
        </Button>
        <Button type="button" variant="secondary" disabled={pending} onClick={() => save(true)}>
          {t(locale, "onboarding.skip")}
        </Button>
      </div>
    </Card>
  );
}
