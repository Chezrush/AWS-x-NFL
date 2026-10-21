"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useRouter } from "@/i18n/navigation";
import { fetchProfiles } from "@/lib/profiles-client";
import type { PlayerProfile } from "@/lib/data";
import { usePlayer } from "./use-player";

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

  useEffect(() => { if (open && players.length === 0) fetchProfiles().then(setPlayers); }, [open, players.length]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title={t("search")} description={t("searchHint")}>
      <CommandInput placeholder={t("searchPlaceholder")} />
      <CommandList>
        <CommandEmpty>{t("noResults")}</CommandEmpty>
        <CommandGroup heading={t("pages")}>
          {PAGES.map((p) => (
            <CommandItem key={p} value={`page ${nav(p)}`} onSelect={() => { onOpenChange(false); router.push(HREF[p]); }}>
              {nav(p)}
            </CommandItem>
          ))}
        </CommandGroup>
        {players.length > 0 && (
          <CommandGroup heading={t("players")}>
            {players.map((p) => (
              <CommandItem key={p.id} value={`${p.name} ${p.team} ${p.position}`} onSelect={() => { onOpenChange(false); openPlayer(p.id); }}>
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
