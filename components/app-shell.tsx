"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, Home, MessageCircle, Sparkles, UserRound } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
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
  const router = useRouter();
  const marketing = pathname === "/" ;
  const chat = pathname.startsWith("/learn");

  async function setLocale(next: Locale) {
    await fetch("/api/preferences", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ locale: next }),
    });
    router.refresh();
  }

  if (marketing) return <div className="min-h-dvh bg-background text-foreground">{children}</div>;

  return (
    <SidebarProvider className={chat ? "h-dvh overflow-hidden" : "min-h-dvh"}>
      <Sidebar collapsible="offcanvas">
        <SidebarHeader>
          <Link href="/app" className="flex items-center gap-2 px-2 py-1">
            <Image src="/brand/logo.png" alt="Melearn Chat" width={36} height={36} className="size-9 object-contain" />
            <span className="font-semibold">Melearn Chat</span>
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
      <SidebarInset className={chat ? "flex h-dvh min-h-0 flex-col overflow-hidden bg-background" : "bg-background"}>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3">
          <SidebarTrigger className="size-11" />
          <div className="ml-auto flex items-center gap-2">
            <div className="flex rounded-full bg-muted p-1" role="group" aria-label={t(locale, "profile.locale")}>
              {(["th", "en"] as const).map((item) => (
                <Button key={item} type="button" size="sm" variant={locale === item ? "default" : "ghost"} aria-pressed={locale === item} onClick={() => setLocale(item)} className="min-h-11 rounded-full px-3">
                  {item === "th" ? "TH" : "EN"}
                </Button>
              ))}
            </div>
            <ThemeToggle label={locale === "en" ? "Theme" : "ธีม"} />
          </div>
        </header>
        <div className={chat ? "flex min-h-0 flex-1 flex-col overflow-hidden" : "flex-1 pb-8"}>{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
