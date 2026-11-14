import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";
import { AssistantProvider } from "@/components/assistant/AssistantProvider";
import { AssistantDock } from "@/components/assistant/AssistantDock";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import { getLocale } from "@/lib/i18n-server";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Toaster } from "sonner";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "K2 — климатические тренды Кыргызстана",
    template: "%s · K2",
  },
  description:
    "K2 — Earth System Trend Detective. Спутниковые и климатические данные Кыргызстана: тренды, значимость, FDR-поправка, карта регионов и AI-помощник. NASA Space Apps Challenge 2026.",
  keywords: [
    "Кыргызстан",
    "климат",
    "тренды",
    "NASA",
    "Mann-Kendall",
    "спутниковые данные",
    "Иссык-Куль",
    "K2",
    "Space Apps",
  ],
  authors: [{ name: "K2 team" }],
  openGraph: {
    title: "K2 — Earth System Trend Detective",
    description:
      "Что меняется в климате Кыргызстана — и почему. Тренды Манна–Кендалла, наклон Сена, FDR и AI-детектив.",
    type: "website",
    locale: "ru_RU",
    siteName: "K2",
  },
  twitter: {
    card: "summary_large_image",
    title: "K2 — Earth System Trend Detective",
    description: "Климатические тренды Кыргызстана: данные, значимость, карта и AI-помощник.",
  },
  robots: { index: true, follow: true },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "K2", statusBarStyle: "black-translucent" },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#04070d",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <LocaleProvider initialLocale={locale}>
          <AssistantProvider>
            <SiteHeader />
            <main className="min-h-[70vh]">{children}</main>
            <SiteFooter />
            <AssistantDock />
            <Toaster
              position="bottom-left"
              theme="dark"
              toastOptions={{
                style: {
                  background: "#080e18",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#e2e8f0",
                  borderRadius: "14px",
                  fontSize: "12px",
                },
              }}
            />
          </AssistantProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
