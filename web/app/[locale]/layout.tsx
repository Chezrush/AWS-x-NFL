import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Manrope } from "next/font/google";
import { routing } from "@/i18n/routing";
import "../globals.css";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import SwRegister from "./components/SwRegister";
import AppSidebar from "@/components/app/AppSidebar";
import TopBar from "@/components/app/TopBar";
import PlayerDrawer from "@/components/app/PlayerDrawer";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Meta" });
  return {
    title: t("title"),
    description: t("description"),
    appleWebApp: { capable: true, title: t("title") },
    icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
  };
}

export const viewport: Viewport = { themeColor: "#172b23", width: "device-width", initialScale: 1 };

const themeInit = `try{document.documentElement.classList.toggle("dark",localStorage.getItem("theme")==="dark")}catch(e){}`;

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const tMeta = await getTranslations({ locale, namespace: "Meta" });

  return (
    <html data-scroll-behavior="smooth" lang={locale} className={manrope.variable} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeInit }} /></head>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-card focus:p-3">{tMeta("skip")}</a>
        <NextIntlClientProvider>
          <SwRegister />
          <TooltipProvider>
            <SidebarProvider style={{ "--sidebar-width": "15.5rem", "--sidebar-width-icon": "4rem" } as React.CSSProperties}>
              <Suspense><AppSidebar /></Suspense>
              <SidebarInset>
                <Suspense><TopBar /></Suspense>
                <div id="main-content" className="app-content flex-1"><div className="mx-auto max-w-[1440px]">{children}</div></div>
              </SidebarInset>
            </SidebarProvider>
            <Suspense><PlayerDrawer /></Suspense>
          </TooltipProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
