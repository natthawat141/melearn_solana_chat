"use client";

import { FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { educationStages, preferredSubjects } from "@/lib/learning-profile";
import { t } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

export function EducationPreferences({ locale, educationStage, preferredSubject, onEducationStage, onPreferredSubject, disabled }: {
  locale: Locale; educationStage: string | null; preferredSubject: string | null;
  onEducationStage: (value: string | null) => void; onPreferredSubject: (value: string | null) => void; disabled?: boolean;
}) {
  return <FieldGroup>
    <FieldSet disabled={disabled}>
      <FieldLegend>{t(locale, "profile.education")}</FieldLegend>
      <ToggleGroup type="single" variant="outline" value={educationStage ?? ""} onValueChange={value => onEducationStage(value || null)} aria-label={t(locale, "profile.education")} className="w-full flex-wrap justify-start">
        {educationStages.map(value => <ToggleGroupItem key={value} value={value} className="min-h-11">{t(locale, `education.${value}`)}</ToggleGroupItem>)}
      </ToggleGroup>
    </FieldSet>
    <FieldSet disabled={disabled}>
      <FieldLegend>{t(locale, "profile.subject")}</FieldLegend>
      <ToggleGroup type="single" variant="outline" value={preferredSubject ?? ""} onValueChange={value => onPreferredSubject(value || null)} aria-label={t(locale, "profile.subject")} className="w-full flex-wrap justify-start">
        {preferredSubjects.map(value => <ToggleGroupItem key={value} value={value} className="min-h-11">{t(locale, `subject.${value}`)}</ToggleGroupItem>)}
      </ToggleGroup>
    </FieldSet>
  </FieldGroup>;
}
