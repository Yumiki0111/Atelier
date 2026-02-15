import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { setCorsHeaders, handleCorsOptions, validatePublicKeyAndDomain } from "@/lib/api/cors";

/**
 * GET /api/public/assets/by-shop - ショップの全商品のアセットをカテゴリ別に取得（パブリックAPI）
 * 
 * クエリパラメータ:
 * - publicKey: widget_keys.public_key（必須）
 * - size: サイズでフィルタ（任意、例: "M"）
 * - excludeProductId: 除外する商品ID（任意、external_product_id）
 * 
 * レスポンス:
 * - { categories: { [category: string]: Array<{ id, productId, productName, size, modelUrl, thumbnailUrl, category }> } }
 */
export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      const response = NextResponse.json({ categories: {} });
      return setCorsHeaders(response, request);
    }

    const searchParams = request.nextUrl.searchParams;
    const publicKey = searchParams.get("publicKey");
    const size = searchParams.get("size");
    const excludeProductId = searchParams.get("excludeProductId");

    if (!publicKey) {
      const response = NextResponse.json(
        { error: "publicKey is required" },
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

    // 同じショップの全商品を取得（カテゴリ情報付き）
    const { data: products, error: productError } = await supabaseAdmin
      .from("products")
      .select("id, external_product_id, name, category, thumbnail_url")
      .eq("shop_id", shopId);

    if (productError || !products) {
      console.error("[public/assets/by-shop] Error fetching products:", productError);
      const response = NextResponse.json({ categories: {} });
      return setCorsHeaders(response, request);
    }

    // 除外する商品のIDを取得
    let excludeProductUuid: string | null = null;
    if (excludeProductId) {
      const excludeProduct = products.find(p => p.external_product_id === excludeProductId);
      if (excludeProduct) {
        excludeProductUuid = excludeProduct.id;
      }
    }

    // 商品IDとカテゴリのマッピング
    const productMap = new Map(
      products.map((p) => [p.id, { name: p.name, category: p.category, thumbnailUrl: p.thumbnail_url, externalProductId: p.external_product_id }])
    );

    // 全商品のアセットを一括取得
    let query = supabaseAdmin
      .from("assets")
      .select("id, product_id, size, glb_url, model_url, thumbnail_url, version, is_active")
      .eq("shop_id", shopId)
      .eq("is_active", true)
      .order("version", { ascending: false });

    if (size) {
      query = query.eq("size", size);
    }

    if (excludeProductUuid) {
      query = query.neq("product_id", excludeProductUuid);
    }

    const { data: assets, error: assetsError } = await query;

    if (assetsError || !assets) {
      console.error("[public/assets/by-shop] Error fetching assets:", assetsError);
      const response = NextResponse.json({ categories: {} });
      return setCorsHeaders(response, request);
    }

    // カテゴリ別にグループ化（各商品・サイズごとに最新バージョンのみ）
    const seen = new Set<string>();
    const categories: Record<string, Array<{
      id: string;
      productId: string;
      externalProductId: string;
      productName: string;
      size: string;
      modelUrl: string;
      thumbnailUrl: string | null;
      category: string;
    }>> = {};

    for (const asset of assets) {
      const product = productMap.get(asset.product_id);
      if (!product) continue;

      const modelUrl = asset.model_url || asset.glb_url;
      if (!modelUrl) continue;

      // 同じ商品・サイズの重複を排除（最新バージョンのみ）
      const key = `${asset.product_id}-${asset.size}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const category = product.category || "その他";
      if (!categories[category]) {
        categories[category] = [];
      }

      categories[category].push({
        id: asset.id,
        productId: asset.product_id,
        externalProductId: product.externalProductId,
        productName: product.name,
        size: asset.size,
        modelUrl,
        thumbnailUrl: asset.thumbnail_url || product.thumbnailUrl || null,
        category,
      });
    }

    const response = NextResponse.json({ categories });
    return setCorsHeaders(response, request);
  } catch (error) {
    console.error("[public/assets/by-shop] Unexpected error:", error);
    const response = NextResponse.json({ categories: {} }, { status: 500 });
    return setCorsHeaders(response, request);
  }
}
