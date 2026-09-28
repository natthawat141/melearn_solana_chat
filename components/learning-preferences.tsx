"use client";

import { FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
        <ToggleGroup
          type="single"
          variant="outline"
          value={level}
          onValueChange={(value) => {
            if (value) onLevel(value);
          }}
          className="w-full flex-wrap justify-start"
          aria-label={t(locale, "onboarding.level")}
        >
          {levels.map((item) => (
            <ToggleGroupItem key={item} value={item} className="min-h-11">
              {t(locale, `level.${item}`)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </FieldSet>
      <FieldSet disabled={disabled}>
        <FieldLegend>{t(locale, "onboarding.goal")}</FieldLegend>
        <ToggleGroup
          type="single"
          variant="outline"
          value={goal}
          onValueChange={(value) => {
            if (value) onGoal(value);
          }}
          className="w-full flex-wrap justify-start"
          aria-label={t(locale, "onboarding.goal")}
        >
          {goals.map((item) => (
            <ToggleGroupItem key={item} value={item} className="min-h-11">
              {t(locale, `goal.${item}`)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </FieldSet>
    </FieldGroup>
  );
}
