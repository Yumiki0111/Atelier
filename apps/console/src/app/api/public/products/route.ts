import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { setCorsHeaders, handleCorsOptions, validatePublicKeyAndDomain } from "@/lib/api/cors";

/**
 * Widget Products 公開API
 * 
 * publicKey から同じshop_idの商品一覧を返す
 * 
 * クエリパラメータ:
 * - publicKey: widget_keys.public_key（必須）
 * 
 * レスポンス:
 * - [{ id, externalProductId, name, category, thumbnailUrl }, ...]
 */

// OPTIONS リクエスト（プリフライト）を処理
export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const publicKey = searchParams.get("publicKey");

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

    if (!supabaseAdmin) {
      const response = NextResponse.json({ error: "Database not configured" }, { status: 500 });
      return setCorsHeaders(response, request);
    }

    // 同じshop_idの商品一覧を取得
    const { data: products, error: productError } = await supabaseAdmin
      .from("products")
      .select("id, external_product_id, name, category, thumbnail_url, price_yen")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false });

    if (productError) {
      console.error("[products API] Error fetching products:", productError);
      const response = NextResponse.json(
        { error: "Failed to fetch products", message: productError.message },
        { status: 500 }
      );
      return setCorsHeaders(response, request);
    }

    // レスポンス形式に変換
    const responseData = (products || []).map((p) => ({
      id: p.id,
      externalProductId: p.external_product_id,
      name: p.name,
      category: p.category || "その他",
      thumbnailUrl: p.thumbnail_url || null,
      priceYen: p.price_yen ?? null,
    }));

    const response = NextResponse.json(responseData);
    return setCorsHeaders(response, request);
  } catch (error) {
    console.error("[products API] Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const response = NextResponse.json(
      { error: "Internal server error", message: process.env.NODE_ENV === "development" ? errorMessage : undefined },
      { status: 500 }
    );
    return setCorsHeaders(response, request);
  }
}
