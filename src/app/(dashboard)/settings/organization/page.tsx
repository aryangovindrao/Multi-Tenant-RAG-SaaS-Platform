"use client";

import { useEffect, useState } from "react";
import { Building2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { useUpdateOrganization } from "@/hooks/use-organizations";
import { useOrgStore, selectActiveOrg, hasRole } from "@/stores/org-store";

export default function OrganizationSettingsPage() {
  const activeOrg = useOrgStore(selectActiveOrg);
  const canManage = hasRole(activeOrg, "ADMIN");
  const [name, setName] = useState(activeOrg?.name ?? "");
  const updateOrg = useUpdateOrganization(activeOrg?.id ?? "");

  useEffect(() => {
    setName(activeOrg?.name ?? "");
  }, [activeOrg?.name]);

  if (!activeOrg) {
    return (
      <div className="mx-auto max-w-3xl p-4 md:p-8">
        <EmptyState
          icon={Building2}
          title="No organization selected"
          description="Create or select an organization to manage its settings."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-8">
      <PageHeader title="Organization settings" description="Manage your workspace" />

      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>
            The organization name appears in the sidebar and on invitations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org-name">Name</Label>
            <Input
              id="org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canManage}
              className="max-w-sm"
            />
          </div>
          <div className="space-y-2">
            <Label>Plan</Label>
            <div>
              <Badge variant="secondary" className="capitalize">
                {activeOrg.plan.toLowerCase()}
              </Badge>
            </div>
          </div>
        </CardContent>
        {canManage && (
          <CardFooter className="border-t">
            <Button
              size="sm"
              disabled={
                name.trim().length < 2 ||
                name.trim() === activeOrg.name ||
                updateOrg.isPending
              }
              onClick={() => updateOrg.mutate({ name: name.trim() })}
            >
              {updateOrg.isPending && <Loader2 className="size-4 animate-spin" />}
              Save changes
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
