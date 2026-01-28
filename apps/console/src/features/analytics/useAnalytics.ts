"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

type TimeRange = "24h" | "7d" | "30d" | "90d";

interface AnalyticsData {
  date: string;
  fullDate: string;
  キューブ表示数: number;
  キューブクリック数: number;
  ウィジェット開封数: number;
  会話数: number;
  メッセージ数: number;
  カート追加: number;
}

async function fetchAnalytics(shopId: string, timeRange: TimeRange): Promise<AnalyticsData[]> {
  const response = await fetch(
    `/api/analytics?shopId=${encodeURIComponent(shopId)}&timeRange=${timeRange}`
  );
  
  if (!response.ok) {
    throw new Error("Failed to fetch analytics");
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
