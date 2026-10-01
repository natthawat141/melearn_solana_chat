"use client";

import { usePathname } from "next/navigation";
import { ThemeProvider } from "next-themes";

const themedPrefixes = ["/app", "/chats", "/learn", "/learning", "/profile", "/teachers", "/unlock", "/login"];

export function AppTheme({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const allowThemeChoice = themedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} themes={["light", "dark"]} forcedTheme={allowThemeChoice ? undefined : "light"}>
      {children}
    </ThemeProvider>
  );
}
