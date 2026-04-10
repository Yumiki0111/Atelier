"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { authenticatedFetch } from "@/lib/auth/api-client";
import { ShareDemoLinkSection } from "@/features/demo-share/ShareDemoLinkSection";

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
  const { data: widgetKeys = [], isLoading: isLoadingKeys } = useQuery({
    queryKey: ["widget-keys", shopId],
    queryFn: () => fetchWidgetKeys(shopId),
    enabled: !!shopId,
  });
  const [copied, setCopied] = useState(false);
  const [widgetUrl, setWidgetUrl] = useState<string>("");

  // ウィジェットのCDN URLを取得（環境変数が設定されていない場合は現在のドメインを使用）
  useEffect(() => {
    const envUrl = process.env.NEXT_PUBLIC_WIDGET_CDN_URL;
    if (envUrl) {
      setWidgetUrl(envUrl);
    } else if (typeof window !== "undefined") {
      // 環境変数が設定されていない場合は、現在のドメインからwidget.jsを読み込む
      setWidgetUrl(`${window.location.origin}/widget.js`);
    }
  }, []);

  // 有効な最初のpublic_keyを取得
  const publicKey = widgetKeys.find((key) => key.enabled)?.public_key;

  const [embedMode, setEmbedMode] = useState<"floating" | "inline">("floating");

  const generateSnippet = (externalProductId?: string, mode: "floating" | "inline" = "floating") => {
    if (!publicKey) {
      return "<!-- Widgetキーが設定されていません。設定ページでWidgetキーを確認してください。 -->";
    }

    if (!widgetUrl) {
      return "<!-- ウィジェットURLを読み込み中... -->";
    }

    const attributes: string[] = [`data-fitlook-public-key="${publicKey}"`];

    if (externalProductId) {
      attributes.push(`data-fitlook-external-product-id="${externalProductId}"`);
    }

    if (mode === "inline") {
      attributes.push(`data-fitlook-placement="inline"`);
      attributes.push(
        `data-fitlook-initial-size="M"`,
      );
    }

    const inlineHint =
      mode === "inline"
        ? `<!-- サイズ行ごとに data-fitlook-initial-size を在庫サイズキー（S/M/L 等）に合わせて変えてください -->\n`
        : "";

    return `${inlineHint}<div
  ${attributes.join("\n  ")}>
</div>
<script async src="${widgetUrl}"></script>`;
  };

  const snippet = generateSnippet(undefined, embedMode);

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

  const isLoading = isLoadingKeys;

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

      <ShareDemoLinkSection />

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="embed-mode">埋め込みスタイル</Label>
          <Select
            value={embedMode}
            onValueChange={(value) => setEmbedMode(value as "floating" | "inline")}
          >
            <SelectTrigger id="embed-mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="floating">フローティング（右下固定ボタン）</SelectItem>
              <SelectItem value="inline">インライン（サイズ欄・ブロック内に配置）</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-gray-500">
            インラインでは <code className="text-xs bg-gray-100 px-1 rounded">data-fitlook-placement=&quot;inline&quot;</code>{" "}
            が付き、ホスト要素の位置にトリガーが表示されます。サイズ行ごとにホストを置き、
            <code className="text-xs bg-gray-100 px-1 rounded">data-fitlook-initial-size</code> をその行のサイズキーに合わせてください。
          </p>
        </div>

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
            <li>商品ページのHTMLに貼り付けます（インラインはサイズ表のセルなどにホスト用の空 div を置きます）</li>
            <li>
              スニペットには <code className="bg-blue-100 px-1 rounded">data-fitlook-public-key</code> が含まれます（必須）
            </li>
            <li>
              EC側の商品IDは <code className="bg-blue-100 px-1 rounded">data-fitlook-external-product-id</code> でコンソールの{" "}
              <code className="bg-blue-100 px-1 rounded">external_product_id</code> と一致させます（従来の{" "}
              <code className="bg-blue-100 px-1 rounded">data-atelier-*</code> も読み取り互換）
            </li>
            <li>
              Widget キーの <strong>許可ドメイン</strong>に EC サイトのホストを登録してください（未登録だと API が拒否されます）
            </li>
            <li>
              ローカル検証用のサンプルページ:{" "}
              <code className="bg-blue-100 px-1 rounded">/demo-embedded-ec.html</code>（コンソール起動後に同じオリジンで開く）
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
