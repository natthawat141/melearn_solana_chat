"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { LogIn, Search, SquarePen, ChevronRight, X, GraduationCap } from "lucide-react";
import { ChatHistoryActions } from "@/components/chat-history-actions";
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
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { groupChatHistory, type ChatHistoryItem, type HistoryGroup } from "@/lib/chat-groups";
import { t } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

const groupLabel: Record<HistoryGroup, "history.today" | "history.yesterday" | "history.week" | "history.month" | "history.older"> = {
  today: "history.today",
  yesterday: "history.yesterday",
  week: "history.week",
  month: "history.month",
  older: "history.older",
};

export function AppShell({ locale, history, isAuthenticated, user, children }: { locale: Locale; history: ChatHistoryItem[]; isAuthenticated: boolean; user: Account | null; children: React.ReactNode }) {
  const pathname = usePathname();
  const chat = pathname.startsWith("/learn") || pathname.startsWith("/chats") || pathname.startsWith("/chat");

  return (
    <SidebarProvider style={{ "--sidebar-width": "17rem", "--sidebar-width-icon": "3.5rem" } as React.CSSProperties} className={`melearn-app min-w-0 ${chat ? "h-dvh min-h-0! overflow-hidden" : "min-h-dvh"}`}>
      <Sidebar collapsible="icon" className="melearn-sidebar">
        <SidebarHeader className="h-16 flex-row items-center gap-2 px-4 py-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-1">
          <Link href="/chat" className="shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring group-data-[collapsible=icon]:hidden" aria-label={locale === "th" ? "แชต Melearn Chat" : "Melearn Chat"}>
            <Image src="/brand/logo.png" alt="Melearn Chat" width={64} height={44} className="h-11 w-16 object-contain" />
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
          <SidebarGroup className="px-3 pb-0 group-data-[collapsible=icon]:px-2">
            <TeacherHomeNav locale={locale} />
          </SidebarGroup>
          <SidebarGroup className="min-h-0 flex-1 px-3 pb-3 group-data-[collapsible=icon]:px-2">
            <ChatHistory locale={locale} items={history} isAuthenticated={isAuthenticated} />
          </SidebarGroup>
        </SidebarContent>
        <AppSidebarFooter locale={locale} isAuthenticated={isAuthenticated} user={user} />
      </Sidebar>
      <SidebarInset className={chat ? "flex h-dvh min-h-0 min-w-0 flex-col overflow-hidden bg-background" : "min-w-0 bg-background"}>
        <header className={`${pathname.startsWith("/chat") ? "hidden" : "flex"} h-14 shrink-0 items-center gap-2 px-3 md:hidden`}>
          <SidebarTrigger className="size-11 md:hidden" />
        </header>
        <div className={chat ? "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden" : "min-w-0 flex-1 pb-8"}>{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function TeacherHomeNav({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const label = locale === "th" ? "เลือกผู้สอน" : "Choose a teacher";
  const active = pathname === "/app" || pathname.startsWith("/teachers/");
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={active} tooltip={label} className="h-10 gap-3 rounded-lg px-3 text-sm! font-normal data-active:font-medium group-data-[collapsible=icon]:mx-auto">
          <Link href="/app" aria-current={pathname === "/app" ? "page" : undefined} onClick={() => setOpenMobile(false)}>
            <GraduationCap />
            <span className="group-data-[collapsible=icon]:hidden">{label}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
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
    <SidebarGroupContent className="flex h-full min-h-0 flex-col gap-2">
      {isAuthenticated ? (
        <>
          <SidebarMenu className="gap-1">
            <SidebarMenuItem>
              <SidebarMenuButton asChild size="lg" tooltip={t(locale, "history.new")} className="h-10 gap-3 rounded-lg px-3 text-sm! text-sidebar-foreground hover:bg-sidebar-accent group-data-[collapsible=icon]:mx-auto">
                <Link href="/chat/new" onClick={() => setOpenMobile(false)}>
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
              className="h-9 rounded-lg border-0 text-sm! bg-sidebar-accent/40 pl-9 shadow-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/40"
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
                  <SidebarGroupLabel className="mt-4 h-7 px-3 text-xs font-normal">{t(locale, groupLabel[section.group])}</SidebarGroupLabel>
                  <SidebarMenu>
                    {section.items.map((item) => {
                      const current = pathname === item.href;
                      return (
                        <SidebarMenuItem key={item.id} className="group/history-row">
                          <SidebarMenuButton
                            asChild
                            isActive={current}
                            tooltip={item.preview || item.subtitle}
                            className="h-10 rounded-lg py-2 pl-3 pr-10 text-sm! font-normal data-active:font-medium"
                          >
                            <Link href={item.href} aria-current={current ? "page" : undefined} onClick={() => setOpenMobile(false)}>
                              <span className="min-w-0 truncate">{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                          <ChatHistoryActions item={item} locale={locale} current={current} />
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
    <SidebarFooter className="gap-2 px-3 pb-3 pt-2 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-2">
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
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild isActive={pathname.startsWith("/profile")} tooltip={t(locale, "nav.profile")} className="h-12 gap-2 rounded-lg px-2 py-2 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-10!">
            <Link href="/profile" aria-current={pathname.startsWith("/profile") ? "page" : undefined} onClick={() => setOpenMobile(false)}>
              <ProfileAvatar name={user?.displayName ?? ""} src={user?.avatarUrl} className="size-8" />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5 group-data-[collapsible=icon]:hidden">
                <span className="truncate text-sm font-medium">{user?.displayName || t(locale, "nav.profile")}</span>
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
