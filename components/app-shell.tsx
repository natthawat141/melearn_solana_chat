"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft, Home, LogIn, Search, SquarePen, ChevronRight, X } from "lucide-react";
import { ProfileAvatar } from "@/components/profile-avatar";
import type { Account } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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
];

const groupLabel: Record<HistoryGroup, "history.today" | "history.yesterday" | "history.week" | "history.month" | "history.older"> = {
  today: "history.today",
  yesterday: "history.yesterday",
  week: "history.week",
  month: "history.month",
  older: "history.older",
};

export function AppShell({ locale, history, isAuthenticated, user, children }: { locale: Locale; history: ChatHistoryItem[]; isAuthenticated: boolean; user: Account | null; children: React.ReactNode }) {
  const pathname = usePathname();
  const chat = pathname.startsWith("/learn") || pathname.startsWith("/chats");

  return (
    <SidebarProvider style={{ "--sidebar-width-icon": "4rem" } as React.CSSProperties} className={chat ? "h-dvh overflow-hidden" : "min-h-dvh"}>
      <Sidebar collapsible="icon" className="melearn-sidebar">
        <SidebarHeader className="h-[72px] flex-row items-center gap-2 border-b border-sidebar-border px-4 py-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-1">
          <Link href="/app" className="shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring group-data-[collapsible=icon]:hidden" aria-label={locale === "th" ? "หน้าหลัก Melearn Chat" : "Melearn Chat home"}>
            <Image src="/brand/logo.png" alt="Melearn Chat" width={80} height={54} className="h-[54px] w-20 object-contain" />
          </Link>
          <Tooltip>
            <TooltipTrigger asChild>
              <SidebarTrigger
                className="ml-auto size-9 rounded-xl group-data-[collapsible=icon]:mx-auto"
                aria-label={locale === "th" ? "ย่อหรือขยายแถบเมนู" : "Collapse or expand sidebar"}
              />
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10}>
              {locale === "th" ? "ย่อหรือขยายแถบเมนู" : "Collapse or expand sidebar"}
            </TooltipContent>
          </Tooltip>
          <MobileSidebarClose label={t(locale, "history.closeSidebar")} />
        </SidebarHeader>
        <SidebarContent className="overflow-auto">
          <AppNav locale={locale} />
          {isAuthenticated ? (
            <>
              <SidebarSeparator className="mx-7 my-2 group-data-[collapsible=icon]:hidden" />
              <SidebarGroup className="min-h-0 flex-1 px-4 pb-4 group-data-[collapsible=icon]:px-2">
                <ChatHistory locale={locale} items={history} isAuthenticated={isAuthenticated} />
              </SidebarGroup>
            </>
          ) : null}
        </SidebarContent>
        <AppSidebarFooter locale={locale} isAuthenticated={isAuthenticated} user={user} />
      </Sidebar>
      <SidebarInset className={chat ? "flex h-dvh min-h-0 flex-col overflow-hidden bg-background" : "bg-background"}>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3 md:hidden">
          <SidebarTrigger className="size-11 md:hidden" />
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
    <SidebarGroup className="shrink-0 px-4 pb-2 pt-5 group-data-[collapsible=icon]:px-2">
      <SidebarGroupLabel className="mb-3 h-7 justify-between px-3 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
        <span className="font-semibold">{locale === "th" ? "เมนูหลัก" : "Main menu"}</span>
        <span>{locale === "th" ? "ผู้เรียน" : "Learner"}</span>
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu className="gap-1">
          {items.map((item) => {
            const active = item.match(pathname);
            const Icon = item.icon;
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild isActive={active} size="lg" tooltip={t(locale, item.label)} className="h-11 gap-3 rounded-xl px-3 text-sm text-muted-foreground transition-colors data-active:font-semibold data-active:text-sidebar-accent-foreground group-data-[collapsible=icon]:mx-auto">
                  <Link href={item.href} aria-current={active ? "page" : undefined} onClick={() => setOpenMobile(false)}>
                    <Icon />
                    <span className="group-data-[collapsible=icon]:hidden">{t(locale, item.label)}</span>
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
  const { setOpenMobile, setOpen } = useSidebar();
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
    <SidebarGroupContent className="flex h-full min-h-0 flex-col gap-3">
      {isAuthenticated ? (
        <>
          <SidebarMenu className="gap-1">
            <SidebarMenuItem>
              <SidebarMenuButton asChild size="lg" tooltip={t(locale, "history.new")} className="h-10 gap-3 rounded-xl bg-primary/15 px-3 text-primary hover:bg-primary/20 hover:text-primary group-data-[collapsible=icon]:mx-auto">
                <Link href="/app" onClick={() => setOpenMobile(false)}>
                  <SquarePen />
                  <span className="group-data-[collapsible=icon]:hidden">{t(locale, "history.new")}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem className="hidden group-data-[collapsible=icon]:block">
              <SidebarMenuButton type="button" tooltip={t(locale, "history.search")} aria-label={t(locale, "history.search")} onClick={() => setOpen(true)} className="h-10 gap-3 rounded-xl px-3 text-muted-foreground group-data-[collapsible=icon]:mx-auto">
                <Search />
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <div className="relative mx-1 group-data-[collapsible=icon]:hidden">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <SidebarInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t(locale, "history.search")}
              aria-label={t(locale, "history.search")}
              className="h-10 rounded-xl pl-9 shadow-none focus-visible:shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
          <div className="min-h-0 flex-1 overflow-auto group-data-[collapsible=icon]:hidden">
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
                            className={`h-auto min-h-11 rounded-xl px-3 py-2 ${current ? "ring-1 ring-inset ring-primary/25 font-semibold" : ""}`}
                          >
                            <Link href={item.href} aria-current={current ? "page" : undefined} onClick={() => setOpenMobile(false)}>
                              <span className="flex min-w-0 flex-col gap-0.5">
                                <span className="truncate">{item.title}</span>
                                <span className="line-clamp-1 text-xs font-normal text-muted-foreground">{item.preview || item.subtitle}</span>
                              </span>
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

function AppSidebarFooter({ locale, isAuthenticated, user }: { locale: Locale; isAuthenticated: boolean; user: Account | null }) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  return (
    <SidebarFooter className="gap-3 px-[18px] pb-4 pt-4 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-2">
      {!isAuthenticated ? (
        <>
          <p className="px-2 text-xs leading-relaxed text-muted-foreground group-data-[collapsible=icon]:hidden">{t(locale, "history.guestTitle")}</p>
          <Button asChild className="h-10 w-full rounded-xl group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:px-0">
            <Link href={`/login?next=${encodeURIComponent(pathname)}`} onClick={() => setOpenMobile(false)}>
              <LogIn data-icon="inline-start" />
              <span className="group-data-[collapsible=icon]:hidden">{t(locale, "auth.login")}</span>
            </Link>
          </Button>
        </>
      ) : null}
      <Button asChild variant="secondary" className="h-[38px] w-full gap-2 rounded-xl bg-muted text-xs text-muted-foreground hover:bg-muted/80 group-data-[collapsible=icon]:hidden">
        <Link href="/" onClick={() => setOpenMobile(false)}>
          <ArrowLeft data-icon="inline-start" />
          {locale === "th" ? "กลับไปหน้าหลัก" : "Back to homepage"}
        </Link>
      </Button>
      <SidebarSeparator className="mx-0 group-data-[collapsible=icon]:hidden" />
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild isActive={pathname.startsWith("/profile")} tooltip={t(locale, "nav.profile")} className="h-auto min-h-16 gap-3 rounded-xl px-3 py-3 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-10!">
            <Link href="/profile" aria-current={pathname.startsWith("/profile") ? "page" : undefined} onClick={() => setOpenMobile(false)}>
              <ProfileAvatar name={user?.displayName ?? ""} src={user?.avatarUrl} />
              <span className="flex min-w-0 flex-1 flex-col gap-1 group-data-[collapsible=icon]:hidden">
                <span className="truncate font-semibold">{user?.displayName || t(locale, "nav.profile")}</span>
                <span className="text-xs font-normal text-muted-foreground">{user ? t(locale, "profile.sidebarLabel") : t(locale, "auth.login")}</span>
              </span>
              <ChevronRight aria-hidden="true" className="text-muted-foreground group-data-[collapsible=icon]:hidden" />
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  );
}

function MobileSidebarClose({ label }: { label: string }) {
  const { setOpenMobile } = useSidebar();
  return (
    <Button type="button" variant="ghost" size="icon" className="ml-auto size-7 shrink-0 rounded-full md:hidden" onClick={() => setOpenMobile(false)} aria-label={label}>
      <X aria-hidden="true" />
    </Button>
  );
}
