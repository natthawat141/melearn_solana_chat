"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Languages, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import type { Locale } from "@/lib/types";

const languages = [
  { value: "th", label: "ไทย" },
  { value: "en", label: "English" },
] as const;

export function LanguageSwitcher({ locale, labelled = false }: { locale: Locale; labelled?: boolean }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const pending = saving || refreshing;
  const label = locale === "th" ? "เปลี่ยนภาษา" : "Change language";

  async function changeLanguage(next: string) {
    if (pending || next === locale || (next !== "th" && next !== "en")) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/preferences", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale: next }),
      });
      if (!response.ok) throw new Error("Locale update failed");
      startTransition(() => router.refresh());
    } catch {
      setError(locale === "th" ? "เปลี่ยนภาษาไม่สำเร็จ ลองอีกครั้ง" : "Could not change language. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="settings-control">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size={labelled ? "default" : "icon"} className={labelled ? "h-11 min-w-40 justify-between gap-3 rounded-lg px-3 text-sm!" : "settings-button"} disabled={pending} aria-label={label} aria-busy={pending}>
            {pending ? <Spinner /> : <Languages strokeWidth={1.5} />}
            {labelled ? <><span className="flex-1 text-left">{locale === "th" ? "ไทย" : "English"}</span><ChevronDown className="size-4" /></> : null}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-40">
          <DropdownMenuRadioGroup value={locale} onValueChange={(value) => void changeLanguage(value)}>
            {languages.map((item) => (
              <DropdownMenuRadioItem key={item.value} value={item.value} className="min-h-11">
                {item.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      {error ? <p className={labelled ? "mt-2 max-w-xs text-sm text-destructive" : "settings-error"} role="alert">{error}</p> : null}
    </div>
  );
}
