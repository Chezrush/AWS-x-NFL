"use client";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";

/** Ouvre/ferme le tiroir joueur via ?player=<id> (deep-link). */
export function usePlayer() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const current = params.get("player");
  const query = (id: number | null) => {
    const q: Record<string, string> = Object.fromEntries(params.entries());
    if (id === null) delete q.player; else q.player = String(id);
    return q;
  };
  return {
    playerId: current ? Number(current) : null,
    open: (id: number) => router.push({ pathname, query: query(id) }, { scroll: false }),
    close: () => router.replace({ pathname, query: query(null) }, { scroll: false }),
  };
}
