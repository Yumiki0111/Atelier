import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth/middleware";
import type { AnalyticsResponse, AnalyticsSeriesRow } from "@/features/analytics/analyticsTypes";

type TimeRange = "24h" | "7d" | "30d" | "90d";

const PREVIEW_LINK_EVENT_SOURCE = "preview_link";

function isPreviewLinkMeta(meta: unknown): boolean {
  if (!meta || typeof meta !== "object") return false;
  return (meta as { eventSource?: unknown }).eventSource === PREVIEW_LINK_EVENT_SOURCE;
}

function getTimeRangeDates(timeRange: TimeRange): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  const startDate = new Date();

  switch (timeRange) {
    case "24h":
      startDate.setHours(startDate.getHours() - 24);
      break;
    case "7d":
      startDate.setDate(startDate.getDate() - 7);
      break;
    case "30d":
      startDate.setDate(startDate.getDate() - 30);
      break;
    case "90d":
      startDate.setDate(startDate.getDate() - 90);
      break;
  }

  return { startDate, endDate };
}

/** DB の timestamptz と同じく UTC 日付でキー化（ローカル日付ループと混ぜない） */
function utcCalendarDayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** UTC 暦で from〜to の各日のキー（両端含む） */
function enumerateUtcDayKeysInclusive(from: Date, to: Date): string[] {
  const keys: string[] = [];
  let t = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const end = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  const dayMs = 86400000;
  for (; t <= end; t += dayMs) {
    keys.push(new Date(t).toISOString().slice(0, 10));
  }
  return keys;
}

function emptyRowFromUtcKey(dateKey: string): AnalyticsSeriesRow {
  const [y, m, d] = dateKey.split("-").map((x) => parseInt(x, 10));
  const date = new Date(y!, m! - 1, d!);
  return emptyRow(date);
}

function emptyRow(date: Date): AnalyticsSeriesRow {
  return {
    date: date.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" }),
    fullDate: date.toLocaleDateString("ja-JP"),
    widgetOpens: 0,
    bodyTryOnApplies: 0,
    sizeChanges: 0,
    addToCart: 0,
    previewLinkWidgetOpens: 0,
    previewLinkBodyTryOnApplies: 0,
    previewLinkSizeChanges: 0,
    previewLinkAddToCart: 0,
  };
}

function sumTotals(series: AnalyticsSeriesRow[]) {
  return series.reduce(
    (acc, row) => ({
      widgetOpens: acc.widgetOpens + row.widgetOpens,
      bodyTryOnApplies: acc.bodyTryOnApplies + row.bodyTryOnApplies,
      sizeChanges: acc.sizeChanges + row.sizeChanges,
      addToCart: acc.addToCart + row.addToCart,
      previewLinkWidgetOpens: acc.previewLinkWidgetOpens + row.previewLinkWidgetOpens,
      previewLinkBodyTryOnApplies: acc.previewLinkBodyTryOnApplies + row.previewLinkBodyTryOnApplies,
      previewLinkSizeChanges: acc.previewLinkSizeChanges + row.previewLinkSizeChanges,
      previewLinkAddToCart: acc.previewLinkAddToCart + row.previewLinkAddToCart,
    }),
    {
      widgetOpens: 0,
      bodyTryOnApplies: 0,
      sizeChanges: 0,
      addToCart: 0,
      previewLinkWidgetOpens: 0,
      previewLinkBodyTryOnApplies: 0,
      previewLinkSizeChanges: 0,
      previewLinkAddToCart: 0,
    }
  );
}

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const shopId = auth.shopId;
    const timeRange = (searchParams.get("timeRange") || "30d") as TimeRange;

    const { startDate, endDate } = getTimeRangeDates(timeRange);

    const { data: events, error: eventsError } = await supabaseAdmin
      .from("events")
      .select("type, created_at, product_id, meta")
      .eq("shop_id", shopId)
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())
      .order("created_at", { ascending: true });

    const eventsRows = events ?? [];
    if (eventsError) {
      const missingTable =
        eventsError.code === "PGRST205" ||
        (typeof eventsError.message === "string" &&
          eventsError.message.includes("Could not find the table"));
      if (missingTable) {
        console.warn(
          "[analytics] public.events テーブルがありません。supabase/migrations/20260407120000_create_events.sql を適用してください。"
        );
      } else {
        console.error("Error fetching events:", eventsError);
        return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
      }
    }

    const utcDayKeys = enumerateUtcDayKeysInclusive(startDate, endDate);
    const dailyData = new Map<string, AnalyticsSeriesRow>();

    utcDayKeys.forEach((dateKey) => {
      dailyData.set(dateKey, emptyRowFromUtcKey(dateKey));
    });

    eventsRows.forEach((event) => {
      const eventDate = new Date(event.created_at as string);
      const dateKey = utcCalendarDayKey(eventDate);
      let dayData = dailyData.get(dateKey);
      if (!dayData) {
        dayData = emptyRowFromUtcKey(dateKey);
        dailyData.set(dateKey, dayData);
      }

      const pl = isPreviewLinkMeta(event.meta);

      switch (event.type) {
        case "widget_open":
          dayData.widgetOpens += 1;
          if (pl) dayData.previewLinkWidgetOpens += 1;
          break;
        case "height_change":
          dayData.bodyTryOnApplies += 1;
          if (pl) dayData.previewLinkBodyTryOnApplies += 1;
          break;
        case "size_change":
          dayData.sizeChanges += 1;
          if (pl) dayData.previewLinkSizeChanges += 1;
          break;
        case "add_to_cart_click":
        case "add_to_cart":
          dayData.addToCart += 1;
          if (pl) dayData.previewLinkAddToCart += 1;
          break;
        default:
          break;
      }
    });

    const series = Array.from(dailyData.entries())
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([, row]) => row);
    const totals = sumTotals(series);

    const payload: AnalyticsResponse = { series, totals };
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Error in analytics API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
