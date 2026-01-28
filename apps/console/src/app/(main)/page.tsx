"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useProducts } from "@/features/products/useProducts";
import { useProductSelection } from "@/contexts/ProductSelectionContext";
import { useAnalytics } from "@/features/analytics/useAnalytics";
import { Package, TrendingUp, ShoppingCart, MessageSquare, ArrowRight } from "lucide-react";
import Link from "next/link";
import { authenticatedFetch } from "@/lib/auth/api-client";

export default function HomePage() {
  const router = useRouter();
  const { shopId } = useAuth();
  const { data: products = [], isLoading: isLoadingProducts } = useProducts();
  const { viewStats } = useProductSelection();
  const { data: analyticsData = [], isLoading: isLoadingAnalytics } = useAnalytics("7d");
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);
  const [shopName, setShopName] = useState<string | null>(null);

  // オンボーディングチェック
  useEffect(() => {
    const checkOnboarding = async () => {
      if (!shopId) return;

      try {
        // プロフィール情報を取得（name が設定されているかチェック）
        const profileResponse = await authenticatedFetch("/api/auth/profile");
        let userName: string | null = null;
        
        if (profileResponse.ok) {
          const profile = await profileResponse.json();
          userName = profile.name || null;
        }

        // shops テーブルから現在のショップ名を取得
        const shopResponse = await authenticatedFetch(`/api/shops/${shopId}`);
        
        if (shopResponse.ok) {
          const shop = await shopResponse.json();
          
          // ショップ名を state に保持（ヘッダー表示用）
          setShopName(shop.name || null);

          // ショップ名またはユーザー名が未設定の場合はオンボーディングへ
          if (!shop.name || shop.name === "新規ショップ" || !userName) {
            router.push("/onboarding");
            return;
          }
        }
      } catch (error) {
        console.error("Failed to check onboarding:", error);
      } finally {
        setIsCheckingOnboarding(false);
      }
    };

    checkOnboarding();
  }, [shopId, router]);

  // アナリティクスデータから主要メトリクスを計算
  const totalConversations = analyticsData.reduce((sum, d) => sum + d.会話数, 0);
  const totalCartAdds = analyticsData.reduce((sum, d) => sum + d.カート追加, 0);
  const totalCubeViews = analyticsData.reduce((sum, d) => sum + d.キューブ表示数, 0);
  const totalCubeClicks = analyticsData.reduce((sum, d) => sum + d.キューブクリック数, 0);

  // 最近追加された商品（作成日時でソート）
  const recentProducts = [...products]
    .sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    })
    .slice(0, 5);

  const stats = [
    {
      label: "総商品数",
      value: products.length,
      icon: Package,
    },
    {
      label: "過去7日の会話数",
      value: totalConversations.toLocaleString(),
      icon: MessageSquare,
    },
    {
      label: "過去7日のカート追加",
      value: totalCartAdds.toLocaleString(),
      icon: ShoppingCart,
    },
    {
      label: "過去7日のキューブ表示",
      value: (totalCubeViews + totalCubeClicks).toLocaleString(),
      icon: TrendingUp,
    },
  ];

  const isLoading = isLoadingProducts || isLoadingAnalytics || isCheckingOnboarding;

  const quickActions = [
    {
      title: "商品データベース",
      description: "商品の追加・編集・管理",
      href: "/database/products",
    },
    {
      title: "アナリティクス",
      description: "パフォーマンス分析とレポート",
      href: "/analytics",
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* タイトル */}
      <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">{shopName || "ダッシュボード"}</h1>
        </div>
      </div>

      {/* 統計情報 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white rounded-md border p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-semibold mt-2">{stat.value}</p>
                </div>
                <div className="p-3 bg-gray-100 rounded-lg">
                  <Icon className="h-6 w-6 text-gray-900" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* クイックアクション */}
      <div className="bg-white rounded-md border">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">クイックアクション</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center justify-between p-6 border rounded-md hover:bg-gray-50 transition-colors group"
              >
                <div>
                  <h3 className="text-base font-semibold mb-1">{action.title}</h3>
                  <p className="text-sm text-gray-600">{action.description}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-gray-900 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* 最近追加された商品 */}
      <div className="bg-white rounded-md border">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">最近追加された商品</h2>
          <Link
            href="/database/products"
            className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
          >
            すべて見る
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="divide-y">
          {recentProducts.length > 0 ? (
            recentProducts.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="font-medium text-gray-900">{product.name}</p>
                  {product.brand && (
                    <p className="text-sm text-gray-500 mt-1">{product.brand}</p>
                  )}
                </div>
                <span className="text-sm text-gray-600">
                  {product.createdAt
                    ? new Date(product.createdAt).toLocaleDateString("ja-JP")
                    : "-"}
                </span>
              </div>
            ))
          ) : (
            <div className="px-6 py-8 text-center text-gray-500">
              商品がありません
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
