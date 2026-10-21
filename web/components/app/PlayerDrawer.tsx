"use client";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis, Cell, ReferenceLine } from "recharts";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Link } from "@/i18n/navigation";
import { fetchProfiles } from "@/lib/profiles-client";
import type { PlayerProfile } from "@/lib/data";
import Metric from "./Metric";
import { usePlayer } from "./use-player";

const tierVariant = { elite: "default", good: "secondary", avg: "outline", low: "outline", insufficient: "outline" } as const;

function useFmt() {
  const locale = useLocale();
  const f = (d: number, sign = false) =>
    new Intl.NumberFormat(locale, { minimumFractionDigits: d, maximumFractionDigits: d, signDisplay: sign ? "always" : "auto" });
  return {
    soe: (v: number | null | undefined) => (v == null ? null : f(1, true).format(v)),
    n1: (v: number | null | undefined) => (v == null ? null : f(1).format(v)),
    n2: (v: number | null | undefined) => (v == null ? null : f(2, true).format(v)),
    int: (v: number | null | undefined) => (v == null ? null : new Intl.NumberFormat(locale).format(v)),
    pct: (v: number | null | undefined) => (v == null ? null : new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }).format(v)),
  };
}

export default function PlayerDrawer() {
  const { playerId, close } = usePlayer();
  const t = useTranslations("Player");
  const [players, setPlayers] = useState<PlayerProfile[] | null>(null);

  useEffect(() => { if (playerId !== null && players === null) fetchProfiles().then(setPlayers); }, [playerId, players]);
  const p = players?.find((x) => x.id === playerId) ?? null;

  return (
    <Sheet open={playerId !== null} onOpenChange={(o) => !o && close()}>
      <SheetContent side="right" closeLabel={t("close")} className="player-drawer w-full gap-0 overflow-y-auto bg-background data-[side=right]:w-full data-[side=right]:sm:max-w-3xl">
        {p ? <Body p={p} /> : (
          <>
            <SheetHeader>
              <SheetTitle>{players === null ? t("loading") : t("notFound")}</SheetTitle>
              <SheetDescription className="sr-only">{t("subtitle")}</SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-3 p-4">
              <Skeleton className="h-8 w-2/3" /><Skeleton className="h-24 w-full" /><Skeleton className="h-64 w-full" />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Body({ p }: { p: PlayerProfile }) {
  const t = useTranslations("Player");
  const pos = useTranslations("Pos");
  const tier = useTranslations("Tier");
  const x = useFmt();
  const heightTxt = p.height_in ? `${Math.floor(p.height_in / 12)}'${p.height_in % 12}"` : null;
  const bio = [pos(p.position), p.team, heightTxt, p.weight ? `${Math.round(p.weight)} lb` : null,
    p.age ? t("age", { n: p.age }) : null, p.college ?? null].filter(Boolean).join(" · ");
  const lowT = p.targets < 15;

  const kpi = (id: "soe_all" | "soe_man" | "soe_zone", value: number | null, n: number, pctl?: number | null, rank?: string) => (
    <Card size="sm">
      <CardContent className="flex flex-col items-start gap-3">
        <Metric id="soe" label={t(id)} />
        {value == null ? (
          <div className="text-base font-semibold capitalize text-muted-foreground">{t("insufficientShort")}</div>
        ) : (
          <div className="num text-[1.75rem] font-semibold leading-tight tracking-tight text-primary">{x.soe(value)} <span className="text-sm font-medium text-muted-foreground">{t("yds")}</span></div>
        )}
        <div className="num text-xs leading-relaxed text-muted-foreground">
          {t("n", { n })}{rank ? ` · ${rank}` : ""}{pctl != null ? ` · ${t("percentile", { p: Math.round(pctl) })}` : ""}
        </div>
      </CardContent>
    </Card>
  );

  const stat = (id: string, v: string | null, extra?: React.ReactNode) => (
    <div className="flex min-w-0 flex-col items-start gap-3 border-b py-4">
      <Metric id={id} />
      <div className="num flex flex-wrap items-baseline gap-1 text-xl font-semibold">{v ?? t("na")}{extra}</div>
    </div>
  );
  const lowBadge = <Badge variant="outline" className="align-middle text-xs">{t("smallSample")}</Badge>;

  return (
    <>
      <SheetHeader className="gap-3 border-b bg-card px-5 py-7 pr-12 sm:px-7 sm:pr-14">
        <SheetTitle className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">{p.name}</SheetTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={tierVariant[p.tier]}>{tier(p.tier)}</Badge>
          {p.low_n && <Badge variant="outline">{t("lowN", { n: p.routes })}</Badge>}
        </div>
        <SheetDescription className="max-w-xl text-sm leading-relaxed">{bio}</SheetDescription>
      </SheetHeader>
      <div className="flex min-w-0 flex-col gap-6 px-5 py-6 sm:px-7">
        {p.low_n && (
          <Alert><AlertDescription>{t("lowNWarn")}</AlertDescription></Alert>
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          {kpi("soe_all", p.soe_all, p.routes, p.pct_soe_all, p.rank_soe_all && p.n_rank ? t("rank", { r: p.rank_soe_all, n: p.n_rank, pos: p.position }) : undefined)}
          {kpi("soe_man", p.soe_man, p.n_man, p.pct_soe_man)}
          {kpi("soe_zone", p.soe_zone, p.n_zone, p.pct_soe_zone)}
        </div>

        <Tabs defaultValue="summary">
          <div className="max-w-full overflow-x-auto pb-1">
            <TabsList className="flex h-auto w-max min-w-full justify-start gap-1 p-1">
              {(["summary", "coverage", "alignment", "trend", "plays"] as const).map((k) => (
                <TabsTrigger key={k} value={k} className="min-h-10 px-3">{t(`tab.${k}`)}</TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="summary" className="mt-5 flex flex-col gap-7">
            <div className="grid grid-cols-2 gap-x-6 sm:grid-cols-3">
              {stat("routes", x.int(p.routes))}
              {stat("targets", x.int(p.targets))}
              {stat("receptions", x.int(p.receptions))}
              {stat("rec_yards", x.int(p.rec_yards))}
              {stat("tds", x.int(p.tds))}
              {stat("catch_rate", x.pct(p.catch_rate))}
              {stat("target_rate", x.pct(p.target_rate))}
              {stat("air_yards", x.n1(p.air_yards_avg))}
              {stat("yac", x.n1(p.yac_avg))}
              {stat("epa", x.n2(p.epa_per_target), lowT && lowBadge)}
              {stat("cpoe", x.soe(p.cpoe_avg), lowT && lowBadge)}
              {stat("toe", p.toe == null ? null : x.soe(p.toe), p.expected_targets != null && (
                <span className="ml-1 text-sm font-medium text-muted-foreground">{t("expectedTargets", { n: Math.round(p.expected_targets) })}</span>
              ))}
            </div>
            <div className="flex flex-col gap-4 rounded-xl border bg-card p-5">
              <h3 className="text-base font-semibold">{t("percentiles", { pos: p.position })}</h3>
              {([["soe_all", p.pct_soe_all], ["target_rate", p.pct_target_rate], ["epa", p.pct_epa]] as const).map(([id, v]) => (
                <div key={id} className="flex flex-col gap-2">
                  <div className="flex justify-between text-sm"><Metric id={id === "soe_all" ? "soe" : id} /><span className="num font-semibold">{v == null ? t("na") : Math.round(v)}</span></div>
                  <Progress value={v ?? 0} />
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="coverage" className="mt-4"><CoverageTab p={p} /></TabsContent>
          <TabsContent value="alignment" className="mt-4"><AlignmentTab p={p} /></TabsContent>
          <TabsContent value="trend" className="mt-4"><TrendTab p={p} /></TabsContent>
          <TabsContent value="plays" className="mt-4"><PlaysTab p={p} /></TabsContent>
        </Tabs>
      </div>
    </>
  );
}

function CoverageTab({ p }: { p: PlayerProfile }) {
  const t = useTranslations("Player");
  const c = useTranslations("Coverage");
  const x = useFmt();
  const cfg = { soe: { label: "SOE", color: "var(--chart-1)" } } satisfies ChartConfig;
  const data = [
    { name: c("man"), soe: p.soe_man, n: p.n_man },
    { name: c("zone"), soe: p.soe_zone, n: p.n_zone },
  ];
  const rows = p.by_coverage ?? [];
  return (
    <div className="flex flex-col gap-4">
      <ChartContainer config={cfg} className="h-48 w-full">
        <BarChart data={data.map((d) => ({ ...d, soe: d.soe ?? 0 }))} layout="vertical" margin={{ left: 8, right: 24 }}>
          <CartesianGrid horizontal={false} />
          <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={60} />
          <XAxis type="number" />
          <ReferenceLine x={0} stroke="var(--muted-foreground)" />
          <ChartTooltip content={<ChartTooltipContent hideLabel />} />
          <Bar dataKey="soe" radius={4}>
            <Cell fill="var(--chart-2)" /><Cell fill="var(--chart-3)" />
          </Bar>
        </BarChart>
      </ChartContainer>
      <p className="num text-sm text-muted-foreground">
        {t("n", { n: p.n_man })} · {c("man")} {p.soe_man == null ? t("insufficientShort") : x.soe(p.soe_man)} — {t("n", { n: p.n_zone })} · {c("zone")} {p.soe_zone == null ? t("insufficientShort") : x.soe(p.soe_zone)}
      </p>
      <Table>
        <TableHeader><TableRow>
          <TableHead>{t("scheme")}</TableHead><TableHead className="text-right">{t("routesCol")}</TableHead>
          <TableHead className="text-right">SOE</TableHead><TableHead className="text-right">{t("targetsCol")}</TableHead>
          <TableHead className="text-right">EPA</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.coverage}>
              <TableCell className="font-medium">{r.coverage} <span className="text-muted-foreground">({c(r.type === "man" ? "man" : "zoneOther")})</span></TableCell>
              <TableCell className="num text-right">{r.routes}{r.routes < 10 && " *"}</TableCell>
              <TableCell className="num text-right">{x.soe(r.soe)}</TableCell>
              <TableCell className="num text-right">{r.targets}</TableCell>
              <TableCell className="num text-right">{r.targets < 5 ? t("na") : x.n2(r.epa_per_target)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="text-sm text-muted-foreground">{t("fadedNote")}</p>
    </div>
  );
}

function AlignmentTab({ p }: { p: PlayerProfile }) {
  const t = useTranslations("Player");
  const a = useTranslations("Align");
  const x = useFmt();
  const cfg = { soe: { label: "SOE", color: "var(--chart-1)" } } satisfies ChartConfig;
  const data = (p.by_alignment ?? []).map((r) => ({ name: a(r.align), soe: r.soe ?? 0, routes: r.routes, targets: r.targets }));
  return (
    <div className="flex flex-col gap-4">
      <ChartContainer config={cfg} className="h-56 w-full">
        <BarChart data={data}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="name" tickLine={false} axisLine={false} />
          <YAxis />
          <ReferenceLine y={0} stroke="var(--muted-foreground)" />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="soe" fill="var(--color-soe)" radius={4} />
        </BarChart>
      </ChartContainer>
      <Table>
        <TableHeader><TableRow>
          <TableHead>{t("alignment")}</TableHead><TableHead className="text-right">{t("routesCol")}</TableHead>
          <TableHead className="text-right">SOE</TableHead><TableHead className="text-right">{t("targetsCol")}</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {data.map((r) => (
            <TableRow key={r.name}>
              <TableCell className="font-medium">{r.name}</TableCell>
              <TableCell className="num text-right">{r.routes}{r.routes < 10 && " *"}</TableCell>
              <TableCell className="num text-right">{x.soe(r.soe)}</TableCell>
              <TableCell className="num text-right">{r.targets}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function TrendTab({ p }: { p: PlayerProfile }) {
  const t = useTranslations("Player");
  const cfg = { soe: { label: "SOE", color: "var(--chart-1)" } } satisfies ChartConfig;
  const data = (p.by_week ?? []).map((w) => ({ week: `${t("weekShort")}${w.week}`, soe: w.soe, routes: w.routes }));
  return (
    <div className="flex flex-col gap-3">
      <ChartContainer config={cfg} className="h-64 w-full">
        <LineChart data={data} margin={{ left: 4, right: 12 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="week" tickLine={false} axisLine={false} />
          <YAxis />
          <ReferenceLine y={0} stroke="var(--muted-foreground)" />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Line dataKey="soe" stroke="var(--color-soe)" strokeWidth={2}
            dot={(props: { cx?: number; cy?: number; payload?: { routes: number }; index?: number }) => (
              <circle key={props.index} cx={props.cx} cy={props.cy} r={4} fill="var(--color-soe)" fillOpacity={(props.payload?.routes ?? 0) < 8 ? 0.3 : 1} />
            )} />
        </LineChart>
      </ChartContainer>
      <p className="num text-sm text-muted-foreground">{(p.by_week ?? []).map((w) => `${t("weekShort")}${w.week}: n=${w.routes}`).join(" · ")}</p>
      <p className="text-sm text-muted-foreground">{t("fadedNote")}</p>
    </div>
  );
}

function PlaysTab({ p }: { p: PlayerProfile }) {
  const t = useTranslations("Player");
  const x = useFmt();
  const plays = p.best_plays ?? [];
  if (plays.length === 0) return <p className="text-muted-foreground">{t("noPlays")}</p>;
  return (
    <div className="flex flex-col gap-3">
      {plays.map((b) => (
        <Card key={`${b.gameId}-${b.playId}`} size="sm">
          <CardContent className="flex flex-col gap-2">
            <div className="num flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>{t("playMeta", { week: b.week, opp: b.opponent, down: b.down, ytg: b.yards_to_go })}</span>
              <Badge variant="outline">{b.coverage}</Badge>
            </div>
            <p lang="en" className="text-sm leading-relaxed">{b.description}</p>
            <div className="num flex flex-wrap items-center gap-x-6 gap-y-1">
              <span>{t("sep")}: <strong>{x.n1(b.sep)} {t("yds")}</strong></span>
              <span>SOE: <strong className="text-primary">{x.soe(b.soe)}</strong></span>
              <span>EPA: <strong>{b.epa == null ? t("na") : x.n2(b.epa)}</strong></span>
              {b.replay_index != null && (
                <Button asChild size="sm" variant="outline" className="ml-auto">
                  <Link href={{ pathname: "/replays", query: { play: String(b.replay_index) } }}>{t("viewReplay")}</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
      <p className="text-sm text-muted-foreground">{t("bestNote")}</p>
    </div>
  );
}
