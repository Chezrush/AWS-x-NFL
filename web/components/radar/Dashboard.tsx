"use client";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import Leaderboard from "@/components/radar/Leaderboard";
import FieldReplay from "@/components/radar/FieldReplay";
import type { FeaturedPlay, Leaderboard as LB } from "@/lib/radar";

const NEON = "#39FF14";

export default function Dashboard() {
  const t = useTranslations("Radar");
  const locale = useLocale();
  const [lb, setLb] = useState<LB | null>(null);
  const [plays, setPlays] = useState<FeaturedPlay[] | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [a, b] = await Promise.all([fetch("/data/leaderboard.json"), fetch("/data/featured_plays.json")]);
        if (!a.ok || !b.ok) throw new Error("fetch");
        setLb((await a.json()) as LB);
        setPlays((await b.json()) as FeaturedPlay[]);
      } catch { setErr(true); }
    };
    void load();
  }, []);

  const nf = new Intl.NumberFormat(locale);
  const f1 = new Intl.NumberFormat(locale, { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  const f0 = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const m = lb?.meta;

  const kpis = m ? [
    { v: `+${f1.format(m.mismatch_sep_gain)} yd`, l: t("kpiGain"), h: t("kpiGainHelp") },
    { v: `${f0.format(m.qb_ignores_optimal_pct)}%`, l: t("kpiIgnore"), h: t("kpiIgnoreHelp") },
    { v: `${nf.format(m.plays)} / ${nf.format(m.routes)}`, l: t("kpiVolume"), h: t("kpiVolumeHelp", { n: nf.format(m.mismatch_routes) }) },
    { v: `${f0.format(m.ots_mismatch_avg)} vs ${f0.format(m.ots_other_avg)}`, l: t("kpiOts"), h: t("kpiOtsHelp") },
  ] : [];

  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-4">
      <header>
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: NEON }}>{t("kicker")}</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight md:text-3xl">{t("title")}</h1>
        <p className="mt-1 max-w-4xl text-sm text-muted-foreground">
          {t("pitch")}{" "}
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="inline-flex items-center gap-1 font-semibold text-foreground underline decoration-dotted">
                {t("otsName")}<Info className="size-3.5" aria-hidden />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-sm text-sm">{t("otsDef")}</TooltipContent>
          </Tooltip>
        </p>
        <p className="mt-1 max-w-4xl text-xs text-muted-foreground">{t("otsDef")}</p>
      </header>

      {err && <p role="alert" className="rounded-lg border border-destructive p-3 text-sm">{t("loadError")}</p>}
      {!err && !lb && <p className="text-sm text-muted-foreground">{t("loading")}</p>}

      {m && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {kpis.map((k) => (
            <Card key={k.l} size="sm" title={k.h}>
              <CardContent>
                <div className="num text-2xl font-extrabold md:text-3xl" style={{ color: NEON }}>{k.v}</div>
                <div className="text-sm font-semibold">{k.l}</div>
                <div className="text-xs text-muted-foreground">{k.h}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {lb && plays && (
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <Leaderboard players={lb.players} />
          {plays.length > 0 ? <FieldReplay plays={plays} /> : <p className="text-sm text-muted-foreground">{t("noPlays")}</p>}
        </div>
      )}
      <p className="text-xs text-muted-foreground">{t("honesty")}</p>
    </div>
  );
}
