"use client";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Replay as R } from "@/lib/data";

const FIELD_W = 53.3;

export default function Replays({ replays }: { replays: R[] }) {
  const t = useTranslations("Replay");
  const c = useTranslations("Coverage");
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
    const tick = (now: number) => {
      const dt = (now - prev) / 1000;
      prev = now;
      let done = false;
      setFrame((f) => {
        const nf = f + dt * r.hz;
        if (nf >= last) { done = true; return last; }
        return nf;
      });
      if (done) setPlaying(false);
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
    ["#fbbf24", t("legendTarget"), true],
    ["#f43f5e", t("legendClosest"), true],
    ["#4ade80", t("legendOffense"), false],
    ["#fb923c", t("legendDefense"), false],
    ["#ffffff", t("legendBall"), false],
  ] as const;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{t("title")}</h1>
        <p className="mt-1 max-w-3xl text-muted-foreground">{t("intro")}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4" role="list" aria-label={t("choose")}>
        {replays.map((p, i) => (
          <button key={p.playId + "-" + p.gameId} role="listitem" onClick={() => setIdx(i)} aria-pressed={i === idx}
            className={`rounded-xl border p-3 text-left transition-colors hover:bg-muted/60 ${i === idx ? "border-primary bg-primary/10" : "bg-card"}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold">{p.offense} <span className="text-muted-foreground">vs</span> {p.defense}</span>
              <Badge variant="outline" className="num">{t("weekN", { n: p.week })}</Badge>
            </div>
            <div className="num mt-1 text-sm text-muted-foreground">{t("downDist", { down: p.down, ytg: p.yardsToGo })} · {p.coverage}</div>
            <div className="num mt-1 text-xl font-extrabold text-primary">{sg.format(p.soe)} <span className="text-xs font-medium text-muted-foreground">SOE</span></div>
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <svg viewBox={`${bounds.x0} ${bounds.y0} ${W} ${bounds.y1 - bounds.y0}`} role="img" aria-label={t("field")}
            className="mx-auto max-h-[640px] w-full rounded-xl border bg-[#0f2a1f]">
            {yardLines.map((x) => (
              <g key={x}>
                <line x1={x} x2={x} y1={-5} y2={FIELD_W + 5} stroke="#ffffff" strokeOpacity={0.18} strokeWidth={0.15} />
                <text x={x + 0.3} y={bounds.y1 - 1} fontSize={1.6} fill="#ffffff" fillOpacity={0.45}>{x > 60 ? 120 - x : x - 10}</text>
              </g>
            ))}
            <line x1={r.los_x} x2={r.los_x} y1={-5} y2={FIELD_W + 5} stroke="#60a5fa" strokeWidth={0.3} />
            <line x1={r.first_down_x} x2={r.first_down_x} y1={-5} y2={FIELD_W + 5} stroke="#fde047" strokeWidth={0.3} strokeDasharray="1 0.8" />
            {r.players.map((p, i) => {
              const [x, y] = pos(i * 2);
              const fill = p.side === "offense" ? "#4ade80" : "#fb923c";
              const ring = p.role === "target" ? "#fbbf24" : p.role === "closest_defender" ? "#f43f5e" : null;
              return (
                <g key={p.nflId}>
                  {ring && <circle cx={x} cy={y} r={1.9} fill="none" stroke={ring} strokeWidth={0.4} />}
                  <circle cx={x} cy={y} r={0.9} fill={fill} stroke="#06120b" strokeWidth={0.15} />
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
          <div className="mt-3 flex items-center gap-3">
            <Button onClick={() => { if (!playing && fi >= last - 0.01) setFrame(0); setPlaying((p) => !p); }} className="w-28">
              {playing ? t("pause") : fi >= last - 0.01 ? t("restart") : t("play")}
            </Button>
            <input type="range" min={0} max={last} step={0.1} value={fi} aria-label={t("time")}
              onChange={(e) => { setPlaying(false); setFrame(Number(e.target.value)); }} className="flex-1 accent-[#4ade80]" />
            <span className="num w-28 text-right text-sm text-muted-foreground">{fmtTime(fi)} · {afterThrow ? t("afterThrow") : t("beforeThrow")}</span>
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
            {legend.map(([col, label, ring]) => (
              <li key={label} className="flex items-center gap-2">
                <span className="inline-block size-3.5 rounded-full" style={ring ? { border: `3px solid ${col}` } : { background: col }} />{label}
              </li>
            ))}
          </ul>
        </div>

        <aside className="flex flex-col gap-4">
          <Card size="sm">
            <CardHeader><CardTitle>{r.offense} vs {r.defense} · {t("weekN", { n: r.week })}</CardTitle>
              <CardDescription className="num">{t("downDist", { down: r.down, ytg: r.yardsToGo })} · Q{r.quarter}</CardDescription></CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
              <div><div className="num text-2xl font-extrabold">{nf.format(r.sep)}</div><div className="text-xs text-muted-foreground">{t("separation")}</div></div>
              <div><div className="num text-2xl font-extrabold">{nf.format(r.expected_sep)}</div><div className="text-xs text-muted-foreground">{t("expected")}</div></div>
              <div><div className="num text-2xl font-extrabold text-primary">{sg.format(r.soe)}</div><div className="text-xs text-muted-foreground">SOE</div></div>
              <div><div className="num text-2xl font-extrabold">{sg2.format(r.epa)}</div><div className="text-xs text-muted-foreground">EPA</div></div>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardContent className="flex flex-col gap-1">
              <div><span className="text-muted-foreground">{t("coverage")}:</span> <strong>{r.coverage}</strong> ({c(r.coverage_type === "man" ? "man" : "zoneOther")})</div>
              <div><span className="text-muted-foreground">{t("target")}:</span> {r.target.name} · {r.target.pos}</div>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardContent>
              <div className="text-sm font-semibold text-muted-foreground">{t("description")}</div>
              <p lang="en" className="mt-1 italic">{r.playDescription}</p>
            </CardContent>
          </Card>
          <p className="text-sm text-muted-foreground">{t("honesty")}</p>
        </aside>
      </div>
    </div>
  );
}
