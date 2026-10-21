"use client";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Moon, Search, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import CommandSearch from "./CommandSearch";

export default function TopBar() {
  const t = useTranslations("Shell");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(true);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setOpen((o) => !o); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("theme", next ? "dark" : "light"); } catch {}
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur">
      <SidebarTrigger aria-label={t("toggleMenu")} />
      <Separator orientation="vertical" className="mx-1 h-5" />
      <Button variant="outline" className="h-9 flex-1 justify-start gap-2 text-muted-foreground sm:max-w-sm" onClick={() => setOpen(true)}>
        <Search data-icon="inline-start" />
        <span className="truncate">{t("search")}</span>
        <kbd className="ml-auto hidden rounded border bg-muted px-1.5 text-xs sm:inline">⌘K</kbd>
      </Button>
      <div className="ml-auto flex items-center gap-2">
        <ToggleGroup type="single" variant="outline" size="sm" value={locale} aria-label={t("language")}
          onValueChange={(v) => v && router.replace({ pathname, query: Object.fromEntries(params.entries()) }, { locale: v })}>
          {routing.locales.map((l) => (
            <ToggleGroupItem key={l} value={l} className="px-3 uppercase">{l}</ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Button variant="outline" size="icon" onClick={toggleTheme} aria-label={t("theme")}>
          {dark ? <Sun /> : <Moon />}
        </Button>
      </div>
      <CommandSearch open={open} onOpenChange={setOpen} />
    </header>
  );
}
