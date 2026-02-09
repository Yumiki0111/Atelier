import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

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

    if (!publicKey) {
      const response = NextResponse.json(
        { error: "publicKey is required" },
        { status: 400 }
      );
      return setCorsHeaders(response, request);
    }

    if (!supabaseAdmin) {
      console.error("[products API] Database not configured");
      const response = NextResponse.json({ error: "Database not configured" }, { status: 500 });
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
      console.warn("[products API] Invalid or disabled public_key:", publicKey);
      const response = NextResponse.json({ error: "Invalid or disabled public_key" }, { status: 403 });
      return setCorsHeaders(response, request);
    }

    // 2. ドメイン検証
    const origin = request.headers.get("origin") || request.headers.get("referer");
    if (origin) {
      try {
        const url = new URL(origin);
        const host = url.host;

        const allowedDomains: string[] = widgetKey.allowed_domains || [];
        
        const isAllowed = allowedDomains.some((domain) => {
          if (host === domain) {
            return true;
          }
          if (host.endsWith(`.${domain}`)) {
            return true;
          }
          return false;
        });

        if (!isAllowed) {
          console.warn("[products API] Domain not allowed:", host);
          const response = NextResponse.json({ 
            error: `ドメイン "${host}" が許可されていません。`
          }, { status: 403 });
          return setCorsHeaders(response, request);
        }
      } catch (urlError) {
        console.error("[products API] Invalid origin URL:", origin, urlError);
        const response = NextResponse.json({ error: "Invalid origin" }, { status: 400 });
        return setCorsHeaders(response, request);
      }
    } else {
      console.warn("[products API] No origin or referer header");
      const response = NextResponse.json({ error: "Origin or referer header required" }, { status: 400 });
      return setCorsHeaders(response, request);
    }

    // 3. 同じshop_idの商品一覧を取得
    const { data: products, error: productError } = await supabaseAdmin
      .from("products")
      .select("id, external_product_id, name, category, thumbnail_url")
      .eq("shop_id", widgetKey.shop_id)
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
    }));

    const response = NextResponse.json(responseData);
    return setCorsHeaders(response, request);
  } catch (error) {
    console.error("[products API] Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const response = NextResponse.json(
      { error: "Internal server error", message: errorMessage },
      { status: 500 }
    );
    return setCorsHeaders(response, request);
  }
}
