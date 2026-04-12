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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "24h", label: "過去24時間" },
  { value: "7d", label: "過去7日" },
  { value: "30d", label: "過去30日" },
  { value: "90d", label: "過去90日" },
];

function pct(n: number | null): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

/** Global Card is borderless; analytics panels need visible grouping. */
const analyticsPanelClass = cn(
  "rounded-xl border border-border bg-card text-card-foreground shadow-sm"
);

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const { data, isLoading, isError, error } = useAnalytics(timeRange);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-10">
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
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className={analyticsPanelClass}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">試着開封</CardTitle>
                <p className="pt-1 text-xl font-semibold tabular-nums text-foreground">
                  {data.totals.widgetOpens.toLocaleString("ja-JP")}
                </p>
              </CardHeader>
            </Card>
            <Card className={analyticsPanelClass}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">カート追加</CardTitle>
                <p className="pt-1 text-xl font-semibold tabular-nums text-foreground">
                  {data.totals.addToCart.toLocaleString("ja-JP")}
                </p>
              </CardHeader>
            </Card>
            <Card className={analyticsPanelClass}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">開封→カート</CardTitle>
                <p className="pt-1 text-xl font-semibold tabular-nums text-foreground">
                  {pct(data.rates.openToCartRate)}
                </p>
              </CardHeader>
            </Card>
          </div>

          <Card className={analyticsPanelClass}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">日別の推移</CardTitle>
            </CardHeader>
            <CardContent className="h-[min(420px,70vh)] w-full min-h-[280px] px-4 pb-4 pt-0 sm:px-6">
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
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    type="monotone"
                    dataKey="widgetOpens"
                    name="試着開封"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="addToCart"
                    name="カート追加"
                    stroke="var(--chart-2)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="cubeClicks"
                    name="ボタンクリック"
                    stroke="var(--muted-foreground)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
