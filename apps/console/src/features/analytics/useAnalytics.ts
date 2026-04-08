"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { authenticatedFetch } from "@/lib/auth/api-client";
import type { AnalyticsResponse } from "@/features/analytics/analyticsTypes";

export type TimeRange = "24h" | "7d" | "30d" | "90d";

async function fetchAnalytics(shopId: string, timeRange: TimeRange): Promise<AnalyticsResponse> {
  const response = await authenticatedFetch(
    `/api/analytics?shopId=${encodeURIComponent(shopId)}&timeRange=${timeRange}`
  );

  if (!response.ok) {
    let detail = "";
    try {
      const body = (await response.json()) as { error?: string };
      if (body?.error) detail = ` ${body.error}`;
    } catch {
      /* ignore */
    }
    throw new Error(`Failed to fetch analytics (${response.status}).${detail}`);
  }

  return response.json();
}

export function useAnalytics(timeRange: TimeRange = "30d") {
  const { shopId } = useAuth();

  return useQuery({
    queryKey: ["analytics", shopId, timeRange],
    queryFn: () => fetchAnalytics(shopId, timeRange),
    enabled: !!shopId,
  });
}
