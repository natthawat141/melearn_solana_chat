"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { ThemeProvider, useTheme } from "next-themes";

const themedPrefixes = ["/app", "/chat", "/chats", "/learn", "/learning", "/profile", "/teachers", "/unlock", "/login"];
const themeDefaultKey = "melearn-theme-default";

function MelearnDefaultTheme() {
  const { setTheme } = useTheme();
  useEffect(() => {
    try {
      if (window.localStorage.getItem(themeDefaultKey) === "melearn") return;
      window.localStorage.setItem(themeDefaultKey, "melearn");
    } catch {
      return;
    }
    setTheme("melearn");
  }, [setTheme]);
  return null;
}

export function AppTheme({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const allowThemeChoice = themedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  return (
    <ThemeProvider attribute="class" defaultTheme="melearn" enableSystem={false} themes={["melearn", "light", "dark"]} forcedTheme={allowThemeChoice ? undefined : "light"}>
      <MelearnDefaultTheme />
      {children}
    </ThemeProvider>
  );
}
