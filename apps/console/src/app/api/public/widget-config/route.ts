import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { setCorsHeaders, handleCorsOptions, validatePublicKeyAndDomain } from "@/lib/api/cors";

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

// OPTIONS リクエスト（プリフライト）を処理
export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
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

    // publicKey + ドメイン検証
    const validation = await validatePublicKeyAndDomain(request, publicKey);
    if (!validation.success) {
      return validation.response;
    }
    const shopId = validation.shopId;

    if (!supabaseAdmin) {
      const response = NextResponse.json({ enabled: false }, { status: 500 });
      return setCorsHeaders(response, request);
    }

    // products を (shop_id, external_product_id) で検索
    const { data: product, error: productError } = await supabaseAdmin
      .from("products")
      .select("id, name, category, thumbnail_url")
      .eq("shop_id", shopId)
      .eq("external_product_id", externalProductId)
      .single();

    if (productError || !product) {
      const response = NextResponse.json({ 
        enabled: false,
        error: `商品が見つかりません。external_product_id: "${externalProductId}" が正しく登録されているか確認してください。`
      });
      return setCorsHeaders(response, request);
    }

    // assets を (shop_id, product_id) で取得（is_active: true のみ）
    const { data: allAssets, error: assetsError } = await supabaseAdmin
      .from("assets")
      .select("size, glb_url, model_url, version, created_at, is_active, product_id")
      .eq("shop_id", shopId)
      .eq("product_id", product.id)
      .eq("is_active", true)
      .order("size", { ascending: true })
      .order("created_at", { ascending: false });
    
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
      const response = NextResponse.json({ enabled: false, error: "No assets found for this product" });
      return setCorsHeaders(response, request);
    }

    // サイズごと、カテゴリーごとに最新バージョンのアセットを取得
    const assetsBySizeAndCategory = new Map<string, Map<string, { glbUrl?: string; modelUrl?: string; version: number; isActive: boolean; category?: string }>>();
    
    for (const asset of assetsWithCategory) {
      const size = asset.size;
      const categoryKey = asset.category || "default";
      
      if (!assetsBySizeAndCategory.has(size)) {
        assetsBySizeAndCategory.set(size, new Map());
      }
      const categoryMap = assetsBySizeAndCategory.get(size)!;
      
      const existing = categoryMap.get(categoryKey);
      
      // is_active: true のアセットのみを処理（既にフィルタ済みだが念のため）
      if (asset.is_active !== false) {
        // model_urlまたはglb_urlが存在するアセットのみを処理
        const modelUrl = asset.model_url || asset.glb_url;
        if (modelUrl) {
          if (
            !existing ||
            asset.version > existing.version
          ) {
            categoryMap.set(categoryKey, {
              glbUrl: asset.glb_url || undefined,
              modelUrl: asset.model_url || undefined,
              version: asset.version,
              isActive: true,
              category,
            });
          }
        }
      }
    }

    if (assetsBySizeAndCategory.size === 0) {
      const response = NextResponse.json({ enabled: false });
      return setCorsHeaders(response, request);
    }

    // サイズごとのアセットリストを構築
    const sizes: Record<string, { glbUrl?: string; modelUrl?: string; category?: string }[]> = {};
    let defaultSize: string | undefined;
    
    for (const [size, categoryMap] of assetsBySizeAndCategory.entries()) {
      const assets: { glbUrl?: string; modelUrl?: string; category?: string }[] = [];
      for (const [, asset] of categoryMap.entries()) {
        // modelUrlまたはglbUrlが存在するアセットのみを追加
        const modelUrl = asset.modelUrl || asset.glbUrl;
        if (modelUrl) {
          assets.push({
            glbUrl: asset.glbUrl || undefined,
            modelUrl: asset.modelUrl || undefined,
            category: asset.category,
          });
        }
      }
      // URLが存在するアセットがある場合のみサイズを追加
      if (assets.length > 0) {
        sizes[size] = assets;
      }
      
      if (!defaultSize || size === "M") {
        defaultSize = size;
      }
    }

    if (!defaultSize) {
      defaultSize = Array.from(assetsBySizeAndCategory.keys())[0] || undefined;
    }

    // ウィジェットデザイン設定を取得
    const { data: designData } = await supabaseAdmin
      .from("widget_designs")
      .select("*")
      .eq("shop_id", shopId)
      .maybeSingle();

    const design = designData ? {
      backgroundImage: designData.background_image || undefined,
      backgroundColor: designData.background_color || undefined,
      theme: designData.theme || "light",
      button: {
        text: designData.button_text || "試着する",
        color: designData.button_color || "#ffffff",
        radius: designData.button_radius ?? 8,
        width: designData.button_width ?? 200,
        height: designData.button_height ?? 56,
        fontSize: designData.button_font_size ?? 14,
        borderWidth: designData.button_border_width ?? 0,
        borderColor: designData.button_border_color || "#000000",
        shadow: designData.button_shadow ?? true,
      },
    } : undefined;

    const responseData = {
      enabled: true,
      asset: {
        defaultSize,
        sizes,
        productName: product.name,
        thumbnailUrl: product.thumbnail_url || undefined,
      },
      design,
    };

    // デバッグログ（本番環境では削除推奨）
    console.log("[widget-config API] Response:", JSON.stringify({
      productId: product.id,
      externalProductId,
      defaultSize,
      sizesKeys: Object.keys(sizes),
      sizesCount: Object.values(sizes).reduce((sum, arr) => sum + arr.length, 0),
      sizes: Object.fromEntries(
        Object.entries(sizes).map(([size, assets]) => [
          size,
          assets.map(a => ({ hasModelUrl: !!a.modelUrl, hasGlbUrl: !!a.glbUrl, category: a.category }))
        ])
      ),
    }, null, 2));

    const response = NextResponse.json(responseData);
    return setCorsHeaders(response, request);
  } catch (error) {
    console.error("[widget-config API] Unexpected error:", error);
    const response = NextResponse.json({ enabled: false }, { status: 500 });
    return setCorsHeaders(response, request);
  }
}
