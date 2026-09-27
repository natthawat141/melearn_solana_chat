import th from "@/content/ui-th.json";
import en from "@/content/ui-en.json";
import type { Locale } from "@/lib/types";

const dictionaries = { th, en } as const;

export function t(locale: Locale, key: keyof typeof th) {
  const table = dictionaries[locale] as Record<string, string>;
  return table[key] || dictionaries.th[key] || key;
}
