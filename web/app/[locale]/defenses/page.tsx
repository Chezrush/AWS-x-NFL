import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { loadTeams } from "@/lib/data";
import DefensesView from "@/components/pages/DefensesView";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale((await params).locale);
  const t = await getTranslations("Defenses");
  const teams = await loadTeams();
  if (!teams) return <Empty><EmptyHeader><EmptyTitle>{t("missingTitle")}</EmptyTitle><EmptyDescription>{t("missingDesc")}</EmptyDescription></EmptyHeader></Empty>;
  return <Suspense><DefensesView data={teams} /></Suspense>;
}
