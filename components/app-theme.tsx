"use client";

import { usePathname } from "next/navigation";
import { ThemeProvider } from "next-themes";

const appPrefixes = ["/app", "/chats", "/learn", "/learning", "/profile", "/teachers", "/unlock"];

export function AppTheme({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const inApp = appPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} themes={["light", "dark"]} forcedTheme={inApp ? undefined : "light"}>
      {children}
    </ThemeProvider>
  );
}
