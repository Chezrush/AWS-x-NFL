"use client";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Download, EllipsisVertical, Share, SquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
type Platform = "ios" | "android" | "other";

const DISMISS_KEY = "pwa-install-dismissed";
const DISMISS_DAYS = 14;

const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch {} };

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "other";
}

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

/** Propose d'installer la PWA sur mobile/tablette : bouton natif si le navigateur le permet, sinon pas-a-pas. */
export default function InstallWizard() {
  const t = useTranslations("Install");
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [platform, setPlatform] = useState<Platform>("other");
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);

  useEffect(() => {
    if (isStandalone() || !window.matchMedia("(pointer: coarse)").matches) return;
    const since = Number(read(DISMISS_KEY) ?? 0);
    if (Date.now() - since < DISMISS_DAYS * 864e5) return;
    const p = detectPlatform();
    setPlatform(p);
    const onPrompt = (e: Event) => { e.preventDefault(); setPrompt(e as InstallEvent); };
    const onInstalled = () => setOpen(false);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    const timer = window.setTimeout(() => setOpen(true), 4000);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = useCallback(() => { write(DISMISS_KEY, String(Date.now())); setOpen(false); setStep(0); }, []);

  const install = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    setPrompt(null);
    if (outcome === "accepted") setOpen(false); else dismiss();
  };

  const steps = platform === "ios"
    ? [{ icon: Share, key: "ios1" }, { icon: SquarePlus, key: "ios2" }, { icon: Download, key: "ios3" }]
    : [{ icon: EllipsisVertical, key: "other1" }, { icon: Download, key: "other2" }];
  const native = platform !== "ios" && prompt !== null;
  const last = step === steps.length - 1;
  const Icon = steps[step].icon;

  return (
    <Drawer open={open} onOpenChange={(o) => { if (!o) dismiss(); }}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>{t("title")}</DrawerTitle>
          <DrawerDescription>{native ? t("nativeBody") : t("body")}</DrawerDescription>
        </DrawerHeader>
        {!native && (
          <div className="px-4 pb-2">
            <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-4">
              <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
              <p className="text-sm"><span className="font-medium tabular-nums">{t("step", { n: step + 1, total: steps.length })}</span> · {t(steps[step].key)}</p>
            </div>
          </div>
        )}
        <DrawerFooter>
          {native ? (
            <Button size="lg" onClick={install}>{t("install")}</Button>
          ) : (
            <Button size="lg" onClick={() => (last ? dismiss() : setStep(step + 1))}>{last ? t("done") : t("next")}</Button>
          )}
          <Button size="lg" variant="ghost" onClick={dismiss}>{t("later")}</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
