"use client";
import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { LeaderPlayer } from "@/lib/radar";

type Filter = "all" | "WR" | "TE" | "RB";
type SortKey = "displayName" | "position" | "avg_ots" | "optimal_target_rate" | "unexploited_rate" | "routes_run" | "mismatch_win_rate";
const NEON = "var(--primary)";

export default function Leaderboard({ players }: { players: LeaderPlayer[] }) {
  const t = useTranslations("Radar");
  const locale = useLocale();
  const [pos, setPos] = useState<Filter>("all");
  const [mm, setMm] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "unexploited_rate", dir: -1 });
  const f1 = new Intl.NumberFormat(locale, { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  const f0 = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const fd = new Intl.NumberFormat(locale, { maximumFractionDigits: 1, minimumFractionDigits: 1, signDisplay: "always" });

  const key: SortKey = mm && sort.key === "unexploited_rate" ? "mismatch_win_rate" : sort.key;
  const rows = useMemo(() => {
    const list = players.filter((p) => (pos === "all" || p.position === pos) &&
      (mm ? p.mismatch_routes >= 5 && p.routes_run >= 10 : p.routes_run >= 30));
    const dir = sort.dir;
    return list.sort((a, b) => {
      const x = a[key], y = b[key];
      return (typeof x === "string" ? x.localeCompare(y as string) : (x as number) - (y as number)) * dir;
    }).slice(0, 60);
  }, [players, pos, mm, key, sort.dir]);

  const th = (k: SortKey, label: string, cls = "") => (
    <th scope="col" className={`px-2 py-2 font-semibold ${cls}`} aria-sort={key === k ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <button type="button" onClick={() => setSort((s) => ({ key: k, dir: (key === k ? -s.dir : -1) as 1 | -1 }))}
        className="inline-flex items-center gap-0.5 hover:text-foreground">
        {label}{key === k && (sort.dir === 1 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
      </button>
    </th>
  );
  const filters: Filter[] = ["all", "WR", "TE", "RB"];

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>{t("lbTitle")}</CardTitle>
        <CardDescription>{t("lbDesc")}</CardDescription>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {filters.map((f) => (
            <Button key={f} size="sm" variant={pos === f ? "default" : "outline"} aria-pressed={pos === f} onClick={() => setPos(f)}>
              {f === "all" ? t("all") : f}
            </Button>
          ))}
          <Button size="sm" variant={mm ? "default" : "outline"} aria-pressed={mm} onClick={() => setMm((v) => !v)}
            style={mm ? { background: NEON, color: "var(--primary-foreground)" } : undefined}>{t("mismatchOnly")}</Button>
        </div>
        <p className="text-xs text-muted-foreground">{mm ? t("minMismatch") : t("minRoutes")}</p>
      </CardHeader>
      <CardContent className="max-h-[560px] overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-card text-xs text-muted-foreground">
            <tr>
              {th("displayName", t("colPlayer"))}
              {th("position", t("colPos"))}
              {th("avg_ots", t("colOts"), "text-right")}
              {th("optimal_target_rate", t("colBestVsActual"))}
              {th("unexploited_rate", t("colDelta"), "text-right")}
              {mm && th("mismatch_win_rate", t("colMmWin"), "text-right")}
              {th("routes_run", t("colN"), "text-right")}
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.nflId} className="border-t border-border/60">
                <td className="px-2 py-3"><div className="font-semibold">{p.displayName}</div><div className="text-xs text-muted-foreground">{p.team}</div></td>
                <td className="px-2 py-3">{p.position}</td>
                <td className="num px-2 py-3 text-right font-bold">{f0.format(p.avg_ots)}</td>
                <td className="px-2 py-3" title={t("bestVsActualTitle", { best: f1.format(p.optimal_target_rate), actual: f1.format(p.actual_target_rate) })}>
                  <div className="flex items-center gap-1.5">
                    <div className="hidden flex-col gap-0.5" aria-hidden>
                      <div className="h-1.5 rounded-full" style={{ width: `${Math.min(100, p.optimal_target_rate * 2.5)}%`, background: NEON }} />
                      <div className="h-1.5 rounded-full bg-muted-foreground/50" style={{ width: `${Math.min(100, p.actual_target_rate * 2.5)}%` }} />
                    </div>
                    <span className="num whitespace-nowrap text-xs">{f1.format(p.optimal_target_rate)} / {f1.format(p.actual_target_rate)}</span>
                  </div>
                </td>
                <td className="num px-2 py-3 text-right font-bold" style={{ color: p.unexploited_rate > 0 ? NEON : undefined }}>{fd.format(p.unexploited_rate)}</td>
                {mm && <td className="num px-2 py-3 text-right">{f0.format(p.mismatch_win_rate)}%</td>}
                <td className="num px-2 py-3 text-right text-muted-foreground">{mm ? `${p.mismatch_routes}/${p.routes_run}` : p.routes_run}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">{t("empty")}</td></tr>}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
