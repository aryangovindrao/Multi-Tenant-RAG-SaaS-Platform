"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useUiStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";
import { NAV_LINKS, SETTINGS_LINKS } from "./nav-links";
import { OrgSwitcher } from "./org-switcher";

export function MobileNav() {
  const pathname = usePathname();
  const open = useUiStore((s) => s.mobileNavOpen);
  const setOpen = useUiStore((s) => s.setMobileNavOpen);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Menu">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="flex items-center gap-2 text-base">
            <div className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-lg">
              <Sparkles className="size-4" />
            </div>
            Cortex
          </SheetTitle>
        </SheetHeader>
        <div className="px-2 pt-2">
          <OrgSwitcher />
        </div>
        <Separator className="my-2" />
        <nav className="space-y-1 px-2">
          {[...NAV_LINKS, ...SETTINGS_LINKS].map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50",
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
