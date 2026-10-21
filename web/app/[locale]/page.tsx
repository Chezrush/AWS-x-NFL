import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import Dashboard from "@/components/radar/Dashboard";
import { loadAll, loadRadar } from "@/lib/data";
export const dynamic = "force-dynamic";
export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  // The OTS exports are optional; the existing SOE analysis remains usable without them.
  const [fallback, initialRadar] = await Promise.all([loadAll().catch(() => null), loadRadar().catch(() => null)]);
  return <Suspense><Dashboard fallback={fallback} initialRadar={initialRadar} /></Suspense>;
}
