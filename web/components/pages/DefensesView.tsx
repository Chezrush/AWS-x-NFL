"use client";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { ArrowUpRight, X } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import PlayerLink from "@/components/app/PlayerLink";
import Metric from "@/components/app/Metric";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import type { Pos, TeamsData } from "@/lib/data";

const DOWNS = ["1", "2", "3", "4"] as const;
const DISTS = ["short", "medium", "long"] as const;

export default function DefensesView({ data }: { data: TeamsData }) {
  const t = useTranslations("Defenses");
  const c = useTranslations("Coverage");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const sel = sp.get("team") && data.teams[sp.get("team")!] ? sp.get("team")! : null;
  const lg = data.league;
  const sg = (x: number | null | undefined, d = 2) => (x == null ? "—" : new Intl.NumberFormat(locale, { minimumFractionDigits: d, maximumFractionDigits: d, signDisplay: "always" }).format(x));
  const n0 = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const rows = Object.entries(data.teams).map(([k, v]) => ({ k, d: v.defense })).sort((a, b) => (a.d.rank_soe_allowed ?? 99) - (b.d.rank_soe_allowed ?? 99));
  const vs = (v: number | null | undefined, l: number | null | undefined) => (v == null || l == null ? null : v - l);
  const tone = (d: number | null) => (d == null ? "" : d > 0 ? "text-primary" : "text-destructive");

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-7">
      <header className="page-heading">
        <h1>{t("title")}</h1>
        <p className="max-w-3xl text-muted-foreground">{t("intro")}</p>
      </header>
      <div className="flex flex-col gap-2 sm:max-w-xs">
        <label htmlFor="defense-report" className="text-sm font-semibold">{t("choose")}</label>
        <Select value={sel ?? "all"} onValueChange={(value) => router.push({ pathname, query: value === "all" ? {} : { team: value } }, { scroll: false })}>
          <SelectTrigger id="defense-report" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allTitle")}</SelectItem>
            {Object.keys(data.teams).sort().map((team) => <SelectItem key={team} value={team}>{team}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {sel && <Report team={sel} data={data} />}

      <Card>
        <CardHeader>
          <CardTitle>{t("allTitle")}</CardTitle>
          <CardDescription>{t("rankNote")}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table className="min-w-[540px]">
            <TableHeader><TableRow>
              <TableHead>{t("rank")}</TableHead><TableHead>{t("team")}</TableHead>
              <TableHead className="text-right"><Metric id="soe_allowed" label={t("soeVsLeague")} /></TableHead>
              <TableHead className="text-right">{c("man")} %</TableHead><TableHead className="text-right">{t("plays")}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.map(({ k, d }) => {
                const dv = vs(d.soe_allowed, lg.soe_allowed);
                return (
                  <TableRow key={k} tabIndex={0} data-state={sel === k ? "selected" : undefined} className="cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
                    onClick={() => router.push({ pathname, query: { team: k } }, { scroll: true })}
                    onKeyDown={(e) => { if (e.key === "Enter") router.push({ pathname, query: { team: k } }); }}>
                    <TableCell className="num font-bold">{d.rank_soe_allowed ?? "—"}</TableCell>
                    <TableCell className="font-semibold"><span className="flex items-center gap-3">{k}<ArrowUpRight aria-hidden="true" className="size-3.5 text-muted-foreground" /></span></TableCell>
                    <TableCell className={`num text-right font-semibold ${tone(dv)}`}>{sg(dv)}</TableCell>
                    <TableCell className="num text-right">{n0.format(d.pct_man)}%</TableCell>
                    <TableCell className="num text-right text-muted-foreground">{d.pass_plays_faced}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Report({ team, data }: { team: string; data: TeamsData }) {
  const t = useTranslations("Defenses");
  const c = useTranslations("Coverage");
  const pos = useTranslations("Pos");
  const locale = useLocale();
  const d = data.teams[team].defense;
  const lg = data.league;
  const sg = (x: number | null | undefined, n = 2) => (x == null ? "—" : new Intl.NumberFormat(locale, { minimumFractionDigits: n, maximumFractionDigits: n, signDisplay: "always" }).format(x));
  const n0 = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const dv = (a: number | null | undefined, b: number | null | undefined) => (a == null || b == null ? null : a - b);
  const tone = (x: number | null) => (x == null ? "" : x > 0 ? "text-primary" : "text-destructive");
  const kp = (label: React.ReactNode, value: React.ReactNode, sub: string, cls = "") => (
    <Card size="sm"><CardContent className="flex flex-col gap-3">
      <div className="text-sm font-medium">{label}</div>
      <div className={`num text-[1.75rem] font-semibold leading-tight tracking-tight ${cls}`}>{value}</div>
      <div className="text-xs leading-relaxed text-muted-foreground">{sub}</div>
    </CardContent></Card>
  );
  const mix = d.coverage_mix.slice(0, 7).map((m) => ({
    coverage: m.coverage, team: m.pct, league: lg.coverage_mix.find((x) => x.coverage === m.coverage)?.pct ?? 0, n: m.n,
  }));
  const cfg = { team: { label: team, color: "var(--chart-2)" }, league: { label: t("league"), color: "var(--chart-3)" } } satisfies ChartConfig;
  const dSoe = dv(d.soe_allowed, lg.soe_allowed);

  return (
    <section className="flex flex-col gap-5 border-t pt-7" aria-labelledby="rep">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="rep" className="text-xl font-semibold tracking-tight">{t("report", { team })}</h2>
          <Badge variant="secondary" className="num">{t("plays")}: {d.pass_plays_faced}</Badge>
        </div>
        <Button variant="ghost" size="sm" asChild><Link href="/defenses"><X className="size-4" />{t("close")}</Link></Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kp(<Metric id="rank" label={t("rankLabel")} />, <>{d.rank_soe_allowed ?? "—"}<span className="text-base font-medium text-muted-foreground"> / 32</span></>, t("rankHelp"))}
        {kp(<Metric id="soe_allowed" label={t("soeVsLeague")} />, sg(dSoe), c("man") + " " + sg(dv(d.soe_allowed_man, lg.soe_allowed_man)) + " · " + c("zone") + " " + sg(dv(d.soe_allowed_zone, lg.soe_allowed_zone)), tone(dSoe))}
        {kp(<Metric id="epa_allowed" label={t("epaVsLeague")} />, sg(dv(d.epa_allowed_per_pass, lg.epa_allowed_per_pass)), t("epaHelp"), tone(dv(d.epa_allowed_per_pass, lg.epa_allowed_per_pass)))}
        {kp(<span>{c("man")} / {c("zoneOther")}</span>, `${n0.format(d.pct_man)}% / ${n0.format(100 - d.pct_man)}%`, t("leagueMan", { pct: n0.format(lg.pct_man) }))}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{t("mixTitle")}</CardTitle><CardDescription>{t("mixDesc")}</CardDescription></CardHeader>
          <CardContent>
            <ChartContainer config={cfg} className="h-72 w-full">
              <BarChart data={mix} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid horizontal={false} />
                <YAxis dataKey="coverage" type="category" tickLine={false} axisLine={false} width={84} />
                <XAxis type="number" unit="%" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="team" fill="var(--color-team)" radius={3} />
                <Bar dataKey="league" fill="var(--color-league)" radius={3} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t("ddTitle")}</CardTitle><CardDescription>{t("ddDesc")}</CardDescription></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead />{DISTS.map((x) => <TableHead key={x} className="text-center">{t(x)}</TableHead>)}</TableRow></TableHeader>
              <TableBody>
                {DOWNS.map((dn) => (
                  <TableRow key={dn}>
                    <TableCell className="font-semibold">{t("downN", { n: dn })}</TableCell>
                    {DISTS.map((ds) => {
                      const s = d.by_down_distance[`${dn}_${ds}`];
                      if (!s) return <TableCell key={ds} className="text-center text-muted-foreground">—</TableCell>;
                      const a = Math.min(0.3, (s.pct_man / 100) * 0.4);
                      return (
                        <TableCell key={ds} className="text-center"
                          style={{ background: `color-mix(in oklab, var(--chart-2) ${Math.round(a * 100)}%, transparent)` }}>
                          <div className="num font-semibold">{n0.format(s.pct_man)}% {c("man")}{s.n < 8 && " *"}</div>
                          <div className="num text-xs text-muted-foreground">n={s.n} · {s.top_coverage}</div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="mt-2 text-sm text-muted-foreground">{t("fadedNote")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t("vulnTitle")}</CardTitle><CardDescription>{t("vulnDesc")}</CardDescription></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            {(["WR", "TE", "RB"] as Pos[]).map((p) => {
              const v = d.vulnerable_positions[p]; const l = lg.vulnerable_positions[p];
              const x = dv(v, l);
              return (
                <div key={p} className="rounded-lg bg-muted/40 p-3">
                  <div className="text-sm font-semibold">{pos(p)}</div>
                  <div className={`num text-2xl font-extrabold ${tone(x)}`}>{sg(x)}</div>
                  <div className="num text-xs text-muted-foreground">{t("rawVal", { v: v == null ? "—" : sg(v, 2), l: l == null ? "—" : sg(l, 2) })}</div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t("worstTitle")}</CardTitle><CardDescription>{t("worstDesc", { n: data.meta.min_routes_matchup })}</CardDescription></CardHeader>
          <CardContent>
            <ol className="flex flex-col gap-2">
              {d.worst_matchups.map((w, i) => (
                <li key={w.nflId} className="flex flex-wrap items-center gap-3 border-b py-3 first:pt-0 last:border-0 last:pb-0">
                  <span className="num w-5 font-bold text-muted-foreground">{i + 1}</span>
                  <PlayerLink id={w.nflId} className="min-w-0">{w.name}</PlayerLink>
                  <span className="text-sm text-muted-foreground">{w.team}</span>
                  <span className="num ml-auto font-bold text-primary">{sg(w.soe, 1)}</span>
                  <Badge variant="outline" className="num">{t("routesN", { n: w.routes })}</Badge>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader><CardTitle>{t("formTitle")}</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>{t("formation")}</TableHead><TableHead className="text-right">{t("plays")}</TableHead><TableHead className="text-right">{c("man")} %</TableHead></TableRow></TableHeader>
              <TableBody>
                {d.by_formation.map((f) => (
                  <TableRow key={f.formation}>
                    <TableCell className="font-medium">{f.formation}</TableCell>
                    <TableCell className="num text-right">{f.n}{f.n < 10 && " *"}</TableCell>
                    <TableCell className="num text-right">{n0.format(f.pct_man)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="mt-4 text-sm text-muted-foreground">{t("formationNote")}</p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
