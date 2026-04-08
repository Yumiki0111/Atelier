"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Script from "next/script";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useProducts } from "@/features/products/useProducts";
import { useAuth } from "@/contexts/AuthContext";
import { authenticatedFetch } from "@/lib/auth/api-client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { isWidgetAllowedHost } from "@/lib/widget-allowed-domains";

interface WidgetKey {
  id: string;
  shop_id: string;
  public_key: string;
  allowed_domains: string[];
  enabled: boolean;
}

async function fetchWidgetKeys(shopId: string): Promise<WidgetKey[]> {
  const response = await authenticatedFetch(`/api/widget-keys?shopId=${encodeURIComponent(shopId)}`);
  if (!response.ok) throw new Error("Failed to fetch widget keys");
  return response.json();
}

const DEMO_SIZES = ["S", "M", "L"] as const;

export default function WidgetEmbedDemoPage() {
  const { shopId } = useAuth();
  const { data: products = [], isLoading: productsLoading } = useProducts();
  const { data: widgetKeys = [], isLoading: keysLoading } = useQuery({
    queryKey: ["widget-keys", shopId],
    queryFn: () => fetchWidgetKeys(shopId!),
    enabled: !!shopId,
  });

  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  /** 商品に外部IDがない場合や、別IDで試したいとき用（優先して使う） */
  const [manualExternalId, setManualExternalId] = useState("");
  const [widgetUrl, setWidgetUrl] = useState("");

  useEffect(() => {
    const envUrl = process.env.NEXT_PUBLIC_WIDGET_CDN_URL;
    if (envUrl) setWidgetUrl(envUrl);
    else if (typeof window !== "undefined") setWidgetUrl(`${window.location.origin}/widget.js`);
  }, []);

  const publicKey = widgetKeys.find((k) => k.enabled)?.public_key;
  const activeKey = widgetKeys.find((k) => k.enabled);
  const selectedProduct = selectedProductId ? products.find((p) => p.id === selectedProductId) : null;
  const productExternalId = selectedProduct?.externalProductId?.trim();
  const effectiveExternalId = manualExternalId.trim() || productExternalId || "";
  const hasAnyRegisteredExternalId = products.some((p) => !!p.externalProductId?.trim());

  const isLocal =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
  /** API と同じ基準（例: 許可に localhost:3000 があれば localhost:3000 で一致） */
  const currentHostAllowed = activeKey
    ? isWidgetAllowedHost(
        typeof window !== "undefined" ? window.location.host : "",
        activeKey.allowed_domains
      )
    : false;

  const loading = productsLoading || keysLoading;

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  if (!publicKey) {
    return (
      <div className="space-y-4">
        <Link
          href="/install"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          埋め込みスニペットに戻る
        </Link>
        <p className="text-gray-700">有効な Widget キーがありません。設定でキーを有効化してください。</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/install"
          className="mb-4 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          埋め込みスニペットに戻る
        </Link>
        <h1 className="text-2xl font-semibold">埋め込みデモ（サイズ欄インライン）</h1>
        <p className="mt-2 text-gray-600">
          外部ECを想定した一覧です。下の表の「試着」列に、実際の{" "}
          <code className="rounded bg-gray-100 px-1 text-sm">widget.js</code> トリガーが表示されます。
        </p>
      </div>

      {isLocal && !currentHostAllowed && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          このページのオリジン（例:{" "}
          <code className="rounded bg-amber-100 px-1">
            {typeof window !== "undefined" ? window.location.host : "localhost:3000"}
          </code>
          ）が Widget キーの<strong>許可ドメイン</strong>と一致していません。一覧に{" "}
          <strong>ポート付き</strong>（<code className="rounded bg-amber-100 px-1">localhost:3000</code> など）で
          追加するか、API の Origin と同じ文字列を登録してください（未一致だと{" "}
          <code className="rounded bg-amber-100 px-1">localhost</code> だけでは{" "}
          <code className="rounded bg-amber-100 px-1">localhost:3000</code> からのリクエストは 403 になります）。
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="demo-product">デモで使う商品</Label>
        <Select
          value={selectedProductId || "none"}
          onValueChange={(v) => setSelectedProductId(v === "none" ? null : v)}
        >
          <SelectTrigger id="demo-product">
            <SelectValue placeholder="商品を選択" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">選択してください</SelectItem>
            {products.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
                {p.externalProductId ? `（外部ID: ${p.externalProductId}）` : "（外部ID未設定）"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-gray-500">
          試着 API は <code className="rounded bg-gray-100 px-1 text-xs">external_product_id</code>{" "}
          で商品を引きます。商品に未設定でも、下の手入力に<strong>コンソールへ登録済みの ID</strong>を入れれば同じように表示できます（3D アセットがその商品に必要です）。
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="demo-external-id">外部商品 ID（手入力・任意）</Label>
        <Input
          id="demo-external-id"
          value={manualExternalId}
          onChange={(e) => setManualExternalId(e.target.value)}
          placeholder="商品に未設定のとき、登録済みの external_product_id を入力"
          className="font-mono text-sm"
        />
        <p className="text-xs text-gray-500">
          空のときは、選択した商品に保存されている外部 ID を使います。手入力はそれより優先されます。
        </p>
      </div>

      {!effectiveExternalId && (
        <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800">
          <p className="font-medium text-gray-900">外部商品 ID がまだ無い場合</p>
          <p>
            EC 側の商品 ID と対応づける{" "}
            <code className="rounded bg-white px-1 text-xs">external_product_id</code> が{" "}
            <strong>コンソールのどの商品にも無い</strong>と、公開 API は商品を返せず、埋め込み試着もできません（手入力しても存在しない ID では同じです）。
          </p>
          <ul className="list-inside list-disc space-y-1 text-gray-700">
            <li>
              <Link href="/database/products" className="font-medium text-blue-700 underline underline-offset-2 hover:text-blue-900">
                商品データベース
              </Link>
              で商品を開き、<strong>外部商品 ID</strong> に EC の SKU / 商品コードなどを登録する
            </li>
            <li>または CSV インポートで <code className="rounded bg-white px-1 text-xs">external_product_id</code> 列を入れる</li>
            <li>その商品に 3D アセット（サイズ別 GLB 等）が紐づいていること</li>
          </ul>
          {!hasAnyRegisteredExternalId && products.length > 0 && (
            <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
              現在のショップでは、商品に外部 ID がまだ1件も設定されていません。上記の手順で登録してから、再度このデモを開いてください。
            </p>
          )}
          {products.length === 0 && (
            <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
              商品がまだありません。先に商品を作成し、外部商品 ID とアセットを登録してください。
            </p>
          )}
          {hasAnyRegisteredExternalId && (
            <p className="text-gray-600">
              登録済みの ID があれば、上の「手入力」にその文字列を入れるか、外部 ID 付きの商品を選ぶと下にボタンが出ます。
            </p>
          )}
        </div>
      )}

      {effectiveExternalId && (
        <>
          <div className="rounded-lg border border-gray-200 bg-white">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium">サイズ</th>
                  <th className="px-4 py-3 text-left font-medium">試着（インライン）</th>
                </tr>
              </thead>
              <tbody>
                {DEMO_SIZES.map((size) => (
                  <tr key={size} className="border-b border-gray-100">
                    <td className="px-4 py-3 font-semibold">{size}</td>
                    <td className="px-4 py-3 align-middle">
                      {/* key で商品切替時にホストを再マウントし、ウィジェットを再初期化 */}
                      <div
                        key={`${selectedProductId}-${publicKey}-${size}`}
                        className="inline-block align-middle"
                        data-fitlook-public-key={publicKey}
                        data-fitlook-external-product-id={effectiveExternalId}
                        data-fitlook-placement="inline"
                        data-fitlook-initial-size={size}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-500">
            静的ファイル版:{" "}
            <a className="underline" href="/demo-embedded-ec.html" target="_blank" rel="noreferrer">
              /demo-embedded-ec.html
            </a>
          </p>
        </>
      )}

      {widgetUrl && (
        <Script src={widgetUrl} strategy="afterInteractive" />
      )}
    </div>
  );
}
