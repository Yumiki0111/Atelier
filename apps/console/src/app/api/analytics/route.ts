import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth/middleware";
import type { AnalyticsResponse, AnalyticsSeriesRow } from "@/features/analytics/analyticsTypes";

type TimeRange = "24h" | "7d" | "30d" | "90d";

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

function generateDateRange(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  const current = new Date(start);
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

function emptyRow(date: Date): AnalyticsSeriesRow {
  return {
    date: date.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" }),
    fullDate: date.toLocaleDateString("ja-JP"),
    cubeViews: 0,
    cubeClicks: 0,
    widgetOpens: 0,
    addToCart: 0,
    sizeChanges: 0,
    heightChanges: 0,
  };
}

function sumTotals(series: AnalyticsSeriesRow[]) {
  return series.reduce(
    (acc, row) => ({
      cubeViews: acc.cubeViews + row.cubeViews,
      cubeClicks: acc.cubeClicks + row.cubeClicks,
      widgetOpens: acc.widgetOpens + row.widgetOpens,
      addToCart: acc.addToCart + row.addToCart,
      sizeChanges: acc.sizeChanges + row.sizeChanges,
      heightChanges: acc.heightChanges + row.heightChanges,
    }),
    {
      cubeViews: 0,
      cubeClicks: 0,
      widgetOpens: 0,
      addToCart: 0,
      sizeChanges: 0,
      heightChanges: 0,
    }
  );
}

function computeRates(totals: AnalyticsResponse["totals"]): AnalyticsResponse["rates"] {
  const clickThroughRate =
    totals.cubeViews > 0 ? totals.cubeClicks / totals.cubeViews : null;
  const clickToOpenRate =
    totals.cubeClicks > 0 ? totals.widgetOpens / totals.cubeClicks : null;
  const openToCartRate =
    totals.widgetOpens > 0 ? totals.addToCart / totals.widgetOpens : null;
  return { clickThroughRate, clickToOpenRate, openToCartRate };
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
      .select("type, created_at, product_id")
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

    const dateRange = generateDateRange(startDate, endDate);
    const dailyData = new Map<string, AnalyticsSeriesRow>();

    dateRange.forEach((date) => {
      const dateKey = date.toISOString().split("T")[0]!;
      dailyData.set(dateKey, emptyRow(date));
    });

    eventsRows.forEach((event) => {
      const eventDate = new Date(event.created_at as string);
      const dateKey = eventDate.toISOString().split("T")[0]!;
      const dayData = dailyData.get(dateKey);

      if (!dayData) return;

      switch (event.type) {
        case "cube_view":
          dayData.cubeViews += 1;
          break;
        case "cube_click":
          dayData.cubeClicks += 1;
          break;
        case "widget_open":
          dayData.widgetOpens += 1;
          break;
        case "add_to_cart_click":
        case "add_to_cart":
          dayData.addToCart += 1;
          break;
        case "size_change":
          dayData.sizeChanges += 1;
          break;
        case "height_change":
          dayData.heightChanges += 1;
          break;
        default:
          break;
      }
    });

    const series = Array.from(dailyData.values());
    const totals = sumTotals(series);
    const rates = computeRates(totals);

    const payload: AnalyticsResponse = { series, totals, rates };
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Error in analytics API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
