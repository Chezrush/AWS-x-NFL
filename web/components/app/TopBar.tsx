"use client";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronRight, Moon, Search, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import CommandSearch from "./CommandSearch";

export default function TopBar() {
  const t = useTranslations("Shell");
  const nav = useTranslations("Nav");
  const s = useTranslations("Studio");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const current = pathname.split("/")[1] || "overview";
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
    <header className="sticky top-0 z-30 flex min-h-18 items-center gap-3 border-b bg-background px-4 md:px-7 lg:px-9">
      <SidebarTrigger aria-label={t("toggleMenu")} className="text-muted-foreground" />
      <div className="hidden items-center gap-2 text-xs sm:flex">
        <span className="hidden text-muted-foreground lg:inline">{s("workspace")}</span><ChevronRight className="hidden size-3 text-muted-foreground lg:block" />
        <span className="font-semibold">{nav(["overview", "gameplan", "players", "defenses", "replays", "method"].includes(current) ? current : "overview")}</span>
      </div>
      <Button variant="ghost" className="ml-auto min-w-0 justify-start gap-2 text-muted-foreground md:w-64" onClick={() => setOpen(true)} aria-label={t("search")}>
        <Search className="size-4" /><span className="hidden truncate text-xs md:inline">{t("search")}</span>
        <kbd className="ml-auto hidden rounded border bg-card px-1.5 py-0.5 text-[.625rem] md:inline">⌘ K</kbd>
      </Button>
      <div className="flex items-center gap-2 border-l pl-3">
        <ToggleGroup type="single" size="sm" value={locale} aria-label={t("language")}
          onValueChange={(v) => v && router.replace({ pathname, query: Object.fromEntries(params.entries()) }, { locale: v })}>
          {routing.locales.map((l) => <ToggleGroupItem key={l} value={l} className="min-h-9 px-2.5 text-xs font-semibold uppercase">{l}</ToggleGroupItem>)}
        </ToggleGroup>
        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={t("theme")} title={t("theme")} className="text-muted-foreground">
          {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
      </div>
      <CommandSearch open={open} onOpenChange={setOpen} />
    </header>
  );
}
