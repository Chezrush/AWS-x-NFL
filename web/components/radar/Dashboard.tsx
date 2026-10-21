"use client";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, ArrowUpRight, CalendarDays, Info, Shield, Users } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import Leaderboard from "@/components/radar/Leaderboard";
import FieldReplay from "@/components/radar/FieldReplay";
import CoachLeaderboard from "@/components/overview/CoachLeaderboard";
import Replays from "@/components/pages/Replays";
import type { AllData } from "@/lib/data";
import type { FeaturedPlay, Leaderboard as LB } from "@/lib/radar";

export default function Dashboard({ fallback, initialRadar: radar }: { fallback: AllData | null; initialRadar: {lb: LB; plays: FeaturedPlay[]} | null }) {
  const t = useTranslations("Radar");
  const s = useTranslations("Studio");
  const m = useTranslations("Meta");
  const locale = useLocale();
  const nf = new Intl.NumberFormat(locale);
  const f1 = new Intl.NumberFormat(locale, {maximumFractionDigits: 1});
  const f2 = new Intl.NumberFormat(locale, {maximumFractionDigits: 2, signDisplay: "always"});
  const stats: {value: string; label: string; note: string; help?: string}[] = radar ? [
    {value: `+${f1.format(radar.lb.meta.mismatch_sep_gain)} yd`, label: t("kpiGain"), note: s("mismatch"), help: t("kpiGainHelp")},
    {value: `${f2.format(radar.lb.meta.epa_when_optimal)} vs ${f2.format(radar.lb.meta.epa_when_not_optimal)} EPA`, label: t("kpiIgnore"), note: s("modelReference"), help: t("kpiIgnoreHelp", {pct: f1.format(radar.lb.meta.qb_ignores_optimal_pct), baseline: f1.format(radar.lb.meta.qb_ignores_random_baseline_pct)})},
    {value: nf.format(radar.lb.meta.plays), label: s("plays"), note: s("passOnly")},
    {value: nf.format(radar.lb.meta.routes), label: s("routes"), note: s("allPositions")},
  ] : fallback ? [
    {value: nf.format(fallback.players.meta.n_plays), label: s("plays"), note: s("passOnly")},
    {value: nf.format(fallback.players.meta.n_routes), label: s("routes"), note: s("routesNote")},
    {value: nf.format(fallback.players.meta.n_players), label: s("players"), note: s("positionsNote")},
    {value: nf.format(fallback.overlooked.meta.n_overlooked), label: s("overlooked"), note: s("overlookedNote")},
  ] : [];
  return <div className="flex flex-col gap-6">
    <header className="page-heading !mb-0 flex flex-wrap items-start justify-between gap-5">
      <div><h1>{s("title")}</h1><p>{s("intro")}</p></div>
      <Button asChild className="gap-2"><Link href="/gameplan">{s("prepare")}<ArrowRight className="size-4" /></Link></Button>
    </header>
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-2"><CalendarDays className="size-3.5" />{m("season")}</span>
      <span className="rounded-md border bg-card px-2 py-1 font-medium">{radar ? "Optimal Target Score" : "Separation Over Expected"}</span>
      <Link href="/method" className="ml-auto inline-flex items-center gap-1.5 hover:text-primary">{s("methodLink")}<ArrowUpRight className="size-3" /></Link>
    </div>
    {stats.length > 0 && <div className="dashboard-stats">{stats.map((k,i)=><div className="dashboard-stat" key={k.label}>
      <div className="dashboard-stat-label">{k.label}{k.help && <Tooltip><TooltipTrigger asChild><button aria-label={k.label} type="button"><Info className="size-3.5" /></button></TooltipTrigger><TooltipContent className="max-w-72">{k.help}</TooltipContent></Tooltip>}</div>
      <div className={`dashboard-stat-value num ${i===3 ? "text-primary" : ""}`}>{k.value}</div><div className="dashboard-stat-note">{k.note}</div>
    </div>)}</div>}
    {radar ? <div className="radar-grid">{radar.plays.length > 0 && <FieldReplay plays={radar.plays} />}<Leaderboard players={radar.lb.players} /></div>
      : fallback ? <div className="radar-grid"><Replays replays={fallback.replays} compact /><CoachLeaderboard data={fallback.players} /></div>
      : <div role="alert" className="rounded-xl border bg-card p-8 text-sm text-muted-foreground">{s("dataUnavailable")}</div>}
    <div className="flex flex-col gap-5 rounded-xl bg-secondary px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
      <div><h2 className="text-base font-bold text-secondary-foreground">{s("nextTitle")}</h2><p className="mt-1 text-sm text-secondary-foreground">{s("nextDesc")}</p></div>
      <div className="flex flex-wrap gap-3"><Button asChild variant="outline"><Link href="/defenses"><Shield className="size-4" />{s("scoutDefense")}</Link></Button><Button asChild variant="ghost"><Link href="/players"><Users className="size-4" />{s("comparePlayers")}</Link></Button></div>
    </div>
    <details className="note-disclosure"><summary>{s("readingNote")}</summary><p>{radar ? t("honesty") : s("soeNote")}</p></details>
  </div>;
}
