"use client";
import { usePlayer } from "./use-player";

/** Nom de joueur cliquable : ouvre le tiroir fiche joueur. */
export default function PlayerLink({ id, children, className = "" }: { id: number; children: React.ReactNode; className?: string }) {
  const { open } = usePlayer();
  return (
    <button type="button" onClick={() => open(id)}
      className={`rounded-sm text-left font-semibold underline-offset-4 hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring ${className}`}>
      {children}
    </button>
  );
}
