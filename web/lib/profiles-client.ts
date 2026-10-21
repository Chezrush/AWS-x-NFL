"use client";
import type { PlayerProfile, PlayerProfiles } from "@/lib/data";

let cache: Promise<PlayerProfile[]> | null = null;

/** Charge (une fois) /data/player_profiles.json cote client : alimente le tiroir joueur et la recherche. */
export function fetchProfiles(): Promise<PlayerProfile[]> {
  cache ??= fetch("/data/player_profiles.json")
    .then((r) => (r.ok ? (r.json() as Promise<PlayerProfiles>) : Promise.reject(new Error(String(r.status)))))
    .then((d) => d.players)
    .catch(() => { cache = null; return []; });
  return cache;
}
