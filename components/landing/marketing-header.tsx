"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { landingCopy } from "@/content/landing";
import type { Locale } from "@/lib/types";

export function MarketingHeader({ locale, signedIn }: { locale: Locale; signedIn: boolean }) {
  const copy = landingCopy(locale);
  const [open, setOpen] = useState(false);

  return (
    <header className="m-header">
      <div className="m-container m-header-inner">
        <Link className="m-brand-logo" href="/" aria-label={locale === "th" ? "หน้าแรก" : "Home"}>
          <Image src="/brand/logo.png" alt="MeLearn Chat" width={68} height={68} priority />
        </Link>
        <nav id="marketing-navigation" aria-label={locale === "th" ? "เมนูหลัก" : "Main navigation"} className={`m-nav ${open ? "is-open" : ""}`}>
          <Link href="/#teachers" onClick={() => setOpen(false)}>{copy.nav.teachers}</Link>
          <Link href="/#how-it-works" onClick={() => setOpen(false)}>{copy.nav.how}</Link>
          <Link href="/#pricing" onClick={() => setOpen(false)}>{copy.nav.pricing}</Link>
          <Link className="m-mobile-login" href={signedIn ? "/app" : "/login"} onClick={() => setOpen(false)}>{signedIn ? copy.nav.resume : copy.nav.login}</Link>
        </nav>
        <div className="m-header-actions">
          <LanguageSwitcher locale={locale} />
          <span className="m-header-divider" aria-hidden="true" />
          {!signedIn && <Link className="m-login-link" href="/login">{copy.nav.login}</Link>}
          <Link className="m-button m-button-small m-header-cta" href="/app">
            {signedIn ? copy.nav.resume : copy.nav.start}<ArrowUpRight size={16} aria-hidden="true" />
          </Link>
          <button type="button" className="m-icon-button m-menu-toggle" aria-expanded={open} aria-controls="marketing-navigation" aria-label={open ? copy.nav.close : copy.nav.menu} onClick={() => setOpen(!open)}>
            {open ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </div>
    </header>
  );
}
