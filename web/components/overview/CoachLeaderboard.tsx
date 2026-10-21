"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import PlayerLink from "@/components/app/PlayerLink";
import Metric from "@/components/app/Metric";
import { Link } from "@/i18n/navigation";
import type { PlayersSoe } from "@/lib/data";

export default function CoachLeaderboard({ data }: { data: PlayersSoe }) {
  const t = useTranslations("Studio");
  const c = useTranslations("Coverage");
  const locale = useLocale();
  const [coverage, setCoverage] = useState<"all" | "man" | "zone">("all");
  const [position, setPosition] = useState("WR");
  const soeKey = `soe_${coverage}` as const;
  const countKey = `n_${coverage}` as const;
  const rows = data.players.filter(p => p[countKey] >= data.meta.min_routes && p[soeKey] !== null && (position === "all" || p.position === position))
    .sort((a,b) => (b[soeKey] ?? 0) - (a[soeKey] ?? 0)).slice(0, 6);
  const nf = new Intl.NumberFormat(locale, { maximumFractionDigits: 2, minimumFractionDigits: 2, signDisplay: "always" });
  return <section className="min-w-0 rounded-xl border bg-card">
    <div className="p-5 pb-3">
      <div className="flex items-center justify-between gap-2"><h2 className="text-base font-bold">{t("leadersTitle")}</h2><span className="text-xs font-medium text-muted-foreground">TOP 6</span></div>
      <p className="mt-1.5 text-xs text-muted-foreground">{t("leadersDesc")}</p>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg bg-muted p-1" role="group" aria-label={t("coverageFilter")}>
          {(["all", "man", "zone"] as const).map(v => <button key={v} type="button" aria-pressed={coverage===v} onClick={()=>setCoverage(v)} className={`min-h-8 rounded-md px-3 text-xs font-semibold transition-colors ${coverage===v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{v === "all" ? t("all") : c(v)}</button>)}
        </div>
        <select aria-label={t("positionFilter")} value={position} onChange={e=>setPosition(e.target.value)} className="h-9 rounded-lg border bg-card px-2 text-xs text-foreground">
          <option value="all">{t("allPositions")}</option>{["WR","TE","RB"].map(v=><option key={v}>{v}</option>)}
        </select>
      </div>
    </div>
    <div className="overflow-x-auto px-4">
      <table className="leader-table w-full text-left text-sm">
        <thead><tr><th scope="col">{t("player")}</th><th scope="col" className="text-right"><Metric id="soe" label="SOE (yd)" /></th><th scope="col" className="text-right">{t("routes")}</th></tr></thead>
        <tbody>{rows.map((p,i)=><tr key={p.nflId}>
          <td><div className="flex items-center gap-3"><span className="num w-3 text-xs text-muted-foreground">{i+1}</span><span className="leader-avatar">{p.team}</span><div><PlayerLink id={p.nflId} className="text-[.8125rem]">{p.name}</PlayerLink><div className="mt-1 text-[.6875rem] text-muted-foreground">{p.team} · {p.position}</div></div></div></td>
          <td className="num text-right font-bold text-primary">{nf.format(p[soeKey] ?? 0)}</td><td className="num text-right text-xs text-muted-foreground">{p[countKey]}</td>
        </tr>)}
        {!rows.length && <tr><td colSpan={3} className="py-6 text-center text-muted-foreground">{t("noPlayers")}</td></tr>}</tbody>
      </table>
    </div>
    <div className="mt-1 flex flex-wrap items-center justify-between gap-3 border-t p-5">
      <p className="text-xs text-muted-foreground">{t("minRoutes", { n: data.meta.min_routes })}</p>
      <Button asChild variant="ghost" size="sm" className="text-primary"><Link href="/players">{t("allPlayers")}<ArrowUpRight className="size-3.5" /></Link></Button>
    </div>
  </section>;
}
