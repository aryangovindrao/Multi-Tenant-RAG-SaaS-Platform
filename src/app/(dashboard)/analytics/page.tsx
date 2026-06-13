"use client";

import { useState } from "react";
import { Clock, Cpu, MessageSquare } from "lucide-react";
import {
  ActiveUsersChart,
  QueriesChart,
  TokenUsageChart,
  TopDocumentsChart,
} from "@/components/analytics/charts";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageHeader } from "@/components/shared/page-header";
import { ChartSkeleton, StatCardsSkeleton } from "@/components/shared/loading-skeletons";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAnalyticsOverview } from "@/hooks/use-analytics";
import type { AnalyticsRange } from "@/lib/api/analytics";
import { formatNumber } from "@/lib/format";

const RANGES: { value: AnalyticsRange; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
];

export default function AnalyticsPage() {
  const [range, setRange] = useState<AnalyticsRange>("30d");
  const { data, isLoading } = useAnalyticsOverview(range);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <PageHeader
        title="Analytics"
        description="Usage trends across your workspace"
        actions={
          <Tabs value={range} onValueChange={(v) => setRange(v as AnalyticsRange)}>
            <TabsList>
              {RANGES.map((r) => (
                <TabsTrigger key={r.value} value={r.value}>
                  {r.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        }
      />

      {isLoading || !data ? (
        <>
          <StatCardsSkeleton />
          <div className="grid gap-6 lg:grid-cols-2">
            <ChartSkeleton />
            <ChartSkeleton />
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              index={0}
              title="Total queries"
              value={formatNumber(data.totalQueries)}
              icon={MessageSquare}
            />
            <StatCard
              index={1}
              title="Tokens consumed"
              value={formatNumber(data.totalTokens)}
              icon={Cpu}
            />
            <StatCard
              index={2}
              title="Avg response time"
              value={`${(data.avgResponseMs / 1000).toFixed(1)}s`}
              icon={Clock}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <QueriesChart data={data.queriesOverTime} />
            <ActiveUsersChart data={data.activeUsersOverTime} />
            <TokenUsageChart data={data.tokensOverTime} />
            <TopDocumentsChart data={data.topDocuments} />
          </div>
        </>
      )}
    </div>
  );
}
