import { getTranslations, setRequestLocale } from "next-intl/server";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadAll } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Method");
  const d = await loadAll();
  const nf = new Intl.NumberFormat(locale);
  const vals = { plays: nf.format(d.players.meta.n_plays), n: nf.format(d.validation.n_targeted_routes) };
  const limits = ["b1", "b2", "b3", "b4", "b6", "b5"] as const;
  const defs = ["soe", "epa", "toe", "cover"] as const;
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-7">
      <header className="page-heading">
        <h1>{t("title")}</h1>
        <p className="max-w-3xl text-muted-foreground">{t("intro")}</p>
      </header>
      <Card>
        <CardHeader><CardTitle>{t("defsTitle")}</CardTitle></CardHeader>
        <CardContent>
          <Accordion type="single" collapsible defaultValue="soe">
            {defs.map((k) => (
              <AccordionItem key={k} value={k}>
                <AccordionTrigger className="py-5 text-left text-base font-semibold">{t(`def.${k}.name`)}</AccordionTrigger>
                <AccordionContent className="max-w-[70ch] pb-5 text-sm leading-relaxed text-muted-foreground">{t(`def.${k}.text`)}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{t("limitsTitle")}</CardTitle></CardHeader>
        <CardContent>
          <ul className="flex max-w-[75ch] list-disc flex-col gap-5 pl-5 text-sm leading-relaxed marker:text-muted-foreground">
            {limits.map((b) => <li key={b} className="pl-2">{t(b, vals)}</li>)}
          </ul>
        </CardContent>
      </Card>
      <p className="border-t pt-5 text-xs leading-relaxed text-muted-foreground">{t("foot")}</p>
    </div>
  );
}
