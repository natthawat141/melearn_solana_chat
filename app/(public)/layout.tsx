import { MarketingHeader } from "@/components/landing/marketing-header";
import { MarketingFooter } from "@/components/landing/marketing-footer";
import { getViewer } from "@/lib/viewer";
import "@/components/landing/landing.css";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  return (
    <div className="marketing">
      <a className="m-skip" href="#main-content">{viewer.locale === "th" ? "ข้ามไปเนื้อหา" : "Skip to content"}</a>
      <MarketingHeader locale={viewer.locale} signedIn={Boolean(viewer.user)} />
      <div className="m-scroll-progress" aria-hidden="true" />
      {children}
      <MarketingFooter locale={viewer.locale} />
    </div>
  );
}
