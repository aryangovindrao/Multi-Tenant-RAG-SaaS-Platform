"use client";

import { UploadProgressIndicator } from "@/components/documents/upload-progress-indicator";
import { MobileNav } from "./mobile-nav";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

export function Topbar() {
  return (
    <header className="bg-background/80 sticky top-0 z-30 flex h-14 items-center gap-2 border-b px-4 backdrop-blur">
      <MobileNav />
      <div className="flex-1" />
      <UploadProgressIndicator />
      <ThemeToggle />
      <UserMenu />
    </header>
  );
}
