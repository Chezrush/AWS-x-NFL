"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useRouter } from "@/i18n/navigation";
import { fetchProfiles } from "@/lib/profiles-client";
import type { PlayerProfile } from "@/lib/data";
import { usePlayer } from "./use-player";

/** Minuscules, sans accents : "rondale", "Rondale" et "Rondalé" matchent pareil. */
export const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Chaque mot saisi doit apparaitre dans la valeur ou les mots-cles (pas de fuzzy bruyant). */
function filter(_value: string, search: string, keywords: string[] = []) {
  const hay = norm(keywords.join(" "));
  const words = norm(search).split(/\s+/).filter(Boolean);
  return words.every((w) => hay.includes(w)) ? 1 : 0;
}

const PAGES = ["overview", "gameplan", "players", "defenses", "replays", "method"] as const;
const HREF: Record<(typeof PAGES)[number], string> = {
  overview: "/", gameplan: "/gameplan", players: "/players", defenses: "/defenses", replays: "/replays", method: "/method",
};

export default function CommandSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const t = useTranslations("Shell");
  const nav = useTranslations("Nav");
  const router = useRouter();
  const { open: openPlayer } = usePlayer();
  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || players.length > 0) return;
    let alive = true;
    setLoading(true);
    fetchProfiles().then((d) => { if (alive) { setPlayers(d); setLoading(false); } });
    return () => { alive = false; };
  }, [open, players.length]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title={t("search")} description={t("searchHint")} commandProps={{ filter }}>
      <CommandInput placeholder={t("searchPlaceholder")} />
      <CommandList>
        <CommandEmpty>{loading ? t("loading") : t("noResults")}</CommandEmpty>
        <CommandGroup heading={t("pages")}>
          {PAGES.map((p) => (
            <CommandItem key={p} value={`page-${p}`} keywords={[nav(p)]} onSelect={() => { onOpenChange(false); router.push(HREF[p]); }}>
              {nav(p)}
            </CommandItem>
          ))}
        </CommandGroup>
        {players.length > 0 && (
          <CommandGroup heading={t("players")}>
            {players.map((p) => (
              <CommandItem key={p.id} value={`player-${p.id}`} keywords={[p.name, p.team, p.position, ...(p.teams ?? [])]} onSelect={() => { onOpenChange(false); openPlayer(p.id); }}>
                <span className="font-medium">{p.name}</span>
                <span className="ml-2 text-muted-foreground">{p.team} · {p.position}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
