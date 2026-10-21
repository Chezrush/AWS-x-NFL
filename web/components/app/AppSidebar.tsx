"use client";
import { useTranslations } from "next-intl";
import { ArrowUpRight, BookOpen, Crosshair, LayoutDashboard, PlayCircle, Shield, Users, X } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail, useSidebar,
} from "@/components/ui/sidebar";

const ITEMS = [
  { href: "/", key: "overview", icon: LayoutDashboard },
  { href: "/gameplan", key: "gameplan", icon: Crosshair },
  { href: "/players", key: "players", icon: Users },
  { href: "/defenses", key: "defenses", icon: Shield },
  { href: "/replays", key: "replays", icon: PlayCircle },
] as const;

export default function AppSidebar() {
  const t = useTranslations("Nav");
  const m = useTranslations("Meta");
  const s = useTranslations("Studio");
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const closeMobile = () => { if (isMobile) setOpenMobile(false); };
  return (
    <Sidebar collapsible="icon" className="coach-sidebar">
      <SidebarHeader className="relative">
        <Link href="/" onClick={closeMobile} className="flex items-center gap-3 rounded-md" aria-label={m("title")}>
          <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#536c50] text-[#c5e7a2] group-data-[collapsible=icon]:size-8">
            <svg width="27" height="27" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <circle cx="8" cy="24" r="3" stroke="currentColor" strokeWidth="2" />
              <path d="M8 21v-6c0-4 3-7 7-7h10m-5-5 5 5-5 5M20 21l6 6m0-6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="block text-[1.125rem] font-bold tracking-tight text-[#f4f7ec]">{m("title")}</span>
            <span className="mt-0.5 block text-[.6875rem] tracking-wide text-[#b2c2b5]">{s("brandSub")}</span>
          </span>
        </Link>
        {isMobile && <button type="button" className="absolute right-3 top-3 grid size-8 place-items-center rounded-md text-sidebar-foreground hover:bg-sidebar-accent" onClick={closeMobile} aria-label={s("closeMenu")}><X className="size-4" /></button>}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{s("workspace")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {ITEMS.map(({ href, key, icon: Icon }) => (
                <SidebarMenuItem key={key}>
                  <SidebarMenuButton asChild isActive={href === "/" ? pathname === "/" : pathname.startsWith(href)} tooltip={t(key)}>
                    <Link href={href} onClick={closeMobile} aria-current={(href === "/" ? pathname === "/" : pathname.startsWith(href)) ? "page" : undefined}>
                      <Icon /><span>{t(key)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <div className="mx-2 mt-7 border-t border-sidebar-border pt-5 group-data-[collapsible=icon]:hidden">
          <p className="text-xs font-semibold text-[#d7e2d4]">{s("dataset")}</p>
          <p className="mt-1 text-xs leading-relaxed text-[#acbeb0]">{m("season")}</p>
        </div>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname.startsWith("/method")} tooltip={t("method")}>
              <Link href="/method" onClick={closeMobile}><BookOpen /><span>{s("methodLink")}</span><ArrowUpRight className="ml-auto size-3.5 group-data-[collapsible=icon]:hidden" /></Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="mt-5 flex items-center gap-3 border-t border-sidebar-border pt-5 group-data-[collapsible=icon]:hidden">
          <span className="grid size-9 place-items-center rounded-full bg-[#304636] text-[#d3e9bf]"><Crosshair className="size-4" /></span>
          <div><p className="text-xs font-semibold text-[#e0e8da]">{s("coachSpace")}</p><p className="text-[.6875rem] text-[#acbeb0]">AWS × NFL · Hackathon</p></div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
