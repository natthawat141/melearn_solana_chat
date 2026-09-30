"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { Home, LogIn, MessageCircle, Search, SquarePen, UserRound } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { groupChatHistory, type ChatHistoryItem, type HistoryGroup } from "@/lib/chat-groups";
import { t } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

const items = [
  { href: "/app", label: "nav.home" as const, icon: Home, match: (path: string) => path === "/app" || path.startsWith("/teachers") },
  { href: "/chats", label: "history.open" as const, icon: MessageCircle, match: (path: string) => path.startsWith("/chats") || path.startsWith("/learn") },
  { href: "/profile", label: "nav.profile" as const, icon: UserRound, match: (path: string) => path.startsWith("/profile") },
];

const groupLabel: Record<HistoryGroup, "history.today" | "history.yesterday" | "history.week" | "history.month" | "history.older"> = {
  today: "history.today",
  yesterday: "history.yesterday",
  week: "history.week",
  month: "history.month",
  older: "history.older",
};

export function AppShell({ locale, history, isAuthenticated, children }: { locale: Locale; history: ChatHistoryItem[]; isAuthenticated: boolean; children: React.ReactNode }) {
  const pathname = usePathname();
  const chat = pathname.startsWith("/learn") || pathname.startsWith("/chats");

  return (
    <SidebarProvider className={chat ? "h-dvh overflow-hidden" : "min-h-dvh"}>
      <Sidebar collapsible="offcanvas">
        <SidebarHeader>
          <Link href="/app" className="flex items-center px-2 py-1">
            <Image src="/brand/logo.png" alt="Melearn Chat" width={36} height={36} className="size-9 object-contain" />
          </Link>
        </SidebarHeader>
        <SidebarContent className="overflow-hidden">
          <AppNav locale={locale} />
          <SidebarSeparator />
          <SidebarGroup className="min-h-0 flex-1 overflow-hidden">
            <ChatHistory locale={locale} items={history} isAuthenticated={isAuthenticated} />
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset className={chat ? "flex h-dvh min-h-0 flex-col overflow-hidden bg-background" : "bg-background"}>
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

function AppNav({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  return (
    <SidebarGroup className="shrink-0">
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const active = item.match(pathname);
            const Icon = item.icon;
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild isActive={active} size="lg">
                  <Link href={item.href} aria-current={active ? "page" : undefined} onClick={() => setOpenMobile(false)}>
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
  );
}

function ChatHistory({ locale, items, isAuthenticated }: { locale: Locale; items: ChatHistoryItem[]; isAuthenticated: boolean }) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const [query, setQuery] = useState("");
  const loginHref = `/login?next=${encodeURIComponent(pathname)}`;
  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const visible = needle
      ? items.filter((item) => `${item.title} ${item.subtitle} ${item.preview}`.toLowerCase().includes(needle))
      : items;
    return groupChatHistory(visible);
  }, [items, query]);

  return (
    <SidebarGroupContent className="flex h-full min-h-0 flex-col gap-2">
      {isAuthenticated ? (
        <>
          {pathname !== "/app" ? (
            <Button asChild size="lg" className="mx-1 h-10 justify-start">
              <Link href="/app" onClick={() => setOpenMobile(false)}>
                <SquarePen />
                {t(locale, "history.new")}
              </Link>
            </Button>
          ) : null}
          <div className="relative mx-1">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <SidebarInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t(locale, "history.search")}
              aria-label={t(locale, "history.search")}
              className="h-10 pl-9"
            />
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            {groups.length === 0 ? (
              <p className="px-2 py-3 text-sm text-muted-foreground">
                {query.trim() ? t(locale, "history.searchEmpty") : t(locale, "history.empty")}
              </p>
            ) : (
              groups.map((section) => (
                <div key={section.group}>
                  <SidebarGroupLabel>{t(locale, groupLabel[section.group])}</SidebarGroupLabel>
                  <SidebarMenu>
                    {section.items.map((item) => {
                      const current = pathname === item.href;
                      return (
                        <SidebarMenuItem key={item.id}>
                          <SidebarMenuButton
                            asChild
                            isActive={current}
                            tooltip={item.preview || item.subtitle}
                            className={current ? "ring-1 ring-inset ring-primary/25 font-semibold" : undefined}
                          >
                            <Link href={item.href} aria-current={current ? "page" : undefined} onClick={() => setOpenMobile(false)}>
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <div className="mt-auto p-1">
          <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/30 p-3">
            <p className="text-sm font-medium">{t(locale, "history.guestTitle")}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t(locale, "history.guestDescription")}</p>
            <Button asChild size="lg" variant="outline" className="mt-3 h-10 w-full">
              <Link href={loginHref} onClick={() => setOpenMobile(false)}>
                <LogIn />
                {t(locale, "auth.login")}
              </Link>
            </Button>
          </div>
        </div>
      )}
    </SidebarGroupContent>
  );
}
