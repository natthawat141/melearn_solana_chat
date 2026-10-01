"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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

  return <>
    <Card className="mx-auto max-w-xl"><CardContent className="space-y-3 pt-6"><h1>{t(locale, "onboarding.title")}</h1><p className="text-muted-foreground">{t(locale, "onboarding.body")}</p></CardContent></Card>
    <Dialog open onOpenChange={() => {}}>
      <DialogContent showCloseButton={false} className="max-h-[90dvh] overflow-y-auto p-6 sm:max-w-xl sm:p-8" onInteractOutside={event => event.preventDefault()} onEscapeKeyDown={event => event.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-2xl">{t(locale, "onboarding.title")}</DialogTitle>
          <DialogDescription>{t(locale, "onboarding.body")}</DialogDescription>
        </DialogHeader>
        {mode ? <>
          <div className="space-y-2" aria-live="polite">
            <p className="text-sm text-muted-foreground">{t(locale, "onboarding.step").replace("{current}", String(step + 1)).replace("{total}", String(questions.length))}</p>
            <Progress value={((step + 1) / questions.length) * 100} aria-label={t(locale, "profile.preferences")} className="h-1.5" />
          </div>
          <Field className="py-3">
            <FieldLabel ref={questionLabel} tabIndex={-1} id="setup-question" className="text-lg outline-none">{t(locale, title)}</FieldLabel>
            <FieldDescription>{t(locale, hint)}</FieldDescription>
            <ToggleGroup type="single" variant="outline" value={answers[question] || ""} disabled={pending} onValueChange={value => setAnswers({ ...answers, [question]: value || null })} aria-labelledby="setup-question" className="grid w-full grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
              {options.map(option => <ToggleGroupItem key={`${question}-${option.value}`} value={option.value} className="h-auto min-h-14 justify-start rounded-xl px-4 py-3 text-left whitespace-normal"><span className="flex-1">{option.label}</span>{answers[question] === option.value ? <Check className="size-4" /> : null}</ToggleGroupItem>)}
            </ToggleGroup>
          </Field>
          <div className="flex items-center justify-between gap-3">
            <Button type="button" variant="ghost" disabled={pending} onClick={() => { if (step === 0) setMode(null); else setStep(step - 1); }}><ArrowLeft />{t(locale, "onboarding.back")}</Button>
            <Button type="button" className="min-h-11" disabled={pending || !answers[question]} onClick={() => advance()}>{pending ? <Spinner /> : null}{t(locale, step === questions.length - 1 ? "onboarding.start" : "onboarding.next")}<ArrowRight /></Button>
          </div>
        </> : <div className="space-y-4 py-3">
          <h2 className="text-lg font-semibold">{t(locale, "onboarding.mode")}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button type="button" variant="outline" className="h-auto min-h-20 text-base" disabled={pending} onClick={() => { setStep(0); setMode("quick"); }}>{t(locale, "onboarding.quick")}</Button>
            <Button type="button" variant="outline" className="h-auto min-h-20 text-base" disabled={pending} onClick={() => { setStep(0); setMode("detail"); }}>{t(locale, "onboarding.detail")}</Button>
          </div>
        </div>}
        {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
      </DialogContent>
    </Dialog>
  </>;
}
