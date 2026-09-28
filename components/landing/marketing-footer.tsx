import Link from "next/link";
import Image from "next/image";
import { landingCopy } from "@/content/landing";
import type { Locale } from "@/lib/types";

export function MarketingFooter({ locale }: { locale: Locale }) {
  const copy = landingCopy(locale);
  return (
    <footer className="m-footer">
      <div className="m-container m-footer-top">
        <div><Link className="m-brand-logo m-footer-logo" href="/" aria-label={locale === "th" ? "หน้าแรก" : "Home"}><Image src="/brand/logo.png" alt="MeLearn Chat" width={88} height={88} /></Link><p>{copy.footer.tagline}</p></div>
        <nav aria-label={locale === "th" ? "เมนูท้ายหน้า" : "Footer navigation"}>
          <Link href="/#teachers">{copy.nav.teachers}</Link>
          <Link href="/#how-it-works">{copy.nav.how}</Link>
          <Link href="/#pricing">{copy.nav.pricing}</Link>
        </nav>
      </div>
      <div className="m-container m-footer-bottom"><span>{copy.footer.note}</span><span>{copy.footer.preview}</span></div>
    </footer>
  );
}
