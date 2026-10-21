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
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{t("title")}</h1>
      <Card>
        <CardHeader><CardTitle>{t("defsTitle")}</CardTitle></CardHeader>
        <CardContent>
          <Accordion type="single" collapsible defaultValue="soe">
            {defs.map((k) => (
              <AccordionItem key={k} value={k}>
                <AccordionTrigger className="text-base">{t(`def.${k}.name`)}</AccordionTrigger>
                <AccordionContent className="text-base text-muted-foreground">{t(`def.${k}.text`)}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{t("limitsTitle")}</CardTitle></CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-3 text-base">
            {limits.map((b) => (<li key={b} className="flex gap-3"><span className="text-primary">●</span><span>{t(b, vals)}</span></li>))}
          </ul>
        </CardContent>
      </Card>
      <p className="text-sm text-muted-foreground">{t("foot")}</p>
    </div>
  );
}
