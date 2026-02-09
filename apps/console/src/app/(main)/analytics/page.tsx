"use client";

import { useState } from "react";
import { Eye, ShoppingCart, TrendingUp } from "lucide-react";
import { useProductSelection } from "@/contexts/ProductSelectionContext";
import { useAnalytics } from "@/features/analytics/useAnalytics";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type TimeRange = "24h" | "7d" | "30d" | "90d" | "custom";

export default function AnalyticsPage() {
  const { viewStats } = useProductSelection();
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  
  // 実データを取得（customの場合は30dを使用）
  const analyticsTimeRange = timeRange === "custom" ? "30d" : timeRange;
  const { data: chartData = [], isLoading: isLoadingAnalytics } = useAnalytics(analyticsTimeRange);
  
  // 主要メトリクスの計算
  const totalCubeViews = chartData.reduce((sum, d) => sum + d.キューブ表示数, 0);
  const totalCubeClicks = chartData.reduce((sum, d) => sum + d.キューブクリック数, 0);
  const totalWidgetOpens = chartData.reduce((sum, d) => sum + d.ウィジェット開封数, 0);
  const totalCartAdds = chartData.reduce((sum, d) => sum + d.カート追加, 0);

  const isLoading = isLoadingAnalytics;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">アナリティクス</h1>
      </div>

      <div className="space-y-6">
      {/* パフォーマンストレンド */}
      <div className="bg-white rounded-md border">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">パフォーマンストレンド</h2>
          <div className="flex gap-2">
            {[
              { value: "24h", label: "過去24時間" },
              { value: "7d", label: "過去7日間" },
              { value: "30d", label: "過去30日間" },
              { value: "90d", label: "過去90日間" },
              { value: "custom", label: "カスタム範囲" },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setTimeRange(option.value as TimeRange)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  timeRange === option.value
                    ? "bg-black text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="p-6">
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                stroke="#6b7280"
                style={{ fontSize: "12px" }}
                interval={timeRange === "30d" ? 3 : timeRange === "90d" ? 7 : 0}
              />
              <YAxis stroke="#6b7280" style={{ fontSize: "12px" }} domain={[0, "dataMax + 2"]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                }}
              />
              <Legend
                wrapperStyle={{ paddingTop: "20px" }}
                iconType="line"
              />
              <Line
                type="monotone"
                dataKey="キューブ表示数"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="キューブクリック数"
                stroke="#1e40af"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="ウィジェット開封数"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="カート追加"
                stroke="#a855f7"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 主要メトリクス */}
      <div className="bg-white rounded-md border">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">主要メトリクス</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-md">
              <div className="p-3 bg-purple-100 rounded-lg">
                <ShoppingCart className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">カート追加</p>
                <p className="text-xl font-semibold">{totalCartAdds}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-md">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Eye className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">ウィジェット開封数</p>
                <p className="text-xl font-semibold">{totalWidgetOpens}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-md">
              <div className="p-3 bg-blue-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">キューブ表示数</p>
                <p className="text-xl font-semibold">{totalCubeViews + totalCubeClicks}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
