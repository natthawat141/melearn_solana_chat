import type { Metadata, Viewport } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import { AppTheme } from "@/components/app-theme";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getViewer } from "@/lib/viewer";
import "katex/dist/katex.min.css";
import "./globals.css";
import { cn } from "@/lib/utils";

const noto = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "600", "700"],
  variable: "--font-noto",
});

export const viewport: Viewport = {
  themeColor: "#eaf7ff",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://chat.melearn.io"),
  applicationName: "Melearn Chat",
  title: {
    default: "Melearn Chat",
    template: "%s · Melearn Chat",
  },
  description: "Practice English and math with an AI tutor, at your own pace.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Melearn Chat",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/pwa-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/pwa-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    url: "https://chat.melearn.io",
    siteName: "Melearn Chat",
    title: "Melearn Chat — Learn through conversation",
    description: "Practice English and math with an AI tutor, at your own pace.",
    locale: "en_US",
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: "Melearn Chat — Learn through conversation" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Melearn Chat — Learn through conversation",
    description: "Practice English and math with an AI tutor, at your own pace.",
    images: ["/opengraph-image.png"],
  },
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
