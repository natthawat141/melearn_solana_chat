import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { AppShell } from "@/components/app-shell";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getViewer } from "@/lib/viewer";
import "./globals.css";
import { cn } from "@/lib/utils";

const noto = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "600", "700"],
  variable: "--font-noto",
});

export const metadata: Metadata = {
  title: {
    default: "Melearn Chat",
    template: "%s · Melearn Chat",
  },
  description: "ครูที่มีคาแรกเตอร์ เรียนรู้ในแบบของคุณ · AI teachers for English and math, with Solana devnet unlocks.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const viewer = await getViewer();
  return (
    <html lang={viewer.locale === "en" ? "en" : "th"} className={cn("font-sans", noto.variable)} suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TooltipProvider>
            <AppShell locale={viewer.locale}>{children}</AppShell>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
