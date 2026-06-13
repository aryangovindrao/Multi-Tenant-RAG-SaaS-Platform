"use client";

import { Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { InviteMemberDialog } from "@/components/organization/invite-member-dialog";
import { MembersTable } from "@/components/organization/members-table";
import { useOrgStore, selectActiveOrg, hasRole } from "@/stores/org-store";

export default function MembersPage() {
  const activeOrg = useOrgStore(selectActiveOrg);
  const canManage = hasRole(activeOrg, "ADMIN");

  if (!activeOrg) {
    return (
      <div className="mx-auto max-w-5xl p-4 md:p-8">
        <EmptyState
          icon={Users}
          title="No organization selected"
          description="Create or select an organization to manage its members."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <PageHeader
        title="Members"
        description={`People with access to ${activeOrg.name}`}
        actions={canManage ? <InviteMemberDialog orgId={activeOrg.id} /> : undefined}
      />
      <MembersTable orgId={activeOrg.id} canManage={canManage} />
    </div>
  );
}
