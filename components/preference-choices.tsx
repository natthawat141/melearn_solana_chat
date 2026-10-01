"use client";

import { Check } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

// Shared presentation around the installed Radix single-selection control.
export function PreferenceChoices({ options, value, onChange, label, labelledBy, disabled }: {
  options: { value: string; label: string }[];
  value: string | null;
  onChange: (value: string) => void;
  label?: string;
  labelledBy?: string;
  disabled?: boolean;
}) {
  return <ToggleGroup type="single" variant="outline" value={value || ""} onValueChange={onChange} disabled={disabled} aria-label={label} aria-labelledby={labelledBy} className="grid w-full auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2">
    {options.map(option => <ToggleGroupItem key={option.value} value={option.value} className="h-full min-h-16 w-full justify-between gap-3 rounded-xl px-4 py-3 text-left text-sm! leading-5 whitespace-normal data-[state=on]:border-sidebar-ring data-[state=on]:bg-sidebar-accent data-[state=on]:text-sidebar-accent-foreground">
      <span className="min-w-0">{option.label}</span><Check aria-hidden="true" className={`size-4 shrink-0 ${value === option.value ? "" : "invisible"}`} />
    </ToggleGroupItem>)}
  </ToggleGroup>;
}
