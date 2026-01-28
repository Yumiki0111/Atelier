import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth/middleware";

/**
 * Widget Keys API
 * 
 * 現在のユーザーのショップの widget_keys を取得
 */
export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    // 認証チェック
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const shopId = searchParams.get("shopId") || auth.shopId;

    // widget_keys を取得（secret_key_hash は除外）
    const { data, error } = await supabaseAdmin
      .from("widget_keys")
      .select("id, shop_id, public_key, allowed_domains, enabled, created_at, updated_at")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching widget_keys:", error);
      return NextResponse.json(
        { error: "Failed to fetch widget keys", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Error in GET /api/widget-keys:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
