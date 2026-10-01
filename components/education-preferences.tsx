"use client";

import { FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";
import { PreferenceChoices } from "@/components/preference-choices";
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
      <PreferenceChoices options={educationStages.map(value => ({ value, label: t(locale, `education.${value}`) }))} value={educationStage} onChange={value => onEducationStage(value || null)} label={t(locale, "profile.education")} disabled={disabled} />
    </FieldSet>
    <FieldSet disabled={disabled}>
      <FieldLegend>{t(locale, "profile.subject")}</FieldLegend>
      <PreferenceChoices options={preferredSubjects.map(value => ({ value, label: t(locale, `subject.${value}`) }))} value={preferredSubject} onChange={value => onPreferredSubject(value || null)} label={t(locale, "profile.subject")} disabled={disabled} />
    </FieldSet>
  </FieldGroup>;
}
