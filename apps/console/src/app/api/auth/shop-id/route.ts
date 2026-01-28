import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

// クライアントから送られてくるJWTトークンを検証してshop_idを取得
export async function GET(request: NextRequest) {
  try {
    console.log("[shop-id API] GET request received");
    
    // Authorizationヘッダーからトークンを取得
    const authHeader = request.headers.get("authorization");
    console.log("[shop-id API] Auth header:", authHeader ? "present" : "missing");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.warn("[shop-id API] Missing or invalid authorization header");
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    console.log("[shop-id API] Token extracted, length:", token.length);

    // 環境変数を取得
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("[shop-id API] Supabase not configured");
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 500 }
      );
    }

    // トークンを検証してユーザーIDを取得
    console.log("[shop-id API] Verifying token...");
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(token);

    console.log("[shop-id API] Token verification result:", { hasUser: !!user, hasError: !!authError });

    if (authError || !user) {
      console.error("[shop-id API] Invalid or expired token:", authError);
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // サーバーサイドでRLSをバイパスしてshop_idを取得
    if (!supabaseAdmin) {
      console.error("[shop-id API] Database not configured");
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    console.log("[shop-id API] Fetching shop_id for user:", user.id);
    
    // profiles テーブルから shop_id と role を取得（users ではなく profiles を使用）
    let { data, error } = await supabaseAdmin
      .from("profiles")
      .select("shop_id, role")
      .eq("id", user.id)
      .single();

    console.log("[shop-id API] Query result:", { hasData: !!data, hasError: !!error, error });

    // レコードが存在しない場合（PGRST116は「レコードが見つからない」エラー）
    if (error && error.code === 'PGRST116') {
      console.warn("[shop-id API] Profile not found for user:", user.id);
      // profiles が存在しない = pending_invites が存在しない = 招待されていない
      // post-login API で確定処理を行うため、ここでは 404 を返す
      return NextResponse.json(
        { 
          error: "Profile not found",
          message: "プロフィールが見つかりません。招待されていない可能性があります。"
        },
        { status: 404 }
      );
    } else if (error) {
      // その他のエラー
      console.error("[shop-id API] Error fetching shop_id:", error);
      return NextResponse.json(
        { error: "Failed to fetch shop_id", details: error.message },
        { status: 500 }
      );
    }

    if (!data || !data.shop_id) {
      console.warn("[shop-id API] shop_id not found for user:", user.id);
      return NextResponse.json(
        { error: "shop_id not found for user" },
        { status: 404 }
      );
    }

    console.log("[shop-id API] Returning shopId and role:", { shopId: data.shop_id, role: data.role });
    return NextResponse.json({ 
      shopId: data.shop_id,
      role: data.role,
    });
  } catch (error) {
    console.error("[shop-id API] Error in shop-id API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
