"use client";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { PlayersMeta, Validation } from "@/lib/data";
import Metric from "@/components/app/Metric";

type Mode = "all" | "man" | "zone";
type Metr = "completion" | "epa";

export default function Proof({ v, meta }: { v: Validation; meta: PlayersMeta }) {
  const t = useTranslations("Proof");
  const c = useTranslations("Coverage");
  const locale = useLocale();
  const [mode, setMode] = useState<Mode>("all");
  const [metric, setMetric] = useState<Metr>("completion");
  const nf = new Intl.NumberFormat(locale);
  const pf = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 });
  const df = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const ef = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: "always" });
  const terc = mode === "all" ? v.epa_terciles : v.epa_by_coverage[mode];
  const delta = v.epa_by_coverage.man.high.epa - v.epa_by_coverage.man.low.epa;
  const maxEpa = Math.max(0.6, ...(["man", "zone"] as const).flatMap((m) => (["low", "mid", "high"] as const).map((k) => Math.abs(v.epa_by_coverage[m][k].epa))));
  const color = { low: "bg-destructive", mid: "bg-chart-4", high: "bg-primary" } as const;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl leading-snug md:text-2xl">{t("claim", { delta: df.format(delta) })}</CardTitle>
        <CardDescription className="text-base">{t("claimSub")}</CardDescription>
        <div className="flex flex-wrap gap-2 pt-2">
          <ToggleGroup type="single" variant="outline" value={metric} onValueChange={(m) => m && setMetric(m as Metr)} aria-label={t("metric")}>
            <ToggleGroupItem value="completion" className="px-3">{t("metricCompletion")}</ToggleGroupItem>
            <ToggleGroupItem value="epa" className="px-3">{t("metricEpa")}</ToggleGroupItem>
          </ToggleGroup>
          <ToggleGroup type="single" variant="outline" value={mode} onValueChange={(m) => m && setMode(m as Mode)} aria-label={t("toggle")}>
            <ToggleGroupItem value="all" className="px-3">{t("all")}</ToggleGroupItem>
            <ToggleGroupItem value="man" className="px-3">{c("man")}</ToggleGroupItem>
            <ToggleGroupItem value="zone" className="px-3">{c("zone")}</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {metric === "epa" && <p className="text-sm text-muted-foreground"><Metric id="epa" label="EPA" /> — {t("epaExplain")}</p>}
        <div className="grid gap-4 md:grid-cols-3">
          {(["low", "mid", "high"] as const).map((k) => {
            const r = terc[k];
            return (
              <div key={k} className="flex flex-col gap-1 rounded-lg bg-muted/40 p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold">{t(k)}</span>
                  <span className="num text-sm text-muted-foreground">{t("n", { n: nf.format(r.n) })}</span>
                </div>
                {metric === "completion" ? (
                  <>
                    <div className="num text-4xl font-extrabold">{pf.format(r.completion)}</div>
                    <div className="h-3 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${t(k)} ${pf.format(r.completion)}`}>
                      <div className={`h-full rounded-full ${color[k]}`} style={{ width: `${r.completion * 100}%` }} />
                    </div>
                    <span className="text-sm text-muted-foreground">{t("completion")}</span>
                  </>
                ) : (
                  <>
                    <div className={`num text-4xl font-extrabold ${r.epa < 0 ? "text-destructive" : ""}`}>{ef.format(r.epa)}</div>
                    <div className="relative h-3 rounded-full bg-muted" role="img" aria-label={`${t(k)} ${ef.format(r.epa)}`}>
                      <div className="absolute left-1/2 top-0 h-full w-px bg-muted-foreground" />
                      <div className={`absolute top-0 h-full ${r.epa < 0 ? "right-1/2 rounded-l-full" : "left-1/2 rounded-r-full"} ${color[k]}`}
                        style={{ width: `${(Math.abs(r.epa) / maxEpa) * 50}%` }} />
                    </div>
                    <span className="text-sm text-muted-foreground">{t("epaLabel")}</span>
                  </>
                )}
              </div>
            );
          })}
        </div>
        <p className="border-t pt-3 text-sm text-muted-foreground">
          {t("caution", { n: nf.format(v.n_targeted_routes), from: meta.week_from, to: meta.week_to })}
        </p>
      </CardContent>
    </Card>
  );
}
