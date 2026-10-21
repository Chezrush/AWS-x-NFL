import { setRequestLocale } from "next-intl/server";
import { loadAll, loadTeams } from "@/lib/data";
import GamePlan from "@/components/pages/GamePlan";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale((await params).locale);
  const [d, teams] = await Promise.all([loadAll(), loadTeams()]);
  return <GamePlan gp={d.gamePlan} tend={d.tendencies} teams={teams} />;
}
