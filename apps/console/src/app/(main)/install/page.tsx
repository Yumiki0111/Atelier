"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useProducts } from "@/features/products/useProducts";
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
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { authenticatedFetch } from "@/lib/auth/api-client";

// ウィジェットのCDN URLを環境変数から取得（未設定の場合はプレースホルダー）
const WIDGET_CDN_URL = process.env.NEXT_PUBLIC_WIDGET_CDN_URL || "https://your-cdn.example.com/widget.js";

interface WidgetKey {
  id: string;
  shop_id: string;
  public_key: string;
  allowed_domains: string[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

async function fetchWidgetKeys(shopId: string): Promise<WidgetKey[]> {
  const response = await authenticatedFetch(`/api/widget-keys?shopId=${encodeURIComponent(shopId)}`);
  if (!response.ok) {
    throw new Error("Failed to fetch widget keys");
  }
  return response.json();
}

export default function InstallPage() {
  const { shopId } = useAuth();
  const { data: products = [], isLoading: isLoadingProducts } = useProducts();
  const { data: widgetKeys = [], isLoading: isLoadingKeys } = useQuery({
    queryKey: ["widget-keys", shopId],
    queryFn: () => fetchWidgetKeys(shopId),
    enabled: !!shopId,
  });
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const selectedProduct = selectedProductId ? products.find((p) => p.id === selectedProductId) : null;
  
  // 有効な最初のpublic_keyを取得
  const publicKey = widgetKeys.find((key) => key.enabled)?.public_key;

  const generateSnippet = (externalProductId?: string) => {
    if (!publicKey) {
      return "<!-- Widgetキーが設定されていません。設定ページでWidgetキーを確認してください。 -->";
    }

    const attributes: string[] = [`data-atelier-public-key="${publicKey}"`];
    
    if (externalProductId) {
      attributes.push(`data-atelier-external-product-id="${externalProductId}"`);
    }

    return `<div
  ${attributes.join("\n  ")}>
</div>
<script async src="${WIDGET_CDN_URL}"></script>`;
  };

  const snippet = generateSnippet(selectedProduct?.externalProductId);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      toast.success("スニペットをコピーしました");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("コピーに失敗しました");
    }
  };

  const isLoading = isLoadingProducts || isLoadingKeys;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  if (!publicKey) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">埋め込みスニペット</h1>
          <p className="text-gray-600 mt-2">
            商品ページに埋め込むためのHTMLスニペットを生成します
          </p>
        </div>
        <div className="p-4 bg-yellow-50 rounded-md border border-yellow-200">
          <p className="text-sm font-medium text-yellow-900 mb-2">
            Widgetキーが設定されていません
          </p>
          <p className="text-sm text-yellow-800">
            設定ページでWidgetキーを確認してください。ショップがプロビジョニングされていない場合は、管理者に連絡してください。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">埋め込みスニペット</h1>
        <p className="text-gray-600 mt-2">
          商品ページに埋め込むためのHTMLスニペットを生成します
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="product">商品を選択（任意）</Label>
          <Select
            value={selectedProductId || "none"}
            onValueChange={(value) => setSelectedProductId(value === "none" ? null : value)}
          >
            <SelectTrigger id="product">
              <SelectValue placeholder="商品を選択（任意）" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">商品を指定しない</SelectItem>
              {products.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-gray-500">
            商品を選択しない場合、ページから自動的に商品IDを取得します（external_product_idが必要です）
          </p>
        </div>

        {selectedProduct && (
          <div className="p-4 bg-gray-50 rounded-md">
            <p className="text-sm font-medium">選択中の商品</p>
            <p className="text-sm text-gray-600">{selectedProduct.name}</p>
            {selectedProduct.externalProductId && (
              <p className="text-sm text-gray-600">外部商品ID: {selectedProduct.externalProductId}</p>
            )}
            {selectedProduct.sku && (
              <p className="text-sm text-gray-600">SKU: {selectedProduct.sku}</p>
            )}
          </div>
        )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>埋め込みスニペット</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="gap-2"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    コピーしました
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    コピー
                  </>
                )}
              </Button>
            </div>
            <div className="relative">
              <textarea
                value={snippet}
                readOnly
                className="w-full p-3 border rounded-md font-mono text-sm min-h-[100px] resize-none bg-gray-50"
              />
            </div>
          </div>

        <div className="p-4 bg-blue-50 rounded-md">
          <p className="text-sm font-medium text-blue-900 mb-2">
            使用方法
          </p>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>上記のスニペットをコピーします</li>
            <li>商品ページのHTMLに貼り付けます</li>
            <li>
              商品IDが指定されていない場合、ウィジェットはページから自動的に商品を識別しようとします
            </li>
            <li>
              スニペットには <code className="bg-blue-100 px-1 rounded">data-atelier-public-key</code> が含まれます（必須）
            </li>
            <li>
              商品を指定する場合は <code className="bg-blue-100 px-1 rounded">data-atelier-external-product-id</code> を使用します
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
