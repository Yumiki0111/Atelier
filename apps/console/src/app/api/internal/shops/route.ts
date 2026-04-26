import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { authorizeInternalAdminRequest } from "@/lib/auth/internalAdminRequest";

/**
 * Shops List API（FIT&LOOK 運営者向け管理者 API）
 * 
 * 全ショップの一覧を取得する。
 * 
 * 認可: ADMIN_TOKEN（x-admin-token）またはプラットフォーム管理者 Bearer
 */
export async function GET(request: NextRequest) {
  try {
    const authorized = await authorizeInternalAdminRequest(request);
    if (!authorized) {
      console.warn("[shops list API] Unauthorized internal admin request");
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

    return NextResponse.json(shops || []);
  } catch (error) {
    console.error("[shops list API] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
