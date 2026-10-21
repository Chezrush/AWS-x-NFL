"use client";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Replay as R } from "@/lib/data";

const FIELD_W = 53.3;

export default function Replay({ replays }: { replays: R[] }) {
  const t = useTranslations("Replay");
  const c = useTranslations("Coverage");
  const locale = useLocale();
  const [idx, setIdx] = useState(0);
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
    <section id="replay" className="mx-auto max-w-6xl px-4 py-12">
      <h2 className="text-3xl font-extrabold tracking-tight md:text-5xl">{t("title")}</h2>
      <p className="mt-2 max-w-2xl text-lg text-slate-300">{t("intro")}</p>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <svg viewBox={`${bounds.x0} ${bounds.y0} ${W} ${bounds.y1 - bounds.y0}`} role="img" aria-label={t("field")}
            className="mx-auto max-h-[680px] w-full rounded-2xl border border-line bg-[#0f2a1f]">
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
                <text x={(tp[0] + dp[0]) / 2} y={Math.min(tp[1], dp[1]) - 2.6} fontSize={2.2} fontWeight={800} fill="#fff" textAnchor="middle">
                  {t("yardsShort", { v: nf.format(r.sep) })}
                </text>
              </g>
            )}
            <circle cx={ball[0]} cy={ball[1]} r={0.55} fill="#fff" stroke="#000" strokeWidth={0.12} />
          </svg>

          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={() => { if (!playing && fi >= last - 0.01) setFrame(0); setPlaying((p) => !p); }}
              className="w-28 rounded-lg bg-atk px-4 py-2 text-base font-bold text-ink"
            >
              {playing ? t("pause") : fi >= last - 0.01 ? t("restart") : t("play")}
            </button>
            <input type="range" min={0} max={last} step={0.1} value={fi} aria-label={t("time")}
              onChange={(e) => { setPlaying(false); setFrame(Number(e.target.value)); }}
              className="flex-1 accent-[#4ade80]" />
            <span className="num w-24 text-right text-base text-mute">
              {fmtTime(fi)} · {afterThrow ? t("afterThrow") : t("beforeThrow")}
            </span>
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-300">
            {legend.map(([col, label, ring]) => (
              <li key={label} className="flex items-center gap-2">
                <span className="inline-block h-3.5 w-3.5 rounded-full" style={ring ? { border: `3px solid ${col}` } : { background: col }} />
                {label}
              </li>
            ))}
          </ul>
        </div>

        <aside className="space-y-4">
          <label className="flex flex-col gap-1 text-sm font-semibold text-mute" htmlFor="rp">
            {t("choose")}
            <select id="rp" value={idx} onChange={(e) => setIdx(Number(e.target.value))}>
              {replays.map((p, i) => (
                <option key={p.playId + "-" + p.gameId} value={i}>
                  {t("playOption", { off: p.offense, def: p.defense, week: p.week, down: p.down, dist: p.yardsToGo })}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3 rounded-2xl sm:grid-cols-4 border border-line bg-panel p-4 text-center">
            <div><div className="num text-3xl font-extrabold">{nf.format(r.sep)}</div><div className="text-sm text-mute">{t("separation")} (yds)</div></div>
            <div><div className="num text-3xl font-extrabold">{(r.expected_sep == null ? "–" : nf.format(r.expected_sep))}</div><div className="text-sm text-mute">{t("expected")}</div></div>
            <div><div className="num text-3xl font-extrabold text-atk">{(r.soe == null ? "–" : sg.format(r.soe))}</div><div className="text-sm text-mute">{t("soe")}</div></div>
            <div><div className="num text-3xl font-extrabold">{(r.epa == null ? "–" : sg2.format(r.epa))}</div><div className="text-sm text-mute">{t("epa")}</div></div>
          </div>
          <div className="rounded-2xl border border-line bg-panel p-4 text-base">
            <div><span className="text-mute">{t("coverage")}:</span> <strong>{r.coverage}</strong> ({c(r.coverage_type)})</div>
            <div className="mt-1"><span className="text-mute">{r.target.name}</span> · {r.target.pos}</div>
          </div>
          <div className="rounded-2xl border border-line bg-panel p-4">
            <div className="text-sm font-semibold text-mute">{t("description")}</div>
            <p lang="en" className="mt-1 text-base italic text-slate-200">{r.playDescription}</p>
          </div>
          <p className="text-sm text-atk-amber">{t("honesty")}</p>
        </aside>
      </div>
    </section>
  );
}
