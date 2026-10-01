"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { PreferenceChoices } from "@/components/preference-choices";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { educationStages, preferredSubjects } from "@/lib/learning-profile";
import { t } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

type Question = "education" | "subject" | "goal" | "level";

export function Onboarding({ locale, nextPath }: { locale: Locale; nextPath: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"quick" | "detail" | null>(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<Question, string | null>>({ education: null, subject: null, goal: null, level: null });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const questionLabel = useRef<HTMLLabelElement>(null);
  useEffect(() => { if (mode) questionLabel.current?.focus(); }, [mode, step]);
  const questions: Question[] = mode === "detail" ? ["education", "subject", "goal", "level"] : ["goal", "level"];
  const question = questions[step];
  const title = question === "education" ? "onboarding.education" : question === "subject" ? "onboarding.subject" : question === "goal" ? "onboarding.goalQuestion" : "onboarding.levelQuestion";
  const hint = question === "education" ? "onboarding.educationHint" : question === "subject" ? "onboarding.subjectHint" : question === "goal" ? "onboarding.goalHint" : "onboarding.levelHint";
  const options = question === "education" ? educationStages.map(value => ({ value, label: t(locale, `education.${value}`) }))
    : question === "subject" ? preferredSubjects.map(value => ({ value, label: t(locale, `subject.${value}`) }))
    : question === "goal" ? (["chat", "review", "practice"] as const).map(value => ({ value, label: t(locale, `goal.${value}`) }))
    : (["beginner", "some", "unsure"] as const).map(value => ({ value, label: t(locale, `level.${value}`) }));

  async function save(values = answers) {
    if (pending) return;
    setPending(true); setError(null);
    try {
      const response = await fetch("/api/preferences", {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ onboarded: true, level: values.level, goal: values.goal,
          educationStage: mode !== "detail" ? null : values.education, preferredSubject: mode !== "detail" ? null : values.subject }),
      });
      if (!response.ok) throw new Error("Setup failed");
      router.replace(nextPath); router.refresh();
    } catch { setError(t(locale, "profile.saveError")); }
    finally { setPending(false); }
  }

  function advance() {
    if (!answers[question] || pending) return;
    if (step === questions.length - 1) void save(answers);
    else setStep(step + 1);
  }

  return (
    <Card className="mx-auto w-full max-w-2xl gap-6 rounded-2xl py-6 shadow-none ring-1 ring-border sm:py-8">
      <CardHeader className="gap-2 px-6 sm:px-8">
        <h1 className="text-2xl! font-semibold!">{t(locale, "onboarding.title")}</h1>
        <p className="text-sm leading-6 text-muted-foreground">{t(locale, "onboarding.body")}</p>
      </CardHeader>
      <CardContent className="flex min-h-[360px] flex-col gap-5 px-6 sm:min-h-[400px] sm:px-8">
        {mode ? <>
          <div className="space-y-2" aria-live="polite">
            <p className="text-sm text-muted-foreground">{t(locale, "onboarding.step").replace("{current}", String(step + 1)).replace("{total}", String(questions.length))}</p>
            <Progress value={((step + 1) / questions.length) * 100} aria-label={t(locale, "profile.preferences")} className="h-1.5" />
          </div>
          <Field className="flex-1 py-1">
            <FieldLabel ref={questionLabel} tabIndex={-1} id="setup-question" className="text-lg outline-none">{t(locale, title)}</FieldLabel>
            <FieldDescription>{t(locale, hint)}</FieldDescription>
            <PreferenceChoices options={options} value={answers[question]} disabled={pending} onChange={value => setAnswers({ ...answers, [question]: value || null })} labelledBy="setup-question" />
          </Field>
          <div className="mt-auto flex items-center justify-between gap-3">
            <Button type="button" variant="ghost" disabled={pending} onClick={() => { if (step === 0) setMode(null); else setStep(step - 1); }}><ArrowLeft />{t(locale, "onboarding.back")}</Button>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" disabled={pending} onClick={() => { const skipped = { ...answers, [question]: null }; setAnswers(skipped); if (step === questions.length - 1) void save(skipped); else setStep(step + 1); }}>{locale === "th" ? "ข้าม" : "Skip"}</Button>
              <Button type="button" className="min-h-11" disabled={pending || !answers[question]} onClick={() => advance()}>{pending ? <Spinner /> : null}{t(locale, step === questions.length - 1 ? "onboarding.start" : "onboarding.next")}<ArrowRight /></Button>
            </div>
          </div>
        </> : <div className="flex flex-1 flex-col gap-5">
          <h2 className="text-lg! font-medium!">{t(locale, "onboarding.mode")}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button type="button" variant="outline" className="h-full min-h-28 w-full justify-start rounded-xl px-5 py-5 text-left text-sm! whitespace-normal" disabled={pending} onClick={() => { setStep(0); setMode("quick"); }}>{t(locale, "onboarding.quick")}</Button>
            <Button type="button" variant="outline" className="h-full min-h-28 w-full justify-start rounded-xl px-5 py-5 text-left text-sm! whitespace-normal" disabled={pending} onClick={() => { setStep(0); setMode("detail"); }}>{t(locale, "onboarding.detail")}</Button>
          </div>
        </div>}
        {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
      </CardContent>
    </Card>
  );
}
