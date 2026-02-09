import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * Widget Config 公開API
 * 
 * pubkey + external_product_id から最新の3DモデルURLを返す
 * 
 * クエリパラメータ:
 * - publicKey: widget_keys.public_key（必須）
 * - externalProductId: products.external_product_id（必須）
 * 
 * レスポンス:
 * - { enabled: true, asset: { defaultSize: "M", sizes: { "S": { glbUrl: "..." }, "M": { glbUrl: "..." }, "L": { glbUrl: "..." } } } } または { enabled: false }
 */

// CORSヘッダーを設定するヘルパー関数
function setCorsHeaders(response: NextResponse, request: NextRequest): NextResponse {
  const origin = request.headers.get("origin");
  if (origin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type");
    response.headers.set("Access-Control-Allow-Credentials", "true");
  }
  return response;
}

// OPTIONS リクエスト（プリフライト）を処理
export async function OPTIONS(request: NextRequest) {
  const response = new NextResponse(null, { status: 200 });
  return setCorsHeaders(response, request);
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const publicKey = searchParams.get("publicKey");
    const externalProductId = searchParams.get("externalProductId");

    if (!publicKey || !externalProductId) {
      const response = NextResponse.json(
        { enabled: false, error: "publicKey and externalProductId are required" },
        { status: 400 }
      );
      return setCorsHeaders(response, request);
    }

    if (!supabaseAdmin) {
      console.error("[widget-config API] Database not configured");
      const response = NextResponse.json({ enabled: false }, { status: 500 });
      return setCorsHeaders(response, request);
    }

    // 1. public_key から shop_id を取得（enabled=true のみ）
    const { data: widgetKey, error: keyError } = await supabaseAdmin
      .from("widget_keys")
      .select("shop_id, allowed_domains")
      .eq("public_key", publicKey)
      .eq("enabled", true)
      .single();

    if (keyError || !widgetKey) {
      console.warn("[widget-config API] Invalid or disabled public_key:", publicKey);
      const response = NextResponse.json({ enabled: false });
      return setCorsHeaders(response, request);
    }

    // 2. ドメイン検証
    const origin = request.headers.get("origin") || request.headers.get("referer");
    if (origin) {
      try {
        const url = new URL(origin);
        const host = url.host; // 例: "example.com" または "sub.example.com"

        const allowedDomains: string[] = widgetKey.allowed_domains || [];
        
        // ドメイン検証ロジック
        const isAllowed = allowedDomains.some((domain) => {
          // 完全一致
          if (host === domain) {
            return true;
          }
          
          // サブドメイン許可（例: "example.com" が許可されていれば "sub.example.com" もOK）
          if (host.endsWith(`.${domain}`)) {
            return true;
          }
          
          return false;
        });

        if (!isAllowed) {
          console.warn("[widget-config API] Domain not allowed:", host);
          const response = NextResponse.json({ 
            enabled: false,
            error: `ドメイン "${host}" が許可されていません。設定画面で許可ドメインに追加してください。`
          });
          return setCorsHeaders(response, request);
        }

      } catch (urlError) {
        console.error("[widget-config API] Invalid origin URL:", origin, urlError);
        const response = NextResponse.json({ enabled: false });
        return setCorsHeaders(response, request);
      }
    } else {
      console.warn("[widget-config API] No origin or referer header");
      // Origin/Referer がない場合は拒否
      const response = NextResponse.json({ enabled: false });
      return setCorsHeaders(response, request);
    }

    // 3. products を (shop_id, external_product_id) で検索（category, thumbnailUrlも取得）
    const { data: product, error: productError } = await supabaseAdmin
      .from("products")
      .select("id, name, category, thumbnail_url")
      .eq("shop_id", widgetKey.shop_id)
      .eq("external_product_id", externalProductId)
      .single();

    if (productError || !product) {
      console.warn("[widget-config API] Product not found:", {
        shop_id: widgetKey.shop_id,
        external_product_id: externalProductId,
      });
      const response = NextResponse.json({ 
        enabled: false,
        error: `商品が見つかりません。external_product_id: "${externalProductId}" が正しく登録されているか確認してください。`
      });
      return setCorsHeaders(response, request);
    }

    // 4. assets を (shop_id, product_id) で取得（サイズごとに最新バージョン、カテゴリー情報も含む）
    // まずアセットを取得（productsテーブルとのJOINは後で行う）
    const { data: allAssets, error: assetsError } = await supabaseAdmin
      .from("assets")
      .select("size, glb_url, model_url, version, created_at, is_active, product_id")
      .eq("shop_id", widgetKey.shop_id)
      .eq("product_id", product.id)
      .order("size", { ascending: true })
      .order("created_at", { ascending: false });
    
    // アセットにカテゴリー情報を追加（既に取得済みのproduct.categoryを使用）
    const category = product.category || undefined;
    const assetsWithCategory = allAssets?.map(asset => ({
      ...asset,
      category,
    })) || [];


    if (assetsError) {
      console.error("[widget-config API] Error fetching assets:", assetsError);
      const response = NextResponse.json({ enabled: false, error: "Failed to fetch assets", details: assetsError.message });
      return setCorsHeaders(response, request);
    }

    if (!assetsWithCategory || assetsWithCategory.length === 0) {
      console.warn("[widget-config API] No assets found for product:", {
        productId: product.id,
        shopId: widgetKey.shop_id,
        externalProductId: externalProductId,
      });
      const response = NextResponse.json({ enabled: false, error: "No assets found for this product" });
      return setCorsHeaders(response, request);
    }

    // サイズごと、カテゴリーごとに最新バージョンのアセットを取得（is_activeがtrueのものを優先）
    // Map<size, Map<category, asset>>
    const assetsBySizeAndCategory = new Map<string, Map<string, { glbUrl?: string; modelUrl?: string; version: number; isActive: boolean; category?: string }>>();
    
    for (const asset of assetsWithCategory) {
      const size = asset.size;
      // カテゴリー情報を取得（既に追加済み）
      const category = asset.category;
      const categoryKey = category || "default"; // カテゴリーがない場合は"default"を使用
      
      // サイズごとのマップを取得または作成
      if (!assetsBySizeAndCategory.has(size)) {
        assetsBySizeAndCategory.set(size, new Map());
      }
      const categoryMap = assetsBySizeAndCategory.get(size)!;
      
      const existing = categoryMap.get(categoryKey);
      
      // まだ登録されていない、またはより新しいバージョン、またはis_activeがtrueの場合
      if (
        !existing ||
        asset.version > existing.version ||
        (asset.is_active && !existing.isActive)
      ) {
        // model_urlを優先、なければglb_urlを使用
        const modelUrl = asset.model_url || asset.glb_url;
        categoryMap.set(categoryKey, {
          glbUrl: asset.glb_url || undefined, // 後方互換性のため残す
          modelUrl: modelUrl || undefined, // GLBとFBXの両方をサポート
          version: asset.version,
          isActive: asset.is_active ?? true,
          category, // カテゴリー情報を追加
        });
      }
    }

    if (assetsBySizeAndCategory.size === 0) {
      console.warn("[widget-config API] No valid assets found for product:", product.id);
      const response = NextResponse.json({ enabled: false });
      return setCorsHeaders(response, request);
    }

    // サイズごとのアセットリストを構築（複数のカテゴリーのアセットを含む）
    const sizes: Record<string, { glbUrl?: string; modelUrl?: string; category?: string }[]> = {};
    let defaultSize: string | undefined;
    
    for (const [size, categoryMap] of assetsBySizeAndCategory.entries()) {
      // カテゴリーごとのアセットを配列に変換
      const assets: { glbUrl?: string; modelUrl?: string; category?: string }[] = [];
      for (const [categoryKey, asset] of categoryMap.entries()) {
        assets.push({
          glbUrl: asset.glbUrl || undefined, // 後方互換性のため残す
          modelUrl: asset.modelUrl || undefined, // GLBとFBXの両方をサポート
          category: asset.category, // カテゴリー情報を追加
        });
      }
      sizes[size] = assets;
      
      // デフォルトサイズは最初に見つかったサイズ、または"M"があれば"M"
      if (!defaultSize || size === "M") {
        defaultSize = size;
      }
    }

    // Mがなければ最初のサイズをデフォルトに
    if (!defaultSize) {
      defaultSize = Array.from(assetsBySizeAndCategory.keys())[0] || undefined;
    }


    // 5. 成功レスポンス（サイズごとのアセット情報を含む）
    const response = NextResponse.json({
      enabled: true,
      asset: {
        defaultSize,
        sizes,
        productName: product.name,
        thumbnailUrl: product.thumbnail_url || undefined,
      },
    });
    
    return setCorsHeaders(response, request);
  } catch (error: any) {
    console.error("[widget-config API] Unexpected error:", error);
    const response = NextResponse.json({ enabled: false }, { status: 500 });
    return setCorsHeaders(response, request);
  }
}
