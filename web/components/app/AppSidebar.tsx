"use client";
import { useTranslations } from "next-intl";
import { BarChart3, Crosshair, FlaskConical, LayoutDashboard, PlayCircle, Shield, Users } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail,
} from "@/components/ui/sidebar";

const ITEMS = [
  { href: "/", key: "overview", icon: LayoutDashboard },
  { href: "/gameplan", key: "gameplan", icon: Crosshair },
  { href: "/players", key: "players", icon: Users },
  { href: "/defenses", key: "defenses", icon: Shield },
  { href: "/replays", key: "replays", icon: PlayCircle },
  { href: "/method", key: "method", icon: FlaskConical },
] as const;

export default function AppSidebar() {
  const t = useTranslations("Nav");
  const m = useTranslations("Meta");
  const pathname = usePathname();
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <BarChart3 />
                </div>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-bold">{m("title")}</span>
                  <span className="truncate text-xs text-muted-foreground">{m("tagline")}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("group")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {ITEMS.map(({ href, key, icon: Icon }) => (
                <SidebarMenuItem key={key}>
                  <SidebarMenuButton asChild isActive={href === "/" ? pathname === "/" : pathname.startsWith(href)} tooltip={t(key)}>
                    <Link href={href}>
                      <Icon />
                      <span>{t(key)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <p className="px-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">{m("season")}</p>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
