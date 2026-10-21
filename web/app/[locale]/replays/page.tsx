import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { loadAll } from "@/lib/data";
import Replays from "@/components/pages/Replays";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale((await params).locale);
  const d = await loadAll();
  return <Suspense><Replays replays={d.replays} /></Suspense>;
}
