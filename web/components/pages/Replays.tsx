"use client";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Replay as R } from "@/lib/data";

const FIELD_W = 53.3;

type Meta = Omit<R, "frames" | "players" | "los_x" | "first_down_x" | "pass_frame_index" | "hz"> & { result: string };
type GameFile = Record<string, Pick<R, "los_x" | "first_down_x" | "pass_frame_index" | "hz" | "players" | "frames">>;

export default function Replays({ replays, compact = false }: { replays: R[]; compact?: boolean }) {
  const t = useTranslations("Studio");
  if (!compact) return <AllReplays />;
  if (!replays.length) return <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">{t("noReplays")}</p>;
  return <ReplayView replays={replays} compact={compact} />;
}

/** Tous les matchs : index leger (/replays/index.json) puis un fichier de frames par match, charge a la demande. */
function AllReplays() {
  const t = useTranslations("Replay");
  const [index, setIndex] = useState<Meta[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [week, setWeek] = useState<string>("");
  const [gameId, setGameId] = useState<string>("");
  const [plays, setPlays] = useState<R[] | null>(null);
  const files = useRef(new Map<number, GameFile>());

  useEffect(() => {
    let alive = true;
    fetch("/replays/index.json").then((r) => (r.ok ? (r.json() as Promise<Meta[]>) : Promise.reject(new Error(String(r.status)))))
      .then((d) => { if (!alive) return; setIndex(d); setWeek(String(d[0]?.week ?? "")); setGameId(String(d[0]?.gameId ?? "")); })
      .catch(() => alive && setFailed(true));
    return () => { alive = false; };
  }, []);

  const weeks = useMemo(() => [...new Set((index ?? []).map((m) => m.week))].sort((a, b) => a - b), [index]);
  const games = useMemo(() => {
    const m = new Map<number, Meta>();
    for (const x of index ?? []) if (String(x.week) === week && !m.has(x.gameId)) m.set(x.gameId, x);
    return [...m.values()];
  }, [index, week]);

  useEffect(() => {
    if (!index || !gameId) return;
    let alive = true;
    const id = Number(gameId);
    setPlays(null);
    const cached = files.current.get(id);
    (cached ? Promise.resolve(cached) : fetch(`/replays/${id}.json`).then((r) => (r.ok ? (r.json() as Promise<GameFile>) : Promise.reject(new Error(String(r.status))))))
      .then((f) => {
        files.current.set(id, f);
        if (alive) setPlays(index.filter((m) => m.gameId === id && f[m.playId]).map((m) => ({ ...m, ...f[m.playId] })));
      })
      .catch(() => alive && setFailed(true));
    return () => { alive = false; };
  }, [index, gameId]);

  if (failed) return <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">{t("loadError")}</p>;
  if (!index || !plays) return <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground" role="status">{t("loading")}</p>;

  const pickWeek = (w: string) => { setWeek(w); setGameId(String(index.find((m) => String(m.week) === w)?.gameId ?? "")); };
  const toolbar = (
    <div className="grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-2 lg:max-w-2xl">
      <div className="flex flex-col gap-2">
        <label htmlFor="replay-week" className="text-sm font-semibold">{t("week")}</label>
        <Select value={week} onValueChange={pickWeek}>
          <SelectTrigger id="replay-week" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>{weeks.map((w) => <SelectItem key={w} value={String(w)}>{t("weekN", { n: w })}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="replay-game" className="text-sm font-semibold">{t("game")}</label>
        <Select value={gameId} onValueChange={setGameId}>
          <SelectTrigger id="replay-game" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>{games.map((g) => <SelectItem key={g.gameId} value={String(g.gameId)}>{g.offense} / {g.defense}</SelectItem>)}</SelectContent>
        </Select>
      </div>
    </div>
  );
  if (!plays.length) return <div className="flex flex-col gap-4">{toolbar}<p className="text-sm text-muted-foreground">{t("noPlays")}</p></div>;
  return <ReplayView key={gameId} replays={plays} compact={false} toolbar={toolbar} />;
}

function ReplayView({ replays, compact, toolbar }: { replays: R[]; compact: boolean; toolbar?: React.ReactNode }) {
  const t = useTranslations("Replay");
  const c = useTranslations("Coverage");
  const studio = useTranslations("Studio");
  const locale = useLocale();
  const sp = useSearchParams();
  const initial = Number(sp.get("play"));
  const [idx, setIdx] = useState(Number.isInteger(initial) && initial >= 0 && initial < replays.length ? initial : 0);
  const r = replays[idx];
  const [frame, setFrame] = useState(r.pass_frame_index);
  const [playing, setPlaying] = useState(false);
  const raf = useRef<number | null>(null);
  const last = r.frames.length - 1;

  useEffect(() => {
    setFrame(r.pass_frame_index);
    setPlaying(false);
  }, [r]);

  useEffect(() => {
    if (!playing) return;
    let prev = performance.now();
    let cursor = frame;
    const tick = (now: number) => {
      const dt = (now - prev) / 1000;
      prev = now;
      cursor = Math.min(last, cursor + dt * r.hz);
      setFrame(cursor);
      if (cursor >= last) setPlaying(false);
      else raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [playing, r.hz, last]);

  const bounds = useMemo(() => {
    let min = Infinity, max = -Infinity, ymin = Infinity, ymax = -Infinity;
    for (const f of r.frames) for (let i = 0; i < f.length; i += 2) {
      min = Math.min(min, f[i]); max = Math.max(max, f[i]);
      ymin = Math.min(ymin, f[i + 1]); ymax = Math.max(ymax, f[i + 1]);
    }
    return {
      x0: Math.floor(min / 5) * 5 - 3, x1: Math.ceil(max / 5) * 5 + 3,
      y0: Math.max(-2, ymin - 8), y1: Math.min(FIELD_W + 2, ymax + 4),
    };
  }, [r]);

  const fi = Math.min(last, Math.max(0, frame));
  const a = Math.floor(fi), b = Math.min(last, a + 1), k = fi - a;
  const pos = (i: number): [number, number] => [
    r.frames[a][i] + (r.frames[b][i] - r.frames[a][i]) * k,
    r.frames[a][i + 1] + (r.frames[b][i + 1] - r.frames[a][i + 1]) * k,
  ];
  const tIdx = r.players.findIndex((p) => p.role === "target");
  const dIdx = r.players.findIndex((p) => p.role === "closest_defender");
  const afterThrow = fi >= r.pass_frame_index - 0.01;
  const ball = pos(r.players.length * 2);
  // separation line is drawn between the two players at the throw frame, then follows them
  const tp = tIdx >= 0 ? pos(tIdx * 2) : null;
  const dp = dIdx >= 0 ? pos(dIdx * 2) : null;
  const nf = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const sg = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: "always" });
  const sg2 = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: "always" });
  const yardLines: number[] = [];
  for (let x = Math.ceil(bounds.x0 / 5) * 5; x <= bounds.x1; x += 5) yardLines.push(x);
  const W = bounds.x1 - bounds.x0;
  const fmtTime = (f: number) => `${(f / r.hz).toFixed(1)}s`;

  const legend = [
    ["#efd17c", t("legendTarget"), true],
    ["#ee9394", t("legendClosest"), true],
    ["#9dd1b5", t("legendOffense"), false],
    ["#e6b07b", t("legendDefense"), false],
    ["#ffffff", t("legendBall"), false],
  ] as const;

  return (
    <div className={compact ? "min-w-0 rounded-xl border bg-card p-5" : "mx-auto flex max-w-7xl flex-col gap-7"}>
      {!compact && <header className="page-heading">
        <h1>{t("title")}</h1>
        <p className="max-w-3xl text-muted-foreground">{t("intro")}</p>
      </header>}
      {toolbar}

      {compact && <div className="mb-5 flex items-center justify-between gap-3"><h2 className="text-base font-bold">{studio("replayTitle")}</h2><span className="rounded-md bg-secondary px-2 py-1 text-xs font-semibold text-secondary-foreground">{studio("tracking")}</span></div>}
      <div className={compact ? "mb-5 flex flex-wrap items-end gap-3" : "flex flex-col gap-3 rounded-xl border bg-card p-5 sm:flex-row sm:items-end sm:justify-between"}>
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:max-w-xl">
          <label htmlFor="replay-select" className="text-sm font-semibold">{t("choose")}</label>
          <Select value={String(idx)} onValueChange={(value) => setIdx(Number(value))}>
            <SelectTrigger id="replay-select" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {replays.map((p, i) => <SelectItem key={p.playId + "-" + p.gameId} value={String(i)}>{p.offense} vs {p.defense} · {t("weekN", { n: p.week })} · {t("downDist", { down: p.down, ytg: p.yardsToGo })}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          {!compact && <span className="num mr-2 text-sm text-muted-foreground">{t("playCount", { current: idx + 1, total: replays.length })}</span>}
          <Button variant="outline" size="icon" disabled={idx === 0} onClick={() => setIdx((value) => value - 1)} aria-label={t("prev")}><ChevronLeft /></Button>
          <Button variant="outline" size="icon" disabled={idx === replays.length - 1} onClick={() => setIdx((value) => value + 1)} aria-label={t("next")}><ChevronRight /></Button>
        </div>
      </div>

      <div className={compact ? "min-w-0" : "grid items-start gap-6 lg:grid-cols-12"}>
        <div className={compact ? "min-w-0" : "min-w-0 rounded-xl border bg-card p-4 sm:p-5 lg:col-span-8"}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">{r.offense} <span className="font-normal text-muted-foreground">vs</span> {r.defense}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{r.target.name} · {r.coverage}</p>
            </div>
            <Badge variant="secondary">{t("weekN", { n: r.week })}</Badge>
          </div>
          <svg viewBox={`${bounds.x0} ${bounds.y0} ${W} ${bounds.y1 - bounds.y0}`} role="img" aria-label={t("field")}
            className={`mx-auto w-full rounded-lg bg-[#193d2e] ${compact ? "h-[300px] sm:h-[320px]" : "max-h-[580px]"}`}>
            {yardLines.map((x) => (
              <g key={x}>
                <line x1={x} x2={x} y1={-5} y2={FIELD_W + 5} stroke="#ffffff" strokeOpacity={0.18} strokeWidth={0.15} />
                <text x={x + 0.3} y={bounds.y1 - 1} fontSize={1.6} fill="#ffffff" fillOpacity={0.7}>{x > 60 ? 120 - x : x - 10}</text>
              </g>
            ))}
            <line x1={r.los_x} x2={r.los_x} y1={-5} y2={FIELD_W + 5} stroke="#60a5fa" strokeWidth={0.3} />
            <line x1={r.first_down_x} x2={r.first_down_x} y1={-5} y2={FIELD_W + 5} stroke="#fde047" strokeWidth={0.3} strokeDasharray="1 0.8" />
            {r.players.map((p, i) => {
              const [x, y] = pos(i * 2);
              const fill = p.side === "offense" ? "#9dd1b5" : "#e6b07b";
              const ring = p.role === "target" ? "#efd17c" : p.role === "closest_defender" ? "#ee9394" : null;
              return (
                <g key={p.nflId}>
                  {ring && <circle cx={x} cy={y} r={1.9} fill="none" stroke={ring} strokeWidth={0.4} />}
                  <circle cx={x} cy={y} r={1.05} fill={fill} stroke="#06120b" strokeWidth={0.15} />
                  <text x={x} y={y + .38} fontSize={.95} fill="#112c1d" fontWeight={750} textAnchor="middle">{p.jersey}</text>
                </g>
              );
            })}
            {afterThrow && tp && dp && (
              <g>
                <line x1={tp[0]} y1={tp[1]} x2={dp[0]} y2={dp[1]} stroke="#ffffff" strokeWidth={0.3} strokeDasharray="0.8 0.6" />
                <rect x={(tp[0] + dp[0]) / 2 - 5} y={Math.min(tp[1], dp[1]) - 5.2} width={10} height={3.6} rx={0.8} fill="#0a0f1a" stroke="#fff" strokeWidth={0.15} />
                <text x={(tp[0] + dp[0]) / 2} y={Math.min(tp[1], dp[1]) - 2.6} fontSize={2.2} fontWeight={800} fill="#fff" textAnchor="middle">{t("yardsShort", { v: nf.format(r.sep) })}</text>
              </g>
            )}
            <circle cx={ball[0]} cy={ball[1]} r={0.55} fill="#fff" stroke="#000" strokeWidth={0.12} />
          </svg>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button onClick={() => { if (!playing && fi >= last - 0.01) setFrame(0); setPlaying((p) => !p); }} className="w-28 shrink-0">
              {playing ? <Pause className="size-4" /> : fi >= last - 0.01 ? <RotateCcw className="size-4" /> : <Play className="size-4" />}
              {playing ? t("pause") : fi >= last - 0.01 ? t("restart") : t("play")}
            </Button>
            <input type="range" min={0} max={last} step={0.1} value={fi} aria-label={t("time")} aria-valuetext={fmtTime(fi)}
              onChange={(e) => { setPlaying(false); setFrame(Number(e.target.value)); }} className="h-6 min-w-24 flex-1 cursor-pointer accent-primary" />
            <span className="num w-full text-right text-xs text-muted-foreground sm:w-auto">{fmtTime(fi)} · {afterThrow ? t("afterThrow") : t("beforeThrow")}</span>
          </div>
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t pt-4 text-xs text-muted-foreground">
            {legend.map(([col, label, ring]) => (
              <li key={label} className="flex items-center gap-2">
                <span className="inline-block size-3.5 rounded-full" style={ring ? { border: `3px solid ${col}`, background: "#163b2c" } : { background: col, border: "1px solid #52665a" }} />{label}
              </li>
            ))}
          </ul>
          {compact && <p className="mt-4 border-t pt-4 text-sm leading-relaxed"><strong className="font-semibold">{r.target.name}</strong> · <span className="font-semibold text-primary">{r.soe == null ? "–" : sg.format(r.soe)} yd SOE</span><span className="mt-1 block text-xs text-muted-foreground">{t("honesty")}</span></p>}
        </div>

        {!compact && <aside className="flex min-w-0 flex-col gap-5 lg:col-span-4">
          <Card size="sm">
            <CardHeader><CardTitle>{r.offense} vs {r.defense} · {t("weekN", { n: r.week })}</CardTitle>
              <CardDescription className="num">{t("downDist", { down: r.down, ytg: r.yardsToGo })} · Q{r.quarter}</CardDescription></CardHeader>
            <CardContent className="grid grid-cols-2 gap-x-5 gap-y-6">
              <div><div className="num mb-1 text-[1.75rem] font-semibold tracking-tight">{nf.format(r.sep)}</div><div className="text-xs text-muted-foreground">{t("separation")}</div></div>
              <div><div className="num mb-1 text-[1.75rem] font-semibold tracking-tight">{(r.expected_sep == null ? "–" : nf.format(r.expected_sep))}</div><div className="text-xs text-muted-foreground">{t("expected")}</div></div>
              <div><div className="num mb-1 text-[1.75rem] font-semibold tracking-tight text-primary">{(r.soe == null ? "–" : sg.format(r.soe))}</div><div className="text-xs text-muted-foreground">SOE</div></div>
              <div><div className="num mb-1 text-[1.75rem] font-semibold tracking-tight">{(r.epa == null ? "–" : sg2.format(r.epa))}</div><div className="text-xs text-muted-foreground">EPA</div></div>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardContent className="flex flex-col gap-4 text-sm leading-relaxed">
              <div><span className="mb-1 block text-xs text-muted-foreground">{t("coverage")}</span> <strong>{r.coverage}</strong> ({c(r.coverage_type === "man" ? "man" : "zoneOther")})</div>
              <div><span className="mb-1 block text-xs text-muted-foreground">{t("target")}</span> {r.target.name} · {r.target.pos}</div>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardContent>
              <div className="text-sm font-semibold text-muted-foreground">{t("description")}</div>
              <p lang="en" className="mt-2 text-sm leading-relaxed">{r.playDescription}</p>
            </CardContent>
          </Card>
          <p className="text-xs leading-relaxed text-muted-foreground">{t("honestyAll")}</p>
        </aside>}
      </div>
    </div>
  );
}
