"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, Check, ChevronsUpDown, Plus } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateOrgDialog } from "@/components/organization/create-org-dialog";
import { useOrganizations } from "@/hooks/use-organizations";
import { useOrgStore, selectActiveOrg } from "@/stores/org-store";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

export function OrgSwitcher({ collapsed = false }: { collapsed?: boolean }) {
  useOrganizations(); // keeps the store hydrated
  const organizations = useOrgStore((s) => s.organizations);
  const activeOrg = useOrgStore(selectActiveOrg);
  const switchOrganization = useOrgStore((s) => s.switchOrganization);
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

  const handleSwitch = (orgId: string) => {
    if (orgId === activeOrg?.id) return;
    switchOrganization(orgId);
    // every org-scoped query must refetch under the new tenant
    void queryClient.invalidateQueries();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "h-12 w-full justify-start gap-2 px-2",
              collapsed && "justify-center px-0",
            )}
          >
            <Avatar className="size-7 rounded-md">
              <AvatarFallback className="rounded-md text-xs">
                {activeOrg ? initials(activeOrg.name) : <Building2 className="size-4" />}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <>
                <span className="flex-1 truncate text-left text-sm font-medium">
                  {activeOrg?.name ?? "Select organization"}
                </span>
                <ChevronsUpDown className="text-muted-foreground size-4 shrink-0" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel className="text-muted-foreground text-xs">
            Organizations
          </DropdownMenuLabel>
          {organizations.map((org) => (
            <DropdownMenuItem
              key={org.id}
              onClick={() => handleSwitch(org.id)}
              className="gap-2"
            >
              <Avatar className="size-6 rounded-md">
                <AvatarFallback className="rounded-md text-[10px]">
                  {initials(org.name)}
                </AvatarFallback>
              </Avatar>
              <span className="flex-1 truncate">{org.name}</span>
              <span className="text-muted-foreground text-[10px] uppercase">
                {org.role.toLowerCase()}
              </span>
              {org.id === activeOrg?.id && <Check className="size-4" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="size-4" />
            Create organization
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateOrgDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
