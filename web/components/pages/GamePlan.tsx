"use client";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PlayerLink from "@/components/app/PlayerLink";
import Metric from "@/components/app/Metric";
import { Link } from "@/i18n/navigation";
import type { DefenseTendencies, GamePlan as GP, TeamsData } from "@/lib/data";

const DOWNS = ["1", "2", "3", "4"] as const;
const DISTS = ["short", "medium", "long"] as const;

function Pick({ id, label, value, set, children }: { id: string; label: string; value: string; set: (v: string) => void; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-muted-foreground">{label}</label>
      <Select value={value} onValueChange={set}>
        <SelectTrigger id={id} className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent><SelectGroup>{children}</SelectGroup></SelectContent>
      </Select>
    </div>
  );
}

export default function GamePlan({ gp, tend, teams }: { gp: GP; tend: DefenseTendencies; teams: TeamsData | null }) {
  const t = useTranslations("Plan");
  const c = useTranslations("Coverage");
  const pos = useTranslations("Pos");
  const locale = useLocale();
  const offenses = useMemo(() => Object.keys(gp.top_receivers).sort(), [gp]);
  const defenses = useMemo(() => Object.keys(gp.dominant).sort(), [gp]);
  const [off, setOff] = useState("ARI");
  const [def, setDef] = useState("CAR");
  const [down, setDown] = useState("3");
  const [dist, setDist] = useState("long");

  const isAll = down === "all";
  const key = isAll ? "all" : `${down}_${dist}`;
  const dom = gp.dominant[def]?.[key];
  const team = tend.teams[def];
  const situ = team?.situations[key];
  const leagueSitu = isAll ? tend.LEAGUE : tend.LEAGUE.situations[key];
  const fallback = !!dom && dom.basis !== "situation";
  const lowSample = !!dom && !fallback && dom.n < 15;
  const topCov = fallback || isAll ? team?.top_coverage : (situ?.top_coverage ?? team?.top_coverage);
  const type = dom?.type ?? "zone";
  const receivers = gp.top_receivers[off]?.[type] ?? [];
  const pctMan = dom?.pct_man ?? 0;
  const nf0 = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const sgn = (x: number, d = 1) => new Intl.NumberFormat(locale, { minimumFractionDigits: d, maximumFractionDigits: d, signDisplay: "always" }).format(x);
  const first = receivers[0];
  const situationName = t("situationName", { down: isAll ? "all" : down, dist: isAll ? "all" : dist });
  const summary = first
    ? t(isAll ? "summaryAll" : "summary", { defense: def, situation: situationName, pct: nf0.format(type === "man" ? pctMan : 100 - pctMan), type, player: first.name, soe: sgn(first.soe) })
    : t("noData");
  const td = teams?.teams[def]?.defense;
  const lg = teams?.league;
  const dSoe = td?.soe_allowed != null && lg?.soe_allowed != null ? td.soe_allowed - lg.soe_allowed : null;
  const dEpa = td?.epa_allowed_per_pass != null && lg?.epa_allowed_per_pass != null ? td.epa_allowed_per_pass - lg.epa_allowed_per_pass : null;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-7">
      <header className="page-heading">
        <h1>{t("title")}</h1>
        <p className="max-w-3xl text-muted-foreground">{t("intro")}</p>
      </header>
      <Card>
        <CardHeader className="border-b"><CardTitle>{t("setup")}</CardTitle></CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Pick id="off" label={t("myTeam")} value={off} set={setOff}>{offenses.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</Pick>
          <Pick id="def" label={t("opp")} value={def} set={setDef}>{defenses.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</Pick>
          <Pick id="down" label={t("down")} value={down} set={setDown}>
            <SelectItem value="all">{t("anyDown")}</SelectItem>
            {DOWNS.map((d) => <SelectItem key={d} value={d}>{t(`down${d}`)}</SelectItem>)}
          </Pick>
          <Pick id="dist" label={t("distance")} value={dist} set={setDist}>
            {DISTS.map((d) => <SelectItem key={d} value={d} disabled={isAll}>{t(d)}</SelectItem>)}
          </Pick>
        </CardContent>
      </Card>

      <section className="rounded-xl border border-primary/20 bg-primary/5 p-5 md:p-7" aria-live="polite">
        <h2 className="mb-3 text-sm font-semibold text-primary">{t("recommendation")}</h2>
        <p className="max-w-5xl text-xl font-semibold leading-relaxed tracking-tight md:text-2xl">{summary}</p>
      </section>

      {dom && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("tendency")} · {def}</CardTitle>
              <CardDescription>{c("manExplain")} {c("zoneExplain")}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex h-11 overflow-hidden rounded-lg text-sm font-semibold" role="img"
                aria-label={`${c("man")} ${nf0.format(pctMan)}% · ${c("zoneOther")} ${nf0.format(100 - pctMan)}%`}>
                <div className="num flex items-center justify-center bg-[#d9b76f] text-[#302511]" style={{ width: `${pctMan}%` }}>{pctMan >= 12 && `${c("man")} ${nf0.format(pctMan)}%`}</div>
                <div className="num flex flex-1 items-center justify-center bg-[#c8ddd2] text-[#183f30]">{100 - pctMan >= 12 && `${c("zoneOther")} ${nf0.format(100 - pctMan)}%`}</div>
              </div>
              <div className="num flex flex-wrap gap-x-6 gap-y-1">
                <span>{t("plays", { n: dom.n })}</span>
                {topCov && <span>{t("mostCommon", { cov: topCov })}</span>}
                {leagueSitu && <span className="text-muted-foreground">{t("league", { pct: nf0.format(leagueSitu.pct_man) })}</span>}
              </div>
              {(fallback || lowSample) && (
                <Alert>
                  <TriangleAlert />
                  <AlertTitle>{fallback ? t("alertTitle") : t("lowSampleTitle")}</AlertTitle>
                  <AlertDescription>{fallback ? t("alertFallback", { defense: def }) : t("alertLow", { n: dom.n })}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("target")} · {off}</CardTitle>
              <CardDescription>{t("targetSub", { type })}</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="flex flex-col gap-2">
                {receivers.map((r, i) => (
                  <li key={r.nflId} className="flex flex-wrap items-center gap-3 border-b py-4 first:pt-0 last:border-0 last:pb-0">
                    <span className="num flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <PlayerLink id={r.nflId} className="block text-base">{r.name}</PlayerLink>
                      <div className="num flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        {pos(r.position)} · {t("routes", { n: r.n })}
                        {r.low_n && <Badge variant="outline">{t("lowN")}</Badge>}
                      </div>
                    </div>
                    <div className="num ml-11 text-right text-2xl font-semibold text-primary sm:ml-0">{sgn(r.soe)}<span className="ml-1 text-sm font-medium text-muted-foreground">{t("yds")}</span></div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          {td && lg && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>{t("glanceTitle", { defense: def })}</CardTitle>
                <CardDescription>{t("glanceDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-muted/40 p-5">
                  <Metric id="rank" label={t("glanceRank")} />
                  <div className="num text-3xl font-extrabold">{td.rank_soe_allowed ?? "—"}<span className="text-base font-medium text-muted-foreground"> / 32</span></div>
                  <div className="text-sm text-muted-foreground">{t("glanceRankHelp")}</div>
                </div>
                <div className="rounded-lg bg-muted/40 p-5">
                  <Metric id="soe_allowed" label={t("glanceSoe")} />
                  <div className={`num text-3xl font-extrabold ${dSoe != null && dSoe > 0 ? "text-primary" : "text-destructive"}`}>{dSoe == null ? "—" : sgn(dSoe, 2)}</div>
                  <div className="text-sm text-muted-foreground">{t("glanceVsLeague")}</div>
                </div>
                <div className="rounded-lg bg-muted/40 p-5">
                  <Metric id="epa_allowed" label={t("glanceEpa")} />
                  <div className={`num text-3xl font-extrabold ${dEpa != null && dEpa > 0 ? "text-primary" : "text-destructive"}`}>{dEpa == null ? "—" : sgn(dEpa, 2)}</div>
                  <div className="text-sm text-muted-foreground">{t("glanceVsLeague")}</div>
                </div>
                <Link href={{ pathname: "/defenses", query: { team: def } }} className="text-sm font-semibold text-primary underline-offset-4 hover:underline sm:col-span-3">{t("glanceLink", { defense: def })} →</Link>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
