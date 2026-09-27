import type { Locale } from "@/lib/types";

export function formatSol(lamports: number) {
  const sign = lamports < 0 ? "-" : "";
  const abs = Math.abs(lamports);
  const whole = Math.floor(abs / 1_000_000_000);
  const frac = (abs % 1_000_000_000).toString().padStart(9, "0").replace(/0+$/, "");
  return frac ? `${sign}${whole}.${frac.slice(0, 4)}` : `${sign}${whole}`;
}

export function shortAddress(value: string) {
  if (value.length <= 12) return value;
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

export function formatWhen(iso: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(new Date(iso));
}

export function nowIso() {
  return new Date().toISOString();
}
