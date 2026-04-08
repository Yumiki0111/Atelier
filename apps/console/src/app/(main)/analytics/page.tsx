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
import { Card, CardContent } from "@/components/ui/card";
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

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const { data, isLoading, isError, error } = useAnalytics(timeRange);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">アナリティクス</h1>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="analytics-range" className="text-sm text-muted-foreground">
            期間
          </label>
          <select
            id="analytics-range"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            className={cn(
              "rounded-md border border-input bg-background px-3 py-2 text-sm",
              "shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}
          >
            {RANGE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground">読み込み中…</p>
      )}
      {isError && (
        <p className="text-sm text-destructive">
          データの取得に失敗しました。{error instanceof Error ? error.message : ""}
        </p>
      )}

      {data && (
        <>
          <p className="text-sm text-muted-foreground">
            <span className="text-foreground/80">期間合計</span>
            <span className="mx-2 text-border">·</span>
            <span>試着開封 {data.totals.widgetOpens.toLocaleString("ja-JP")}</span>
            <span className="mx-2 text-border">·</span>
            <span>カート {data.totals.addToCart.toLocaleString("ja-JP")}</span>
            <span className="mx-2 text-border">·</span>
            <span>開封→カート {pct(data.rates.openToCartRate)}</span>
          </p>

          <Card>
            <CardContent className="h-[min(420px,70vh)] w-full min-h-[280px] pt-6">
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
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="addToCart"
                    name="カート追加"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="cubeClicks"
                    name="ボタンクリック"
                    stroke="#94a3b8"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
