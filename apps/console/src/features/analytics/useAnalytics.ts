"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { authenticatedFetch } from "@/lib/auth/api-client";
import type { AnalyticsResponse } from "@/features/analytics/analyticsTypes";

export type TimeRange = "24h" | "7d" | "30d" | "90d";

function startOfLocalDay(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function localCalendarDayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function fetchAnalytics(
  shopId: string,
  timeRange: TimeRange,
  productId: string | null
): Promise<AnalyticsResponse> {
  let url = `/api/analytics?shopId=${encodeURIComponent(shopId)}&timeRange=${timeRange}`;
  if (timeRange === "24h") {
    const rangeStart = startOfLocalDay();
    const rangeEnd = new Date();
    url += `&rangeStart=${encodeURIComponent(rangeStart.toISOString())}&rangeEnd=${encodeURIComponent(rangeEnd.toISOString())}`;
  }
  if (productId) {
    url += `&productId=${encodeURIComponent(productId)}`;
  }

  const response = await authenticatedFetch(url);

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

/** ショップ全体（従来の 1 本の集計） */
export function useShopAnalytics(timeRange: TimeRange = "30d") {
  const { shopId } = useAuth();
  return useQuery({
    queryKey:
      timeRange === "24h"
        ? ["analytics", "shop", shopId, timeRange, localCalendarDayKey()]
        : ["analytics", "shop", shopId, timeRange],
    queryFn: () => fetchAnalytics(shopId, timeRange, null),
    enabled: !!shopId,
  });
}

/** 登録 1 商品（events.product_id 一致）のみ。未選択時は検索しない。 */
export function useProductAnalytics(timeRange: TimeRange, productId: string | null) {
  const { shopId } = useAuth();
  return useQuery({
    queryKey:
      timeRange === "24h"
        ? ["analytics", "product", shopId, timeRange, productId, localCalendarDayKey()]
        : ["analytics", "product", shopId, timeRange, productId],
    queryFn: () => fetchAnalytics(shopId, timeRange, productId!),
    enabled: !!shopId && !!productId,
  });
}

/** @deprecated `useShopAnalytics` を推奨 */
export const useAnalytics = useShopAnalytics;
