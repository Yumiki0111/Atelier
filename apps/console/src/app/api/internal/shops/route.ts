import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * Shops List API（Atelier Admin 専用）
 * 
 * 全ショップの一覧を取得する。
 * 
 * 認可: 環境変数 ATELIER_ADMIN_TOKEN で保護
 */
export async function GET(request: NextRequest) {
  try {
    console.log("[shops list API] GET request received");

    // 管理者トークンで認証
    const adminToken = request.headers.get("x-atelier-admin-token");
    const expectedToken = process.env.ATELIER_ADMIN_TOKEN;

    if (!expectedToken) {
      console.error("[shops list API] ATELIER_ADMIN_TOKEN not configured");
      return NextResponse.json(
        { error: "Admin token not configured" },
        { status: 500 }
      );
    }

    if (!adminToken || adminToken !== expectedToken) {
      console.warn("[shops list API] Invalid or missing admin token");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!supabaseAdmin) {
      console.error("[shops list API] Database not configured");
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    // 全ショップを取得
    const { data: shops, error: shopsError } = await supabaseAdmin
      .from("shops")
      .select("id, name, enabled, created_at")
      .order("created_at", { ascending: false });

    if (shopsError) {
      console.error("[shops list API] Error fetching shops:", shopsError);
      return NextResponse.json(
        { error: "Failed to fetch shops", details: shopsError.message },
        { status: 500 }
      );
    }

    console.log("[shops list API] Fetched shops:", shops?.length || 0);

    return NextResponse.json(shops || []);
  } catch (error: any) {
    console.error("[shops list API] Unexpected error:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
