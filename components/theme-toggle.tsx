"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";

const choices = [
  { value: "light", Icon: Sun },
  { value: "dark", Icon: Moon },
] as const;

export function ThemeToggle({ label, lightLabel = label, darkLabel = label }: { label: string; lightLabel?: string; darkLabel?: string }) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [ready, setReady] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dark = resolvedTheme === "dark";

  useEffect(() => {
    if (theme === "system") setTheme("light");
    setReady(true);
  }, [setTheme, theme]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    document.documentElement.classList.remove("theme-transitioning");
  }, []);

  function choose(next: "light" | "dark") {
    const current = dark ? "dark" : "light";
    if (theme !== "system" && next === current) return;
    if (timer.current) clearTimeout(timer.current);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduced) document.documentElement.classList.add("theme-transitioning");
    setTheme(next);
    if (!reduced) timer.current = setTimeout(() => document.documentElement.classList.remove("theme-transitioning"), 550);
  }

  return (
    <div className="theme-switcher" role="group" aria-label={label}>
      {choices.map(({ value, Icon }) => {
        const selected = value === "dark" ? dark : !dark;
        const itemLabel = value === "dark" ? darkLabel : lightLabel;
        return (
          <button
            key={value}
            type="button"
            data-choice={value}
            aria-label={itemLabel}
            aria-pressed={ready ? selected : undefined}
            onClick={() => choose(value)}
          >
            <Icon strokeWidth={1.5} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
