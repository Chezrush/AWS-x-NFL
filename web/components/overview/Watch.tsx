"use client";
import { useLocale, useTranslations } from "next-intl";
import { TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import PlayerLink from "@/components/app/PlayerLink";
import type { Overlooked } from "@/lib/data";

export default function Watch({ o, limit = 10 }: { o: Overlooked; limit?: number }) {
  const t = useTranslations("Watch");
  const pos = useTranslations("Pos");
  const locale = useLocale();
  const n0 = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const sg = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: "always" });
  const e2 = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const v = o.meta.validation.epa_overlooked_vs_rest;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("intro")} {t("how")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Alert>
          <TriangleAlert />
          <AlertTitle>{t("cautionTitle")}</AlertTitle>
          <AlertDescription>{t("caution", { a: e2.format(v.overlooked.epa_per_target), b: e2.format(v.rest.epa_per_target) })}</AlertDescription>
        </Alert>
        <ol className="grid gap-2 md:grid-cols-2">
          {o.top_overlooked.slice(0, limit).map((p, i) => (
            <li key={p.nflId} className="flex items-center gap-3 rounded-lg bg-muted/40 p-3">
              <span className="num w-5 text-lg font-bold text-muted-foreground">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate"><PlayerLink id={p.nflId}>{p.name}</PlayerLink> <span className="text-sm text-muted-foreground">{p.team} · {pos(p.position)}</span></div>
                <div className="num text-sm">{t("targets", { actual: p.targets, expected: n0.format(p.expected_targets) })} · {t("routes", { n: p.routes })}</div>
              </div>
              <div className="num text-right"><div className="text-lg font-bold text-primary">{sg.format(p.soe_all)}</div><div className="text-xs text-muted-foreground">SOE</div></div>
            </li>
          ))}
        </ol>
        <p className="text-sm text-muted-foreground">{t("min", { n: o.meta.min_routes })}</p>
      </CardContent>
    </Card>
  );
}
