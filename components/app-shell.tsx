"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { t } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

const items = [
  { href: "/", label: "nav.home" as const, icon: "home", match: (path: string) => path === "/" || path.startsWith("/teachers") },
  { href: "/chats", label: "nav.chat" as const, icon: "chat", match: (path: string) => path.startsWith("/chats") || path.startsWith("/learn") },
  { href: "/learning", label: "nav.progress" as const, icon: "book", match: (path: string) => path.startsWith("/learning") },
  { href: "/profile", label: "nav.profile" as const, icon: "user", match: (path: string) => path.startsWith("/profile") || path.startsWith("/unlock") },
];

export function AppShell({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const chat = pathname.startsWith("/learn");
  const focus = chat || pathname.startsWith("/unlock");

  async function setLocale(next: Locale) {
    await fetch("/api/preferences", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ locale: next }),
    });
    router.refresh();
  }

  return (
    <div className={`${chat ? "h-dvh overflow-hidden" : "min-h-dvh"} md:grid md:grid-cols-[220px_minmax(0,1fr)]`}>
      <aside className="hidden border-r border-border bg-surface md:flex md:flex-col md:px-4 md:py-6">
        <Link href="/" className="flex items-center gap-3 rounded-[14px]">
          <Image src="/brand/logo.png" alt="Melearn Chat" width={48} height={48} className="size-12 object-contain" />
          <span className="font-semibold">Melearn Chat</span>
        </Link>
        <nav className="mt-8 grid gap-2" aria-label="Main">
          {items.map((item) => {
            const active = item.match(pathname);
            return (
              <Link key={item.href} href={item.href} className={`flex min-h-12 items-center gap-3 rounded-[14px] px-3 font-semibold ${active ? "bg-[#E7EDFF] text-primary" : "text-ink"}`} aria-current={active ? "page" : undefined}>
                <Icon name={item.icon} />
                {t(locale, item.label)}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className={`min-w-0 ${chat ? "flex h-full min-h-0 flex-col bg-white" : ""}`}>
        <header className={`${chat ? "hidden" : "flex"} items-center justify-between gap-3 px-5 py-4`}>
          <Link href="/" className="flex items-center gap-2 md:hidden">
            <Image src="/brand/logo.png" alt="Melearn Chat" width={40} height={40} className="size-10 object-contain" />
            <span className="font-semibold">Melearn</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex rounded-full bg-surface p-1" role="group" aria-label={t(locale, "profile.locale")}>
              {(["th", "en"] as const).map((item) => (
                <button key={item} type="button" aria-pressed={locale === item} onClick={() => setLocale(item)} className={`min-h-11 rounded-full px-3 text-sm font-semibold ${locale === item ? "bg-primary text-white" : "text-muted-foreground"}`}>
                  {item === "th" ? "TH" : "EN"}
                </button>
              ))}
            </div>
            <Link href="/profile" className="grid size-11 place-items-center rounded-full bg-surface text-primary" aria-label={t(locale, "nav.profile")}>
              <Icon name="user" />
            </Link>
          </div>
        </header>
        <main id="main" className={chat ? "flex min-h-0 flex-1 flex-col overflow-hidden" : focus ? "pb-6" : "pb-28 md:pb-10"}>
          {children}
        </main>
        <nav className={`${focus ? "hidden" : "fixed"} inset-x-0 bottom-0 z-30 border-t border-border bg-surface px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-1 md:hidden`} aria-label="Main">
          <ul className="grid grid-cols-4">
            {items.map((item) => {
              const active = item.match(pathname);
              return (
                <li key={item.href}>
                  <Link href={item.href} className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-semibold ${active ? "text-primary" : "text-muted-foreground"}`} aria-current={active ? "page" : undefined}>
                    <Icon name={item.icon} />
                    {t(locale, item.label)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}
