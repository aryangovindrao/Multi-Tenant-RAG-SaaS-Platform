"use client";

import { useQuery } from "@tanstack/react-query";
import { analyticsApi, type AnalyticsRange } from "@/lib/api/analytics";
import { useOrgStore } from "@/stores/org-store";

export function useDashboardStats() {
  const orgId = useOrgStore((s) => s.activeOrgId);
  return useQuery({
    queryKey: ["analytics", orgId, "dashboard"],
    queryFn: analyticsApi.dashboardStats,
    enabled: !!orgId,
    staleTime: 60_000,
  });
}

export function useActivityFeed() {
  const orgId = useOrgStore((s) => s.activeOrgId);
  return useQuery({
    queryKey: ["analytics", orgId, "activity"],
    queryFn: () => analyticsApi.activity(),
    enabled: !!orgId,
    refetchInterval: 30_000,
  });
}

export function useAnalyticsOverview(range: AnalyticsRange) {
  const orgId = useOrgStore((s) => s.activeOrgId);
  return useQuery({
    queryKey: ["analytics", orgId, "overview", range],
    queryFn: () => analyticsApi.overview(range),
    enabled: !!orgId,
    staleTime: 5 * 60_000,
  });
}
