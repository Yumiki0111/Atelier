"use client";

import { useState } from "react";
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
import { useAnalytics, type TimeRange } from "@/features/analytics/useAnalytics";
import { PageHeader } from "@/components/page-header/PageHeader";
import { consolePageShellClass } from "@/lib/console-ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "24h", label: "過去24時間" },
  { value: "7d", label: "過去7日" },
  { value: "30d", label: "過去30日" },
  { value: "90d", label: "過去90日" },
];

/** Global Card is borderless; analytics panels need visible grouping. */
const analyticsPanelClass = cn(
  "rounded-xl border border-border bg-card text-card-foreground shadow-sm"
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

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const { data, isLoading, isError, error } = useAnalytics(timeRange);

  return (
    <div className={consolePageShellClass}>
      <PageHeader
        title="アナリティクス"
        actions={
          <div className="flex items-center gap-2">
            <label htmlFor="analytics-range" className="text-sm text-muted-foreground">
              期間
            </label>
            <select
              id="analytics-range"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              className={cn(
                "h-10 rounded-md border border-input bg-background px-3 text-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              )}
            >
              {RANGE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        }
      />

      {isLoading && (
        <p className="text-sm text-muted-foreground">読み込み中…</p>
      )}
      {isError && (
        <p className="text-sm text-destructive">
          データの取得に失敗しました。{error instanceof Error ? error.message : ""}
        </p>
      )}

      {data && (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            EC 本番のウィジェットとプレビューリンク（共有 URL）の両方を集計します。共有 URL 経由は各カード下の内訳と、グラフの破線で示します。
          </p>

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
              <CardTitle className="text-base font-semibold">日別の推移</CardTitle>
              <p className="text-xs text-muted-foreground">
                実線＝合計、破線＝プレビューリンクのみ
              </p>
            </CardHeader>
            <CardContent className="h-[min(480px,72vh)] w-full min-h-[300px] px-4 pb-4 pt-0 sm:px-6">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ fontSize: 12 }}
                    labelFormatter={(_, payload) =>
                      payload?.[0]?.payload?.fullDate ?? ""
                    }
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
        </div>
      )}
    </div>
  );
}
