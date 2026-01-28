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
 * - { enabled: true, glbUrl: "..." } または { enabled: false }
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const publicKey = searchParams.get("publicKey");
    const externalProductId = searchParams.get("externalProductId");

    console.log("[widget-config API] GET request:", { publicKey, externalProductId });

    if (!publicKey || !externalProductId) {
      return NextResponse.json(
        { enabled: false, error: "publicKey and externalProductId are required" },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      console.error("[widget-config API] Database not configured");
      return NextResponse.json({ enabled: false }, { status: 500 });
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
      return NextResponse.json({ enabled: false });
    }

    console.log("[widget-config API] Widget key found:", {
      shop_id: widgetKey.shop_id,
      allowed_domains: widgetKey.allowed_domains,
    });

    // 2. ドメイン検証
    const origin = request.headers.get("origin") || request.headers.get("referer");
    if (origin) {
      try {
        const url = new URL(origin);
        const host = url.host; // 例: "example.com" または "sub.example.com"

        console.log("[widget-config API] Request origin host:", host);

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
          return NextResponse.json({ enabled: false });
        }

        console.log("[widget-config API] Domain verified:", host);
      } catch (urlError) {
        console.error("[widget-config API] Invalid origin URL:", origin, urlError);
        return NextResponse.json({ enabled: false });
      }
    } else {
      console.warn("[widget-config API] No origin or referer header");
      // Origin/Referer がない場合は拒否
      return NextResponse.json({ enabled: false });
    }

    // 3. products を (shop_id, external_product_id) で検索
    const { data: product, error: productError } = await supabaseAdmin
      .from("products")
      .select("id")
      .eq("shop_id", widgetKey.shop_id)
      .eq("external_product_id", externalProductId)
      .single();

    if (productError || !product) {
      console.warn("[widget-config API] Product not found:", {
        shop_id: widgetKey.shop_id,
        external_product_id: externalProductId,
      });
      return NextResponse.json({ enabled: false });
    }

    console.log("[widget-config API] Product found:", product.id);

    // 4. assets を (shop_id, product_id) で最新 created_at desc limit 1
    const { data: asset, error: assetError } = await supabaseAdmin
      .from("assets")
      .select("glb_url")
      .eq("shop_id", widgetKey.shop_id)
      .eq("product_id", product.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (assetError || !asset) {
      console.warn("[widget-config API] Asset not found for product:", product.id);
      return NextResponse.json({ enabled: false });
    }

    console.log("[widget-config API] Asset found:", asset.glb_url);

    // 5. 成功レスポンス
    return NextResponse.json({
      enabled: true,
      glbUrl: asset.glb_url,
    });
  } catch (error: any) {
    console.error("[widget-config API] Unexpected error:", error);
    return NextResponse.json({ enabled: false }, { status: 500 });
  }
}
