"use client";

import { FileText, MessageSquare, Users } from "lucide-react";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { StatCard } from "@/components/dashboard/stat-card";
import { StorageCard } from "@/components/dashboard/storage-card";
import { PageHeader } from "@/components/shared/page-header";
import { StatCardsSkeleton } from "@/components/shared/loading-skeletons";
import { useDashboardStats } from "@/hooks/use-analytics";
import { formatNumber } from "@/lib/format";
import { useOrgStore, selectActiveOrg } from "@/stores/org-store";

export default function DashboardPage() {
  const activeOrg = useOrgStore(selectActiveOrg);
  const { data: stats, isLoading } = useDashboardStats();

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <PageHeader
        title={activeOrg ? `${activeOrg.name} overview` : "Overview"}
        description="What's happening across your workspace"
      />

      {isLoading || !stats ? (
        <StatCardsSkeleton />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            index={0}
            title="Documents"
            value={formatNumber(stats.documentCount)}
            delta={stats.documentDelta}
            icon={FileText}
          />
          <StatCard
            index={1}
            title="Total queries"
            value={formatNumber(stats.queryCount)}
            delta={stats.queryDelta}
            icon={MessageSquare}
          />
          <StatCard
            index={2}
            title="Active users"
            value={formatNumber(stats.activeUsers)}
            delta={stats.activeUsersDelta}
            icon={Users}
          />
          <StorageCard
            usedBytes={stats.storageUsedBytes}
            limitBytes={stats.storageLimitBytes}
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ActivityFeed />
        </div>
        <div className="space-y-4">
          {/* room for quick actions / plan usage widgets */}
        </div>
      </div>
    </div>
  );
}
