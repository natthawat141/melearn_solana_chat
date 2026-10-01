"use client";

import { Moon, Sun, Palette } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useTheme } from "next-themes";

const choices = [
  { value: "melearn", Icon: Palette },
  { value: "light", Icon: Sun },
  { value: "dark", Icon: Moon },
] as const;

export function ThemeToggle({ label, lightLabel = label, darkLabel = label, melearnLabel = "Melearn" }: { label: string; lightLabel?: string; darkLabel?: string; melearnLabel?: string }) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [ready, setReady] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const current = theme === "melearn" ? "melearn" : resolvedTheme === "dark" ? "dark" : "light";

  useEffect(() => {
    if (theme === "system") setTheme("melearn");
    setReady(true);
  }, [setTheme, theme]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    document.documentElement.classList.remove("theme-transitioning");
  }, []);

  function choose(next: "melearn" | "light" | "dark") {
    if (theme !== "system" && next === current) return;
    if (timer.current) clearTimeout(timer.current);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduced) document.documentElement.classList.add("theme-transitioning");
    setTheme(next);
    if (!reduced) timer.current = setTimeout(() => document.documentElement.classList.remove("theme-transitioning"), 550);
  }

  return (
    <ToggleGroup type="single" variant="outline" value={ready ? current : ""} onValueChange={(value) => { if (value === "melearn" || value === "light" || value === "dark") choose(value); }} aria-label={label} className="grid w-full auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-3">
      {choices.map(({ value, Icon }) => {
        const itemLabel = value === "melearn" ? melearnLabel : value === "dark" ? darkLabel : lightLabel;
        const surface = value === "dark" ? "bg-[#242424]" : value === "melearn" ? "bg-[#e7f6ff]" : "bg-[#f3f3f3]";
        const bubble = value === "dark" ? "bg-[#555555]" : value === "melearn" ? "bg-[#ade4ff]" : "bg-[#dddddd]";
        return <ToggleGroupItem key={value} value={value} aria-label={itemLabel} className="h-auto min-h-28 w-full flex-col items-stretch gap-3 rounded-xl px-3 py-3 whitespace-normal data-[state=on]:border-sidebar-ring data-[state=on]:bg-sidebar-accent data-[state=on]:text-sidebar-accent-foreground">
          <span aria-hidden="true" className={`flex h-12 flex-col justify-center gap-2 rounded-md px-3 ${surface}`}><span className={`h-2 w-2/3 rounded ${bubble}`} /><span className={`h-2 w-1/2 self-end rounded ${bubble}`} /></span>
          <span className="flex items-center gap-2 text-sm"><Icon className="size-4" />{itemLabel}</span>
        </ToggleGroupItem>;
      })}
    </ToggleGroup>
  );
}
