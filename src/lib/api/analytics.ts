import { apiClient } from "./client";
import type { ActivityEvent, AnalyticsOverview, DashboardStats } from "@/types";

export type AnalyticsRange = "7d" | "30d" | "90d";

export const analyticsApi = {
  dashboardStats: async () => {
    const { data } = await apiClient.get<DashboardStats>("/analytics/dashboard");
    return data;
  },

  activity: async (limit = 15) => {
    const { data } = await apiClient.get<ActivityEvent[]>(
      "/analytics/activity",
      { params: { limit } },
    );
    return data;
  },

  overview: async (range: AnalyticsRange) => {
    const { data } = await apiClient.get<AnalyticsOverview>(
      "/analytics/overview",
      { params: { range } },
    );
    return data;
  },
};
