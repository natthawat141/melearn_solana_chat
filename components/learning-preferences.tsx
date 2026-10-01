"use client";

import { FieldDescription, FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";
import { PreferenceChoices } from "@/components/preference-choices";
import { t } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

const levels = ["beginner", "some", "unsure"] as const;
const goals = ["chat", "review", "practice"] as const;

export function LearningPreferences({
  locale,
  level,
  goal,
  onLevel,
  onGoal,
  disabled,
}: {
  locale: Locale;
  level: string;
  goal: string;
  onLevel: (value: string) => void;
  onGoal: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <FieldGroup>
      <FieldSet disabled={disabled}>
        <FieldLegend>{t(locale, "onboarding.level")}</FieldLegend>
        <FieldDescription>{t(locale, "onboarding.levelHint")}</FieldDescription>
        <PreferenceChoices options={levels.map(value => ({ value, label: t(locale, `level.${value}`) }))} value={level} onChange={value => { if (value) onLevel(value); }} label={t(locale, "onboarding.level")} disabled={disabled} />
      </FieldSet>
      <FieldSet disabled={disabled}>
        <FieldLegend>{t(locale, "onboarding.goal")}</FieldLegend>
        <FieldDescription>{t(locale, "onboarding.goalHint")}</FieldDescription>
        <PreferenceChoices options={goals.map(value => ({ value, label: t(locale, `goal.${value}`) }))} value={goal} onChange={value => { if (value) onGoal(value); }} label={t(locale, "onboarding.goal")} disabled={disabled} />
      </FieldSet>
    </FieldGroup>
  );
}
