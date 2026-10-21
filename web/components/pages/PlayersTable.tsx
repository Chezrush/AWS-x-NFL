"use client";
import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable, type ColumnDef, type SortingState } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePlayer } from "@/components/app/use-player";
import Metric from "@/components/app/Metric";
import type { PlayerProfile } from "@/lib/data";

const tierVariant = { elite: "default", good: "secondary", avg: "outline", low: "outline", insufficient: "outline" } as const;

export default function PlayersTable({ players }: { players: PlayerProfile[] }) {
  const t = useTranslations("Players");
  const pos = useTranslations("Pos");
  const tier = useTranslations("Tier");
  const locale = useLocale();
  const { open } = usePlayer();
  const [q, setQ] = useState("");
  const [fPos, setFPos] = useState("all");
  const [fTeam, setFTeam] = useState("all");
  const [fTier, setFTier] = useState("all");
  const [minN, setMinN] = useState("0");
  const [sorting, setSorting] = useState<SortingState>([{ id: "soe_all", desc: true }]);
  const teams = useMemo(() => [...new Set(players.map((p) => p.team))].sort(), [players]);

  const data = useMemo(() => players.filter((p) =>
    (fPos === "all" || p.position === fPos) && (fTeam === "all" || p.team === fTeam) &&
    (fTier === "all" || p.tier === fTier) && p.routes >= Number(minN) &&
    (q === "" || p.name.toLowerCase().includes(q.toLowerCase()))), [players, q, fPos, fTeam, fTier, minN]);

  const sg = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: "always" });
  const e2 = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: "always" });
  const soeCell = (v: number | null, n: number) => v == null
    ? <span className="text-xs text-muted-foreground">{t("insufficient", { n })}</span>
    : <span className="num font-semibold">{sg.format(v)}</span>;
  const numSort = (a: number | null, b: number | null) => (a ?? -Infinity) - (b ?? -Infinity);

  const columns = useMemo<ColumnDef<PlayerProfile>[]>(() => [
    { id: "name", accessorKey: "name", header: t("col.player"), cell: ({ row }) => (
        <div className="flex flex-col"><span className="font-semibold">{row.original.name}</span>
          <span className="text-xs text-muted-foreground">{row.original.team} · {pos(row.original.position)}</span></div>) },
    { id: "tier", accessorKey: "tier", header: t("col.tier"), cell: ({ row }) => (
        <div className="flex flex-wrap gap-1"><Badge variant={tierVariant[row.original.tier]}>{tier(row.original.tier)}</Badge>
          {row.original.low_n && <Badge variant="outline">{t("lowN")}</Badge>}</div>) },
    { id: "soe_all", accessorKey: "soe_all", header: "SOE", sortingFn: (a, b) => numSort(a.original.soe_all, b.original.soe_all), cell: ({ row }) => soeCell(row.original.soe_all, row.original.routes) },
    { id: "soe_man", accessorKey: "soe_man", header: t("col.man"), sortingFn: (a, b) => numSort(a.original.soe_man, b.original.soe_man), cell: ({ row }) => soeCell(row.original.soe_man, row.original.n_man) },
    { id: "soe_zone", accessorKey: "soe_zone", header: t("col.zone"), sortingFn: (a, b) => numSort(a.original.soe_zone, b.original.soe_zone), cell: ({ row }) => soeCell(row.original.soe_zone, row.original.n_zone) },
    { id: "routes", accessorKey: "routes", header: t("col.routes"), cell: ({ getValue }) => <span className="num">{String(getValue())}</span> },
    { id: "targets", accessorKey: "targets", header: t("col.targets"), cell: ({ getValue }) => <span className="num">{String(getValue())}</span> },
    { id: "epa", accessorKey: "epa_per_target", header: t("col.epa"), sortingFn: (a, b) => numSort(a.original.epa_per_target, b.original.epa_per_target), cell: ({ row }) => {
        const v = row.original.epa_per_target;
        return v == null ? <span className="text-muted-foreground">—</span> : (
          <span className={`num ${row.original.targets < 15 ? "text-muted-foreground" : ""}`}>{e2.format(v)}{row.original.targets < 15 && " *"}</span>);
      } },
  ], [t, pos, tier, locale]); // eslint-disable-line react-hooks/exhaustive-deps

  const table = useReactTable({
    data, columns, state: { sorting }, onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(), getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 15 } }, sortDescFirst: true,
  });
  const pg = table.getState().pagination;

  const filt = (id: string, label: string, value: string, set: (v: string) => void, items: [string, string][]) => (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-muted-foreground">{label}</label>
      <Select value={value} onValueChange={(v) => { set(v); table.setPageIndex(0); }}>
        <SelectTrigger id={id} className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent><SelectGroup>{items.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectGroup></SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4">
      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="pq" className="text-sm font-semibold text-muted-foreground">{t("search")}</label>
            <Input id="pq" value={q} placeholder={t("searchPlaceholder")} onChange={(e) => { setQ(e.target.value); table.setPageIndex(0); }} />
          </div>
          {filt("fpos", t("position"), fPos, setFPos, [["all", t("all")], ["WR", pos("WR")], ["TE", pos("TE")], ["RB", pos("RB")]])}
          {filt("fteam", t("team"), fTeam, setFTeam, [["all", t("all")], ...teams.map((x): [string, string] => [x, x])])}
          {filt("ftier", t("tier"), fTier, setFTier, [["all", t("all")], ...(["elite", "good", "avg", "low", "insufficient"] as const).map((x): [string, string] => [x, tier(x)])])}
          {filt("fn", t("minRoutes"), minN, setMinN, [["0", t("all")], ["30", "30+"], ["50", "50+"], ["100", "100+"]])}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {data.length === 0 ? (
            <Empty><EmptyHeader><EmptyTitle>{t("emptyTitle")}</EmptyTitle><EmptyDescription>{t("emptyDesc")}</EmptyDescription></EmptyHeader></Empty>
          ) : (
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id}>
                    {hg.headers.map((h) => {
                      const s = h.column.getIsSorted();
                      return (
                        <TableHead key={h.id} aria-sort={s ? (s === "asc" ? "ascending" : "descending") : "none"}>
                          <Button variant="ghost" size="sm" className="-ml-2 h-8 gap-1 font-semibold" onClick={h.column.getToggleSortingHandler()}>
                            {flexRender(h.column.columnDef.header, h.getContext())}
                            {s === "asc" ? <ArrowUp /> : s === "desc" ? <ArrowDown /> : <ArrowUpDown className="opacity-40" />}
                          </Button>
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((r) => (
                  <TableRow key={r.id} tabIndex={0} className="cursor-pointer" onClick={() => open(r.original.id)}
                    onKeyDown={(e) => { if (e.key === "Enter") open(r.original.id); }}>
                    {r.getVisibleCells().map((c) => <TableCell key={c.id}>{flexRender(c.column.columnDef.cell, c.getContext())}</TableCell>)}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <span className="num">{t("count", { n: data.length, total: players.length })} · {t("epaNote")}</span>
        <div className="flex items-center gap-2">
          <span className="num">{t("page", { p: pg.pageIndex + 1, n: Math.max(1, table.getPageCount()) })}</span>
          <Button variant="outline" size="icon" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()} aria-label={t("prev")}><ChevronLeft /></Button>
          <Button variant="outline" size="icon" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()} aria-label={t("next")}><ChevronRight /></Button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground"><Metric id="soe" label="SOE" /> — {t("soeNote")}</p>
    </div>
  );
}
