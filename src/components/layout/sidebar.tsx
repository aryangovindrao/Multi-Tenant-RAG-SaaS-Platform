"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useUiStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";
import { NAV_LINKS, SETTINGS_LINKS } from "./nav-links";
import { OrgSwitcher } from "./org-switcher";

function NavItem({
  href,
  label,
  icon: Icon,
  collapsed,
}: {
  href: string;
  label: string;
  icon: typeof Sparkles;
  collapsed: boolean;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  const link = (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
        collapsed && "justify-center px-2",
      )}
    >
      <Icon className="size-4 shrink-0" />
      {!collapsed && label}
    </Link>
  );

  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

export function Sidebar() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  return (
    <aside
      className={cn(
        "bg-sidebar hidden h-svh flex-col border-r transition-[width] duration-200 md:flex",
        collapsed ? "w-16" : "w-60",
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex h-14 items-center gap-2 px-4 font-semibold",
          collapsed && "justify-center px-0",
        )}
      >
        <div className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-lg">
          <Sparkles className="size-4" />
        </div>
        {!collapsed && <span>Cortex</span>}
      </div>

      {/* Org switcher */}
      <div className="px-2">
        <OrgSwitcher collapsed={collapsed} />
      </div>

      <Separator className="my-2" />

      {/* Primary nav */}
      <nav className="flex-1 space-y-1 px-2">
        {NAV_LINKS.map((link) => (
          <NavItem key={link.href} {...link} collapsed={collapsed} />
        ))}
        <Separator className="my-3" />
        {SETTINGS_LINKS.map((link) => (
          <NavItem key={link.href} {...link} collapsed={collapsed} />
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t p-2">
        <Button
          variant="ghost"
          size="sm"
          className={cn("w-full justify-start gap-2", collapsed && "justify-center")}
          onClick={toggleSidebar}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4" />
          ) : (
            <>
              <PanelLeftClose className="size-4" />
              <span className="text-xs">Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
