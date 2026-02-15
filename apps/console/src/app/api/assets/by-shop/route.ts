import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth/middleware";

/**
 * GET /api/assets/by-shop - ショップの全商品のアセットをカテゴリ別に取得
 * 
 * クエリパラメータ:
 * - size: サイズでフィルタ（任意、例: "M"）
 * - excludeProductId: 除外する商品ID（任意）
 * 
 * レスポンス:
 * - { categories: { [category: string]: Array<{ id, productId, productName, size, modelUrl, thumbnailUrl, category }> } }
 */
export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ categories: {} });
    }

    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const size = searchParams.get("size");
    const excludeProductId = searchParams.get("excludeProductId");

    // 同じショップの全商品を取得（カテゴリ情報付き）
    const { data: products, error: productError } = await supabaseAdmin
      .from("products")
      .select("id, name, category, thumbnail_url")
      .eq("shop_id", auth.shopId);

    if (productError || !products) {
      console.error("[by-shop] Error fetching products:", productError);
      return NextResponse.json({ categories: {} });
    }

    // 商品IDとカテゴリのマッピング
    const productMap = new Map(
      products.map((p) => [p.id, { name: p.name, category: p.category, thumbnailUrl: p.thumbnail_url }])
    );

    // 全商品のアセットを一括取得
    let query = supabaseAdmin
      .from("assets")
      .select("id, product_id, size, glb_url, model_url, thumbnail_url, version, is_active")
      .eq("shop_id", auth.shopId)
      .order("version", { ascending: false });

    if (size) {
      query = query.eq("size", size);
    }

    if (excludeProductId) {
      query = query.neq("product_id", excludeProductId);
    }

    const { data: assets, error: assetsError } = await query;

    if (assetsError || !assets) {
      console.error("[by-shop] Error fetching assets:", assetsError);
      return NextResponse.json({ categories: {} });
    }

    // カテゴリ別にグループ化（各商品・サイズごとに最新バージョンのみ）
    const seen = new Set<string>();
    const categories: Record<string, Array<{
      id: string;
      productId: string;
      productName: string;
      size: string;
      modelUrl: string;
      thumbnailUrl: string | null;
      category: string;
    }>> = {};

    for (const asset of assets) {
      const product = productMap.get(asset.product_id);
      if (!product) continue;
      if (asset.is_active === false) continue;

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
        productName: product.name,
        size: asset.size,
        modelUrl,
        thumbnailUrl: asset.thumbnail_url || product.thumbnailUrl || null,
        category,
      });
    }

    return NextResponse.json({ categories });
  } catch (error) {
    console.error("[by-shop] Unexpected error:", error);
    return NextResponse.json({ categories: {} }, { status: 500 });
  }
}
