import { getTranslations, setRequestLocale } from "next-intl/server";
import { loadProfiles } from "@/lib/data";
import PlayersTable from "@/components/pages/PlayersTable";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale((await params).locale);
  const t = await getTranslations("Players");
  const prof = await loadProfiles();
  if (!prof) return <Empty><EmptyHeader><EmptyTitle>{t("missingTitle")}</EmptyTitle><EmptyDescription>{t("missingDesc")}</EmptyDescription></EmptyHeader></Empty>;
  return (
    <div className="mx-auto mb-4 max-w-7xl">
      <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{t("title")}</h1>
      <p className="mt-1 max-w-3xl text-muted-foreground">{t("intro", { n: prof.players.length })}</p>
      <div className="mt-4"><PlayersTable players={prof.players} /></div>
    </div>
  );
}
