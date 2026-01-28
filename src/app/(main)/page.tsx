"use client";

import { useProducts } from "@/features/products/useProducts";
import { useProductSelection } from "@/contexts/ProductSelectionContext";
import { Package, TrendingUp, ShoppingCart, Users, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  const { data: products = [], isLoading } = useProducts();
  const { viewStats } = useProductSelection();

  // モックデータ（実際の実装ではAPIから取得）
  const companyName = "株式会社サンプル";
  const stats = [
    {
      label: "総商品数",
      value: products.length,
      icon: Package,
    },
    {
      label: "今月の閲覧数",
      value: viewStats.totalViews.toLocaleString(),
      icon: TrendingUp,
    },
    {
      label: "カート追加数",
      value: "1,234",
      icon: ShoppingCart,
    },
    {
      label: "アクティブユーザー",
      value: "567",
      icon: Users,
    },
  ];

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
      {/* 会社名タイトル */}
      <div>
        <h1 className="text-2xl font-semibold">{companyName}</h1>
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

      {/* 最近のアクティビティ */}
      <div className="bg-white rounded-md border">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">最近のアクティビティ</h2>
        </div>
        <div className="divide-y">
          {products.slice(0, 5).map((product) => (
            <div
              key={product.id}
              className="flex items-center justify-between px-6 py-4"
            >
              <div>
                <p className="font-medium text-gray-900">{product.name}</p>
                <p className="text-sm text-gray-500 mt-1">{product.category}</p>
              </div>
              <span className="text-sm text-gray-600">
                {new Date().toLocaleDateString("ja-JP")}
              </span>
            </div>
          ))}
          {products.length === 0 && (
            <div className="px-6 py-8 text-center text-gray-500">
              アクティビティがありません
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
