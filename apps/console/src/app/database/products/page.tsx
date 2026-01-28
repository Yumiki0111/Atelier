"use client";

import { ProductsTable } from "@/features/products/components/ProductsTable";
import { useProducts } from "@/features/products/useProducts";
import { useProductSelection } from "@/contexts/ProductSelectionContext";

export default function ProductsPage() {
  const { data: products = [], isLoading, error } = useProducts();
  const { selectProduct, selectedProduct, selectedSize } = useProductSelection();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  if (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "商品データの取得に失敗しました";
    
    const errorDetails = (error as any)?.details;
    const isDatabaseNotConfigured = 
      errorMessage.includes("Database not configured") ||
      errorMessage.includes("NEXT_PUBLIC_SUPABASE_URL");
    
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">商品データベース</h1>
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800 font-medium">エラーが発生しました</p>
          <p className="text-red-600 text-sm mt-1 font-semibold">{errorMessage}</p>
          
          {isDatabaseNotConfigured && (
            <div className="mt-4 space-y-3">
              <div className="bg-white p-3 rounded border border-red-200">
                <p className="text-red-800 font-medium text-sm mb-2">
                  📝 環境変数の設定手順:
                </p>
                <ol className="text-red-700 text-sm list-decimal list-inside space-y-1">
                  <li>
                    <code className="bg-gray-100 px-1 rounded">apps/console/.env.local</code> ファイルを作成
                  </li>
                  <li>以下の環境変数を設定:</li>
                </ol>
                <pre className="mt-2 p-2 bg-gray-900 text-green-400 text-xs rounded overflow-x-auto">
{`NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key`}
                </pre>
                <p className="text-red-700 text-xs mt-2">
                  💡 Supabase Dashboard の Settings → API から値を取得できます
                </p>
              </div>
              
              <div className="bg-white p-3 rounded border border-red-200">
                <p className="text-red-800 font-medium text-sm mb-2">
                  🗄️ データベースのセットアップ:
                </p>
                <ol className="text-red-700 text-sm list-decimal list-inside space-y-1">
                  <li>Supabase Dashboard の SQL Editor を開く</li>
                  <li>
                    <code className="bg-gray-100 px-1 rounded">apps/console/supabase/migrations/001_initial_schema.sql</code> の内容を実行
                  </li>
                </ol>
              </div>
              
              <p className="text-red-600 text-xs mt-2">
                ⚠️ 環境変数を設定した後は、開発サーバーを再起動してください
              </p>
            </div>
          )}
          
          {errorDetails && !isDatabaseNotConfigured && (
            <div className="mt-3 p-2 bg-red-100 rounded text-xs">
              <p className="text-red-800 font-medium">詳細情報:</p>
              <pre className="text-red-700 mt-1 whitespace-pre-wrap">
                {JSON.stringify(errorDetails, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">商品データベース</h1>
      </div>
      {products.length === 0 ? (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-blue-800 font-medium">商品が登録されていません</p>
            <p className="text-blue-600 text-sm mt-1">
              下の「商品を追加」ボタンから商品を追加してください。
            </p>
          </div>
          <ProductsTable
            products={products}
            onProductSelect={selectProduct}
            selectedProductId={selectedProduct?.id}
            selectedSize={selectedSize}
          />
        </div>
      ) : (
        <ProductsTable
          products={products}
          onProductSelect={selectProduct}
          selectedProductId={selectedProduct?.id}
          selectedSize={selectedSize}
        />
      )}
    </div>
  );
}
