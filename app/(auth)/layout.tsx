import Image from "next/image";
import Link from "next/link";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { getViewer } from "@/lib/viewer";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  const locale = viewer.locale;

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-5 md:px-8">
        <Link href="/" aria-label={locale === "th" ? "หน้าแรก" : "Home"}>
          <Image src="/brand/logo.png" alt="Melearn Chat" width={48} height={48} className="size-12 object-contain" priority />
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSwitcher locale={locale} />
          <ThemeToggle
            label={locale === "th" ? "ธีม" : "Theme"}
            lightLabel={locale === "th" ? "ใช้ธีมสว่าง" : "Use light theme"}
            darkLabel={locale === "th" ? "ใช้ธีมมืด" : "Use dark theme"}
          />
        </div>
      </header>
      <main id="main-content" className="flex flex-1 items-center justify-center bg-muted/30 px-4 py-10 md:py-14">
        {children}
      </main>
    </div>
  );
}
