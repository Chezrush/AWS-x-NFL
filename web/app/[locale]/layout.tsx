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

export const viewport: Viewport = { themeColor: "#0a0f1a", width: "device-width", initialScale: 1 };

const themeInit = `try{var t=localStorage.getItem("theme");if(t!=="light")document.documentElement.classList.add("dark")}catch(e){document.documentElement.classList.add("dark")}`;

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

  return (
    <html lang={locale} className={`${manrope.variable} dark`} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeInit }} /></head>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <NextIntlClientProvider>
          <SwRegister />
          <TooltipProvider>
            <SidebarProvider>
              <Suspense><AppSidebar /></Suspense>
              <SidebarInset>
                <Suspense><TopBar /></Suspense>
                <div className="flex-1 p-4 md:p-6">{children}</div>
              </SidebarInset>
            </SidebarProvider>
            <Suspense><PlayerDrawer /></Suspense>
          </TooltipProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
