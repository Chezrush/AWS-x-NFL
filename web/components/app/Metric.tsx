"use client";
import { Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** Libelle de metrique avec infobulle d'explication (Metrics.<id>). */
export default function Metric({ id, label }: { id: string; label?: string }) {
  const t = useTranslations("Metrics");
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="inline-flex items-center gap-1 text-left text-muted-foreground hover:text-foreground">
          {label ?? t(`${id}.name`)}
          <Info className="size-3.5" aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-sm">{t(`${id}.help`)}</TooltipContent>
    </Tooltip>
  );
}
