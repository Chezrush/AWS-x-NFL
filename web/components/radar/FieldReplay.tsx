"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Pause, Play, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Insight from "@/components/radar/Insight";
import type { FeaturedPlay } from "@/lib/radar";

const FIELD_W = 53.3;
const NEON = "#39FF14";
const ORANGE = "#FF8A00";

export default function FieldReplay({ plays }: { plays: FeaturedPlay[] }) {
  const t = useTranslations("Radar");
  const locale = useLocale();
  const [idx, setIdx] = useState(0);
  const r = plays[Math.min(idx, plays.length - 1)];
  const [frame, setFrame] = useState(r.pass_frame_index);
  const [playing, setPlaying] = useState(false);
  const raf = useRef<number | null>(null);
  const last = r.frames.length - 1;

  useEffect(() => { setFrame(r.pass_frame_index); setPlaying(false); }, [r]);

  useEffect(() => {
    if (!playing) return;
    let prev = performance.now();
    const tick = (now: number) => {
      const dt = (now - prev) / 1000;
      prev = now;
      let done = false;
      setFrame((f) => {
        const nf = f + dt * r.hz;
        if (nf >= last) { done = true; return last; }
        return nf;
      });
      if (done) setPlaying(false); else raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [playing, r.hz, last]);

  const bounds = useMemo(() => {
    let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
    for (const f of r.frames) for (let i = 0; i < f.length; i += 2) {
      xmin = Math.min(xmin, f[i]); xmax = Math.max(xmax, f[i]);
      ymin = Math.min(ymin, f[i + 1]); ymax = Math.max(ymax, f[i + 1]);
    }
    xmin = Math.min(xmin, r.los_x); xmax = Math.max(xmax, r.first_down_x);
    return { x0: Math.floor(xmin / 5) * 5 - 3, x1: Math.ceil(xmax / 5) * 5 + 3, y0: Math.max(-2, ymin - 6), y1: Math.min(FIELD_W + 2, ymax + 6) };
  }, [r]);

  const fi = Math.min(last, Math.max(0, frame));
  const a = Math.floor(fi), b = Math.min(last, a + 1), k = fi - a;
  const pos = (i: number): [number, number] => [
    r.frames[a][i] + (r.frames[b][i] - r.frames[a][i]) * k,
    r.frames[a][i + 1] + (r.frames[b][i + 1] - r.frames[a][i + 1]) * k,
  ];
  const idxOf = (id: number) => r.players.findIndex((p) => p.nflId === id);
  const ball = pos(r.players.length * 2);
  const W = bounds.x1 - bounds.x0;
  const yardLines: number[] = [];
  for (let x = Math.ceil(bounds.x0 / 5) * 5; x <= bounds.x1; x += 5) yardLines.push(x);
  const nf = new Intl.NumberFormat(locale, { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  const covLabel = r.coverage.replace(/-/g, " ");
  const labelled = r.receivers.filter((rc) => rc.is_optimal_target || rc.is_targeted);

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>{t("fieldTitle")}</CardTitle>
        <CardDescription>{t("fieldDesc")}</CardDescription>
        <div className="mt-2 flex flex-wrap gap-2" role="list" aria-label={t("choosePlay")}>
          {plays.map((p, i) => (
            <button key={p.id} role="listitem" type="button" onClick={() => setIdx(i)} aria-pressed={i === idx}
              className={`rounded-lg border px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-muted/60 ${i === idx ? "border-primary bg-primary/10" : "bg-card"}`}>
              <div className="font-bold">{p.offense} vs {p.defense} · {t("week", { n: p.week })}</div>
              <div className="num text-muted-foreground">{t("downDist", { down: p.down, ytg: p.yardsToGo })} · {p.coverage.replace(/-/g, " ")}</div>
              <div className="num font-semibold" style={{ color: p.qb_gap > 0 ? ORANGE : NEON }}>{t("qbGap", { n: p.qb_gap })}</div>
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <svg viewBox={`${bounds.x0} ${bounds.y0} ${W} ${bounds.y1 - bounds.y0}`} role="img" aria-label={t("fieldAria", { cov: covLabel, down: r.down, ytg: r.yardsToGo })}
          className="mx-auto max-h-[460px] w-full rounded-xl border bg-[#07140e]">
          {yardLines.map((x) => (
            <g key={x}>
              <line x1={x} x2={x} y1={-5} y2={FIELD_W + 5} stroke="#fff" strokeOpacity={0.15} strokeWidth={0.15} />
              <text x={x + 0.3} y={bounds.y1 - 0.8} fontSize={1.6} fill="#fff" fillOpacity={0.4}>{x > 60 ? 120 - x : x - 10}</text>
            </g>
          ))}
          <line x1={r.los_x} x2={r.los_x} y1={-5} y2={FIELD_W + 5} stroke="#60a5fa" strokeWidth={0.3} />
          <line x1={r.first_down_x} x2={r.first_down_x} y1={-5} y2={FIELD_W + 5} stroke="#fde047" strokeWidth={0.3} strokeDasharray="1 0.8" />
          {labelled.map((rc) => {
            const ri = idxOf(rc.nflId), di = idxOf(rc.def_nflId);
            if (ri < 0 || di < 0) return null;
            const [rx, ry] = pos(ri * 2), [dx, dy] = pos(di * 2);
            const mx = (rx + dx) / 2, my = Math.min(ry, dy) - 2.2;
            const label = `${r.players[ri].pos} vs ${rc.def_pos} - OTS: ${rc.ots}`;
            const w = label.length * 1.15 + 1.6;
            return (
              <g key={rc.nflId}>
                <line x1={rx} y1={ry} x2={dx} y2={dy} stroke="#fff" strokeWidth={0.28} strokeDasharray="0.8 0.6" />
                <rect x={mx - w / 2} y={my - 1.8} width={w} height={2.8} rx={0.6} fill="#0a0f1a" fillOpacity={0.92} stroke={rc.is_optimal_target ? NEON : ORANGE} strokeWidth={0.15} />
                <text x={mx} y={my + 0.2} fontSize={1.7} fontWeight={800} fill="#fff" textAnchor="middle">{label}</text>
              </g>
            );
          })}
          {r.players.map((p, i) => {
            const [x, y] = pos(i * 2);
            const rc = r.receivers.find((q) => q.nflId === p.nflId);
            return (
              <g key={p.nflId}>
                {rc?.is_optimal_target && <circle cx={x} cy={y} r={1.9} fill="none" stroke={NEON} strokeWidth={0.45} />}
                {rc?.is_targeted && <circle cx={x} cy={y} r={rc.is_optimal_target ? 2.6 : 1.9} fill="none" stroke={ORANGE} strokeWidth={0.45} />}
                <circle cx={x} cy={y} r={0.9} fill={p.side === "offense" ? "#4ade80" : "#94a3b8"} stroke="#06120b" strokeWidth={0.15} />
                {(rc || p.role === "coverage") && <text x={x} y={y + 0.4} fontSize={1} fontWeight={800} textAnchor="middle" fill="#041008">{p.jersey}</text>}
              </g>
            );
          })}
          <circle cx={ball[0]} cy={ball[1]} r={0.55} fill="#fff" stroke="#000" strokeWidth={0.12} />
        </svg>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => { if (!playing && fi >= last - 0.01) setFrame(0); setPlaying((p) => !p); }} aria-label={playing ? t("pause") : t("play")}>
            {playing ? <Pause className="size-4" /> : <Play className="size-4" />}{playing ? t("pause") : t("play")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setPlaying(false); setFrame(r.pass_frame_index); }}>
            <SkipForward className="size-4" />{t("goThrow")}
          </Button>
          <input type="range" min={0} max={last} step={0.1} value={fi} aria-label={t("time")}
            onChange={(e) => { setPlaying(false); setFrame(Number(e.target.value)); }} className="min-w-32 flex-1 accent-[#39FF14]" />
          <span className="num text-xs text-muted-foreground">{nf.format(fi / r.hz)}s · {fi >= r.pass_frame_index - 0.01 ? t("afterThrow") : t("beforeThrow")}</span>
        </div>

        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {([[NEON, t("legendBest"), true], [ORANGE, t("legendTarget"), true], ["#4ade80", t("legendOffense"), false], ["#94a3b8", t("legendDefense"), false], ["#60a5fa", t("legendLos"), false], ["#fde047", t("legendFirst"), false]] as const).map(([col, label, ring]) => (
            <li key={label} className="flex items-center gap-1.5">
              <span className="inline-block size-3 rounded-full" style={ring ? { border: `3px solid ${col}` } : { background: col }} />{label}
            </li>
          ))}
        </ul>
        <Insight play={r} />
      </CardContent>
    </Card>
  );
}
