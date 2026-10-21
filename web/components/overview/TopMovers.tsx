"use client";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import PlayerLink from "@/components/app/PlayerLink";
import type { Player } from "@/lib/data";

function Col({ type, players }: { type: "man" | "zone"; players: Player[] }) {
  const c = useTranslations("Coverage");
  const r = useTranslations("Rank");
  const locale = useLocale();
  const f = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: "always" });
  const rows = players
    .filter((p) => p.tier !== "insufficient" && (type === "man" ? p.n_man : p.n_zone) >= 15)
    .map((p) => ({ p, soe: (type === "man" ? p.soe_man : p.soe_zone) ?? 0, n: type === "man" ? p.n_man : p.n_zone }))
    .sort((a, b) => b.soe - a.soe).slice(0, 5);
  return (
    <div className="flex flex-col gap-2">
      <h4 className="font-bold">{c(type)}</h4>
      <ol className="flex flex-col gap-1.5">
        {rows.map(({ p, soe, n }, i) => (
          <li key={p.nflId} className="flex items-center gap-2 text-base">
            <span className="num w-4 text-muted-foreground">{i + 1}</span>
            <PlayerLink id={p.nflId} className="truncate">{p.name}</PlayerLink>
            <span className="text-sm text-muted-foreground">{p.team} · {p.position}</span>
            <span className="num ml-auto font-bold text-primary">{f.format(soe)}</span>
            <Badge variant="outline" className="num">{r("rowRoutes", { n })}</Badge>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function TopMovers({ players }: { players: Player[] }) {
  const t = useTranslations("Overview");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("moversTitle")}</CardTitle>
        <CardDescription>{t("moversDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2">
        <Col type="man" players={players} />
        <Col type="zone" players={players} />
      </CardContent>
    </Card>
  );
}
