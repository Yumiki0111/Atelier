"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useProductAnalytics, useShopAnalytics, type TimeRange } from "@/features/analytics/useAnalytics";
import type { AnalyticsResponse, AnalyticsSeriesRow } from "@/features/analytics/analyticsTypes";
import { useProducts } from "@/features/products/useProducts";
import { PageHeader } from "@/components/page-header/PageHeader";
import { consolePageShellClass } from "@/lib/console-ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "24h", label: "今日（0時〜現在）" },
  { value: "7d", label: "過去7日" },
  { value: "30d", label: "過去30日" },
  { value: "90d", label: "過去90日" },
];

const analyticsPanelClass = cn(
  "rounded-xl border border-border bg-card text-card-foreground shadow-sm"
);

const rangeSelectClass = cn(
  "h-10 min-w-0 max-w-full rounded-md border border-input bg-background px-3 text-sm",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
);

type MetricSpec = {
  key: "widgetOpens" | "bodyTryOnApplies" | "sizeChanges" | "addToCart";
  previewKey:
    | "previewLinkWidgetOpens"
    | "previewLinkBodyTryOnApplies"
    | "previewLinkSizeChanges"
    | "previewLinkAddToCart";
  title: string;
  chartName: string;
  strokeVar: string;
};

const METRICS: MetricSpec[] = [
  {
    key: "widgetOpens",
    previewKey: "previewLinkWidgetOpens",
    title: "ウィジェットを開いた",
    chartName: "ウィジェットを開いた",
    strokeVar: "var(--primary)",
  },
  {
    key: "bodyTryOnApplies",
    previewKey: "previewLinkBodyTryOnApplies",
    title: "体型を反映して試着",
    chartName: "体型を反映して試着",
    strokeVar: "var(--chart-2)",
  },
  {
    key: "sizeChanges",
    previewKey: "previewLinkSizeChanges",
    title: "サイズ変更",
    chartName: "サイズ変更",
    strokeVar: "var(--chart-3)",
  },
  {
    key: "addToCart",
    previewKey: "previewLinkAddToCart",
    title: "カートに追加",
    chartName: "カートに追加",
    strokeVar: "var(--chart-4)",
  },
];

function formatSeriesForChart(timeRange: TimeRange, series: AnalyticsSeriesRow[]) {
  if (timeRange !== "24h") return series;
  return series.map((row) => {
    if (!row.bucketStart) return row;
    const d = new Date(row.bucketStart);
    return {
      ...row,
      date: d.toLocaleString("ja-JP", { hour: "numeric" }),
      fullDate: d.toLocaleString("ja-JP", {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
      }),
    };
  });
}

function AnalyticsMetricsBlock({
  timeRange,
  data,
  title,
  description,
  chartDescription,
  heightClass = "h-[min(480px,72vh)] min-h-[300px]",
}: {
  timeRange: TimeRange;
  data: AnalyticsResponse;
  title: string;
  description: string;
  chartDescription: string;
  heightClass?: string;
}) {
  const chartSeries = useMemo(
    () => formatSeriesForChart(timeRange, data.series),
    [data.series, timeRange]
  );

  return (
    <>
      <p className="text-sm text-muted-foreground">{description}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {METRICS.map((m) => (
          <Card key={m.key} className={analyticsPanelClass}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {m.title}
              </CardTitle>
              <p className="pt-1 text-xl font-semibold tabular-nums text-foreground">
                {data.totals[m.key].toLocaleString("ja-JP")}
              </p>
              <p className="pt-1 text-xs text-muted-foreground tabular-nums">
                プレビューリンク: {data.totals[m.previewKey].toLocaleString("ja-JP")}
              </p>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card className={analyticsPanelClass}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          <p className="text-xs text-muted-foreground">{chartDescription}</p>
        </CardHeader>
        <CardContent className={cn("w-full px-4 pb-4 pt-0 sm:px-6", heightClass)}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                minTickGap={timeRange === "24h" ? 4 : 8}
                interval={timeRange === "24h" ? 0 : "preserveStartEnd"}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ fontSize: 12 }}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate ?? ""}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {METRICS.map((m) => (
                <Line
                  key={m.key}
                  type="monotone"
                  dataKey={m.key}
                  name={`${m.chartName}（合計）`}
                  stroke={m.strokeVar}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 4 }}
                />
              ))}
              {METRICS.map((m) => (
                <Line
                  key={`pl-${m.key}`}
                  type="monotone"
                  dataKey={m.previewKey}
                  name={`${m.chartName}（プレビューリンク）`}
                  stroke={m.strokeVar}
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={{ r: 2 }}
                  activeDot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </>
  );
}

export default function AnalyticsPage() {
  const [shopTimeRange, setShopTimeRange] = useState<TimeRange>("30d");
  const [productTimeRange, setProductTimeRange] = useState<TimeRange>("30d");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const { data: products = [], isLoading: productsLoading } = useProducts();
  const shopQ = useShopAnalytics(shopTimeRange);
  const productQ = useProductAnalytics(productTimeRange, selectedProductId);

  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => a.name.localeCompare(b.name, "ja")),
    [products]
  );

  const selectedProductName = useMemo(
    () => (selectedProductId ? sortedProducts.find((p) => p.id === selectedProductId)?.name : null),
    [selectedProductId, sortedProducts]
  );

  return (
    <div className={consolePageShellClass}>
      <PageHeader title="アナリティクス" />

      <div className="space-y-10">
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
            <h2 className="text-sm font-semibold text-foreground">ショップ全体</h2>
            <div className="flex flex-wrap items-center gap-3 sm:justify-end">
              <div className="flex items-center gap-2">
                <label htmlFor="analytics-shop-range" className="shrink-0 text-sm text-muted-foreground">
                  期間
                </label>
                <select
                  id="analytics-shop-range"
                  value={shopTimeRange}
                  onChange={(e) => setShopTimeRange(e.target.value as TimeRange)}
                  className={cn(rangeSelectClass, "min-w-[12rem]")}
                >
                  {RANGE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {shopQ.isLoading && <p className="text-sm text-muted-foreground">読み込み中…</p>}
          {shopQ.isError && (
            <p className="text-sm text-destructive">
              ショップ全体の集計に失敗しました。{shopQ.error instanceof Error ? shopQ.error.message : ""}
            </p>
          )}

          {shopQ.data && (
            <AnalyticsMetricsBlock
              timeRange={shopTimeRange}
              data={shopQ.data}
              title={`推移 — ${shopTimeRange === "24h" ? "今日（1時間ごと）" : "日別"}`}
              description="店舗の EC 本番ウィジェットとプレビューリンク（共有 URL）の両方を合算します。破線はプレビューリンク経由の内訳です。"
              chartDescription={`実線＝合計、破線＝プレビューリンクのみ${
                shopTimeRange === "24h"
                  ? "。今日0時から現在までを1時間ごとに集計し、横軸は各時間台（この端末のタイムゾーン）です。"
                  : ""
              }`}
            />
          )}
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
            <h2 className="text-sm font-semibold text-foreground">商品別</h2>
            <div className="flex w-full min-w-0 max-w-2xl flex-col gap-3 sm:ml-auto sm:w-auto sm:flex-row sm:flex-wrap sm:items-end sm:justify-end">
              <div className="flex min-w-0 items-center gap-2">
                <label htmlFor="analytics-product-range" className="shrink-0 text-sm text-muted-foreground">
                  期間
                </label>
                <select
                  id="analytics-product-range"
                  value={productTimeRange}
                  onChange={(e) => setProductTimeRange(e.target.value as TimeRange)}
                  className={cn(rangeSelectClass, "min-w-[12rem] flex-1 sm:flex-initial")}
                >
                  {RANGE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex min-w-0 flex-1 items-center gap-2 sm:min-w-[14rem] sm:flex-initial">
                <label htmlFor="analytics-pick-product" className="shrink-0 text-sm text-muted-foreground">
                  商品
                </label>
                <select
                  id="analytics-pick-product"
                  value={selectedProductId ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSelectedProductId(v === "" ? null : v);
                  }}
                  disabled={productsLoading}
                  className={cn(rangeSelectClass, "min-w-0 flex-1")}
                >
                  <option value="">（未選択）</option>
                  {sortedProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            上の <span className="text-foreground">期間</span> と <span className="text-foreground">商品</span>{" "}
            はショップ全体とは独立です。商品を選ぶと <code className="text-xs">product_id</code>{" "}
            一致のイベントだけを集計し、同じ 4 指標・8 本の推移を表示します。未選択のときはグラフは出ません。
          </p>

          {selectedProductId == null && !productsLoading && sortedProducts.length === 0 && (
            <p className="text-sm text-muted-foreground">登録商品がありません。</p>
          )}

          {selectedProductId != null && productQ.isLoading && (
            <p className="text-sm text-muted-foreground">商品データを読み込み中…</p>
          )}

          {selectedProductId != null && productQ.isError && (
            <p className="text-sm text-destructive">
              この商品の集計に失敗しました。{productQ.error instanceof Error ? productQ.error.message : ""}
            </p>
          )}

          {selectedProductId != null && productQ.data && (
            <AnalyticsMetricsBlock
              timeRange={productTimeRange}
              data={productQ.data}
              title={
                selectedProductName
                  ? `「${selectedProductName}」の推移 — ${
                      productTimeRange === "24h" ? "今日（1時間ごと）" : "日別"
                    }`
                  : "選択商品の推移"
              }
              description="この商品の events 行（product_id が一致）だけを集計しています。未紐づきのイベントは含みません。破線はプレビューリンク経由です。"
              chartDescription={`実線＝合計、破線＝プレビューリンクのみ${
                productTimeRange === "24h"
                  ? "。今日0時から現在までを1時間ごとに集計し、横軸は各時間台（この端末のタイムゾーン）です。"
                  : ""
              }`}
            />
          )}
        </section>
      </div>
    </div>
  );
}
