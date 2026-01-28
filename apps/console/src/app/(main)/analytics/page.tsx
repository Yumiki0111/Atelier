"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useProducts } from "@/features/products/useProducts";
import { useAuth } from "@/contexts/AuthContext";
import { authenticatedFetch } from "@/lib/auth/api-client";
import { Eye, MessageSquare, ShoppingCart, CheckCircle, Package, TrendingUp, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type TimeRange = "24h" | "7d" | "30d" | "90d" | "custom";
type TabType = "analytics" | "conversations";

interface ConversationListItem {
  id: string;
  started_at: string;
  message_count: number;
  product_id: string | null;
  product_name: string | null;
  last_message: string | null;
  last_message_at: string | null;
}

interface ConversationsResponse {
  conversations: ConversationListItem[];
  total: number;
  page: number;
  limit: number;
}

interface ConversationDetail {
  id: string;
  product_name: string | null;
  started_at: string;
  message_count: number;
  messages: Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
    created_at: string;
  }>;
}

async function fetchConversations(
  shopId: string,
  productId: string | null,
  dateFrom: string | null,
  dateTo: string | null,
  page: number,
  limit: number
): Promise<ConversationsResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  
  if (productId) {
    params.append("productId", productId);
  }
  if (dateFrom) {
    params.append("dateFrom", dateFrom);
  }
  if (dateTo) {
    params.append("dateTo", dateTo);
  }

  const response = await authenticatedFetch(
    `/api/analytics/conversations?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch conversations");
  }

  return response.json();
}

async function fetchConversationDetail(
  conversationId: string
): Promise<ConversationDetail> {
  const response = await authenticatedFetch(
    `/api/analytics/conversations/${conversationId}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch conversation detail");
  }

  return response.json();
}

export default function AnalyticsPage() {
  const { shopId } = useAuth();
  const { data: products = [], isLoading: isLoadingProducts } = useProducts();
  const { viewStats } = useProductSelection();
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [activeTab, setActiveTab] = useState<TabType>("analytics");
  
  // 会話ログ用の状態
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [page, setPage] = useState(1);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const limit = 20;
  
  // 実データを取得（customの場合は30dを使用）
  const analyticsTimeRange = timeRange === "custom" ? "30d" : timeRange;
  const { data: chartData = [], isLoading: isLoadingAnalytics } = useAnalytics(analyticsTimeRange);
  
  // 会話ログデータを取得
  const { data: conversationsData, isLoading: isLoadingConversations, error: conversationsError } = useQuery({
    queryKey: ["conversations", shopId, selectedProductId, dateFrom, dateTo, page],
    queryFn: () =>
      fetchConversations(
        shopId,
        selectedProductId,
        dateFrom || null,
        dateTo || null,
        page,
        limit
      ),
    enabled: !!shopId && activeTab === "conversations",
  });

  const {
    data: conversationDetail,
    isLoading: isLoadingDetail,
  } = useQuery({
    queryKey: ["conversation", selectedConversationId],
    queryFn: () => fetchConversationDetail(selectedConversationId!),
    enabled: !!selectedConversationId,
  });
  
  // 主要メトリクスの計算
  const totalCubeViews = chartData.reduce((sum, d) => sum + d.キューブ表示数, 0);
  const totalCubeClicks = chartData.reduce((sum, d) => sum + d.キューブクリック数, 0);
  const totalWidgetOpens = chartData.reduce((sum, d) => sum + d.ウィジェット開封数, 0);
  const totalConversations = chartData.reduce((sum, d) => sum + d.会話数, 0);
  const totalMessages = chartData.reduce((sum, d) => sum + d.メッセージ数, 0);
  const totalCartAdds = chartData.reduce((sum, d) => sum + d.カート追加, 0);

  const isLoading = isLoadingProducts || isLoadingAnalytics;
  const totalPages = conversationsData ? Math.ceil(conversationsData.total / limit) : 0;

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

      {/* タブ切り替え */}
      <div className="bg-white rounded-md border p-1 relative">
        <div className="flex gap-1 relative">
          {/* スライドインジケーター */}
          <div
            className="absolute top-1 bottom-1 bg-black rounded-md transition-all duration-300 ease-in-out"
            style={{
              left: activeTab === "analytics" ? "4px" : "calc(50% + 4px)",
              width: "calc(50% - 4px)",
            }}
          />
          <button
            onClick={() => setActiveTab("analytics")}
            className={`relative z-10 flex-1 px-6 py-3 text-sm font-medium transition-colors rounded-md ${
              activeTab === "analytics"
                ? "text-white"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            分析
          </button>
          <button
            onClick={() => setActiveTab("conversations")}
            className={`relative z-10 flex-1 px-6 py-3 text-sm font-medium transition-colors rounded-md ${
              activeTab === "conversations"
                ? "text-white"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            会話ログ
          </button>
        </div>
      </div>

      {/* 分析タブ */}
      {activeTab === "analytics" && (
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
                dataKey="会話数"
                stroke="#ec4899"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="メッセージ数"
                stroke="#f97316"
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-md">
              <div className="p-3 bg-green-100 rounded-lg">
                <MessageSquare className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">総会話数</p>
                <p className="text-xl font-semibold">{totalConversations}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-md">
              <div className="p-3 bg-blue-100 rounded-lg">
                <MessageSquare className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">総メッセージ数</p>
                <p className="text-xl font-semibold">{totalMessages}</p>
              </div>
            </div>
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
          </div>
        </div>
      </div>
        </div>
      )}

      {/* 会話ログタブ */}
      {activeTab === "conversations" && (
        <div className="space-y-6">

          {/* フィルタリングバー */}
          <div className="bg-white rounded-md border p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="product">商品</Label>
                <Select
                  value={selectedProductId || "all"}
                  onValueChange={(value) =>
                    setSelectedProductId(value === "all" ? null : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべての商品</SelectItem>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateFrom">開始日</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateTo">終了日</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* 会話一覧テーブル */}
          <div className="bg-white rounded-md border">
            {isLoadingConversations ? (
              <div className="p-8 text-center text-gray-500">読み込み中...</div>
            ) : conversationsError ? (
              <div className="p-8 text-center text-red-500">
                エラーが発生しました: {conversationsError instanceof Error ? conversationsError.message : "Unknown error"}
              </div>
            ) : !conversationsData || conversationsData.conversations.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                会話ログがありません
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>開始日時</TableHead>
                        <TableHead>商品名</TableHead>
                        <TableHead>メッセージ数</TableHead>
                        <TableHead>最新メッセージ</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {conversationsData.conversations.map((conv) => (
                        <TableRow key={conv.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <span className="text-sm">
                                {new Date(conv.started_at).toLocaleString("ja-JP")}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {conv.product_name ? (
                              <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-gray-400" />
                                <span className="text-sm">{conv.product_name}</span>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <MessageSquare className="h-4 w-4 text-gray-400" />
                              <span className="text-sm">{conv.message_count}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {conv.last_message ? (
                              <span className="text-sm text-gray-600 truncate max-w-xs block">
                                {conv.last_message}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedConversationId(conv.id)}
                            >
                              詳細を見る
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* ページネーション */}
                {totalPages > 1 && (
                  <div className="p-4 border-t flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      {conversationsData.total}件中 {(page - 1) * limit + 1}〜{Math.min(page * limit, conversationsData.total)}件を表示
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        前へ
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                      >
                        次へ
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* 会話詳細モーダル */}
      <Dialog
        open={!!selectedConversationId}
        onOpenChange={(open) => !open && setSelectedConversationId(null)}
      >
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>会話詳細</DialogTitle>
          </DialogHeader>
          {isLoadingDetail ? (
            <div className="p-8 text-center text-gray-500">読み込み中...</div>
          ) : conversationDetail ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-semibold">商品名:</span>{" "}
                  {conversationDetail.product_name || "-"}
                </div>
                <div>
                  <span className="font-semibold">開始日時:</span>{" "}
                  {new Date(conversationDetail.started_at).toLocaleString("ja-JP")}
                </div>
                <div>
                  <span className="font-semibold">メッセージ数:</span>{" "}
                  {conversationDetail.message_count}
                </div>
              </div>

              <div className="border-t pt-4 space-y-4">
                <h3 className="font-semibold">メッセージ履歴</h3>
                <div className="space-y-3">
                  {conversationDetail.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-3 rounded-lg ${
                        msg.role === "user"
                          ? "bg-blue-50 ml-8"
                          : "bg-gray-50 mr-8"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold">
                          {msg.role === "user" ? "ユーザー" : "AIアシスタント"}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(msg.created_at).toLocaleString("ja-JP")}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
