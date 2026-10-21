"use client";
import { useLocale, useTranslations } from "next-intl";
import { Lightbulb } from "lucide-react";
import { defGroup, type FeaturedPlay } from "@/lib/radar";

export default function Insight({ play }: { play: FeaturedPlay }) {
  const t = useTranslations("Radar");
  const locale = useLocale();
  const nf = new Intl.NumberFormat(locale, { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  const posOf = (id: number) => play.players.find((p) => p.nflId === id)?.pos ?? "?";
  const best = play.receivers.find((r) => r.is_optimal_target);
  const tgt = play.receivers.find((r) => r.is_targeted);
  const cov = play.coverage.replace(/-/g, " ");
  let text = t("insightNone");
  if (best && tgt) {
    const common = {
      down: play.down, ytg: play.yardsToGo, cov,
      bestPos: posOf(best.nflId), bestOts: best.ots, sep: nf.format(best.sep_proj),
      mm: best.is_mismatch ? "yes" : "no", def: t(`defGroup.${defGroup(best.def_pos)}`),
    };
    text = best.nflId === tgt.nflId
      ? t("insightFound", common)
      : t("insightMiss", { ...common, tgtPos: posOf(tgt.nflId), tgtOts: tgt.ots });
  }
  return (
    <div className="flex gap-3 rounded-xl border border-border bg-secondary p-4">
      <Lightbulb className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
      <div>
        <div className="text-sm font-bold text-primary">{t("insightTitle")}</div>
        <p className="mt-0.5 text-sm">{text}</p>
      </div>
    </div>
  );
}
