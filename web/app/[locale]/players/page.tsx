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
    <div className="mx-auto flex max-w-7xl flex-col gap-7">
      <header className="page-heading">
        <h1>{t("title")}</h1>
        <p className="max-w-3xl text-muted-foreground">{t("intro", { n: prof.players.length })}</p>
      </header>
      <PlayersTable players={prof.players} />
    </div>
  );
}
