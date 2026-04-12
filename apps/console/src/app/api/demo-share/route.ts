import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth/middleware";

function publicBaseUrl(request: NextRequest): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (env) return env.replace(/\/$/, "");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "http";
  if (host) return `${proto}://${host}`;
  return "http://localhost:3000";
}

/**
 * 営業用共有デモリンクを発行（認証必須）
 * POST { productId: string }
 */
export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { productId?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const productId = typeof body.productId === "string" ? body.productId.trim() : "";
    if (!productId) {
      return NextResponse.json({ error: "productId is required" }, { status: 400 });
    }

    const { data: product, error: prodErr } = await supabaseAdmin
      .from("products")
      .select("id, shop_id, external_product_id")
      .eq("id", productId)
      .eq("shop_id", auth.shopId)
      .maybeSingle();

    if (prodErr || !product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const ext = typeof product.external_product_id === "string" ? product.external_product_id.trim() : "";
    if (!ext) {
      return NextResponse.json(
        { error: "この商品には external_product_id が未設定です。商品ライブラリで登録してから発行してください。" },
        { status: 400 }
      );
    }

    const { data: wk } = await supabaseAdmin
      .from("widget_keys")
      .select("id")
      .eq("shop_id", auth.shopId)
      .eq("enabled", true)
      .limit(1);

    if (!wk?.length) {
      return NextResponse.json(
        { error: "有効な Widget キーがありません。設定を確認してください。" },
        { status: 400 }
      );
    }

    const token = randomBytes(24).toString("hex");

    const { error: insErr } = await supabaseAdmin.from("demo_share_links").insert({
      shop_id: auth.shopId,
      product_id: productId,
      token,
    });

    if (insErr) {
      console.error("[demo-share] insert", insErr);
      return NextResponse.json({ error: "Failed to create link", details: insErr.message }, { status: 500 });
    }

    const base = publicBaseUrl(request);
    const url = `${base}/share/${token}`;

    return NextResponse.json({ url, token });
  } catch (e) {
    console.error("[demo-share] POST", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
