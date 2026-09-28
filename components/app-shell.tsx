"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Home, MessageCircle, Sparkles, UserRound } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { t } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

const items = [
  { href: "/app", label: "nav.home" as const, icon: Home, match: (path: string) => path === "/app" || path.startsWith("/teachers") },
  { href: "/chats", label: "nav.chat" as const, icon: MessageCircle, match: (path: string) => path.startsWith("/chats") || path.startsWith("/learn") },
  { href: "/learning", label: "nav.progress" as const, icon: BookOpen, match: (path: string) => path.startsWith("/learning") },
  { href: "/pricing", label: "pricing.title" as const, icon: Sparkles, match: (path: string) => path.startsWith("/pricing") },
  { href: "/profile", label: "nav.profile" as const, icon: UserRound, match: (path: string) => path.startsWith("/profile") },
];

export function AppShell({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const pathname = usePathname();
  const marketing = pathname === "/" ;
  const chat = pathname.startsWith("/learn");

  if (marketing) return <div className="min-h-dvh bg-background text-foreground">{children}</div>;

  return (
    <SidebarProvider className={chat ? "h-dvh overflow-hidden" : "min-h-dvh"}>
      <Sidebar collapsible="offcanvas">
        <SidebarHeader>
          <Link href="/app" className="flex items-center px-2 py-1">
            <Image src="/brand/logo.png" alt="Melearn Chat" width={36} height={36} className="size-9 object-contain" />
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => {
                  const active = item.match(pathname);
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={active} className="min-h-11">
                        <Link href={item.href} aria-current={active ? "page" : undefined}>
                          <Icon />
                          <span>{t(locale, item.label)}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <p className="px-2 text-xs text-muted-foreground">{t(locale, "landing.freeNote")}</p>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className={chat ? "app-workspace flex h-dvh min-h-0 flex-col overflow-hidden bg-background" : "app-workspace bg-background"}>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3">
          <SidebarTrigger className="size-11" />
          <div className="ml-auto flex items-center gap-2">
            <LanguageSwitcher locale={locale} />
            <ThemeToggle label={locale === "en" ? "Theme" : "ธีม"} lightLabel={locale === "th" ? "ใช้ธีมสว่าง" : "Use light theme"} darkLabel={locale === "th" ? "ใช้ธีมมืด" : "Use dark theme"} />
          </div>
        </header>
        <div className={chat ? "flex min-h-0 flex-1 flex-col overflow-hidden" : "flex-1 pb-8"}>{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
