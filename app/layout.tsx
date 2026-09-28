import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import { AppTheme } from "@/components/app-theme";
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
  description: "ฝึกอังกฤษและคณิตกับครู AI ที่มีคาแรกเตอร์ ถาม ขอคำใบ้ และลองทำแบบฝึกในจังหวะของคุณ · Learn with MeLearn.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const viewer = await getViewer();
  return (
    <html lang={viewer.locale === "en" ? "en" : "th"} className={cn("font-sans", noto.variable)} suppressHydrationWarning>
      <body className="antialiased">
        <AppTheme>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </AppTheme>
      </body>
    </html>
  );
}
