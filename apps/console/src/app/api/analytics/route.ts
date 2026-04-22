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

function getTimeRangeDates(timeRange: Exclude<TimeRange, "24h">): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  const startDate = new Date();

  switch (timeRange) {
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

const HOUR_MS = 3600000;
const MAX_DAY_VIEW_RANGE_MS = 26 * HOUR_MS;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(s: string): boolean {
  return UUID_RE.test(s);
}

function parseIsoDateParam(v: string | null): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** `rangeStart` から `rangeEnd` まで、各時間台のバケット開始（ISO） */
function enumerateHourlyBucketStarts(rangeStart: Date, rangeEnd: Date): string[] {
  const keys: string[] = [];
  const startMs = rangeStart.getTime();
  const endMs = rangeEnd.getTime();
  for (let t = startMs; t <= endMs; t += HOUR_MS) {
    keys.push(new Date(t).toISOString());
  }
  return keys;
}

function hourBucketStartIsoForEvent(
  eventTimeMs: number,
  rangeStartMs: number,
  rangeEndMs: number
): string | null {
  const idx = Math.floor((eventTimeMs - rangeStartMs) / HOUR_MS);
  if (idx < 0) return null;
  const bucketMs = rangeStartMs + idx * HOUR_MS;
  if (bucketMs > rangeEndMs) return null;
  return new Date(bucketMs).toISOString();
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

const ZERO_SERIES_METRICS: Pick<
  AnalyticsSeriesRow,
  | "widgetOpens"
  | "bodyTryOnApplies"
  | "sizeChanges"
  | "addToCart"
  | "previewLinkWidgetOpens"
  | "previewLinkBodyTryOnApplies"
  | "previewLinkSizeChanges"
  | "previewLinkAddToCart"
> = {
  widgetOpens: 0,
  bodyTryOnApplies: 0,
  sizeChanges: 0,
  addToCart: 0,
  previewLinkWidgetOpens: 0,
  previewLinkBodyTryOnApplies: 0,
  previewLinkSizeChanges: 0,
  previewLinkAddToCart: 0,
};

function emptyRowFromHourBucket(bucketStartIso: string): AnalyticsSeriesRow {
  return {
    bucketStart: bucketStartIso,
    date: "",
    fullDate: "",
    ...ZERO_SERIES_METRICS,
  };
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
    ...ZERO_SERIES_METRICS,
  };
}

function applyEventTypeToRow(
  row: AnalyticsSeriesRow,
  eventType: string,
  meta: unknown
): void {
  const pl = isPreviewLinkMeta(meta);
  switch (eventType) {
    case "widget_open":
      row.widgetOpens += 1;
      if (pl) row.previewLinkWidgetOpens += 1;
      break;
    case "height_change":
      row.bodyTryOnApplies += 1;
      if (pl) row.previewLinkBodyTryOnApplies += 1;
      break;
    case "size_change":
      row.sizeChanges += 1;
      if (pl) row.previewLinkSizeChanges += 1;
      break;
    case "add_to_cart_click":
    case "add_to_cart":
      row.addToCart += 1;
      if (pl) row.previewLinkAddToCart += 1;
      break;
    default:
      break;
  }
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

    let startDate: Date;
    let endDate: Date;

    if (timeRange === "24h") {
      const rs = parseIsoDateParam(searchParams.get("rangeStart"));
      const re = parseIsoDateParam(searchParams.get("rangeEnd"));
      if (!rs || !re) {
        return NextResponse.json(
          { error: "24h 集計には rangeStart と rangeEnd が必要です" },
          { status: 400 }
        );
      }
      if (re.getTime() < rs.getTime()) {
        return NextResponse.json({ error: "rangeEnd は rangeStart 以降である必要があります" }, { status: 400 });
      }
      if (re.getTime() - rs.getTime() > MAX_DAY_VIEW_RANGE_MS) {
        return NextResponse.json({ error: "集計期間が長すぎます" }, { status: 400 });
      }
      startDate = rs;
      endDate = re;
    } else {
      ({ startDate, endDate } = getTimeRangeDates(timeRange));
    }

    const productIdParam = searchParams.get("productId");
    let filterProductId: string | null = null;
    if (productIdParam) {
      if (!isUuid(productIdParam)) {
        return NextResponse.json({ error: "Invalid productId" }, { status: 400 });
      }
      const { data: productRow, error: productErr } = await supabaseAdmin
        .from("products")
        .select("id")
        .eq("id", productIdParam)
        .eq("shop_id", shopId)
        .maybeSingle();
      if (productErr) {
        console.error("[analytics] product lookup", productErr);
        return NextResponse.json({ error: "Failed to validate product" }, { status: 500 });
      }
      if (!productRow) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }
      filterProductId = productIdParam;
    }

    let eventsQuery = supabaseAdmin
      .from("events")
      .select("type, created_at, product_id, meta")
      .eq("shop_id", shopId)
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())
      .order("created_at", { ascending: true });

    if (filterProductId) {
      eventsQuery = eventsQuery.eq("product_id", filterProductId);
    }

    const { data: events, error: eventsError } = await eventsQuery;

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

    const is24h = timeRange === "24h";
    const bucketKeys = is24h
      ? enumerateHourlyBucketStarts(startDate, endDate)
      : enumerateUtcDayKeysInclusive(startDate, endDate);
    const seriesByKey = new Map<string, AnalyticsSeriesRow>();

    bucketKeys.forEach((key) => {
      seriesByKey.set(key, is24h ? emptyRowFromHourBucket(key) : emptyRowFromUtcKey(key));
    });

    const rangeStartMs = startDate.getTime();
    const rangeEndMs = endDate.getTime();

    eventsRows.forEach((event) => {
      const eventDate = new Date(event.created_at as string);
      let bucketKey: string;
      if (is24h) {
        const hourKey = hourBucketStartIsoForEvent(eventDate.getTime(), rangeStartMs, rangeEndMs);
        if (!hourKey) return;
        bucketKey = hourKey;
      } else {
        bucketKey = utcCalendarDayKey(eventDate);
      }

      let row = seriesByKey.get(bucketKey);
      if (!row) {
        row = is24h ? emptyRowFromHourBucket(bucketKey) : emptyRowFromUtcKey(bucketKey);
        seriesByKey.set(bucketKey, row);
      }

      const evType = event.type as string;
      applyEventTypeToRow(row, evType, event.meta);
    });

    const series = Array.from(seriesByKey.entries())
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([, r]) => r);
    const totals = sumTotals(series);

    const payload: AnalyticsResponse = { series, totals };
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Error in analytics API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
