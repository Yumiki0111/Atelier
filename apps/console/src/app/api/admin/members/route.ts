import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Members API（全員閲覧可能）
 * 
 * GET: 自分のショップのメンバー一覧を取得
 * オーナー・メンバー問わず、同じショップのメンバー一覧を閲覧可能
 */
export async function GET(request: NextRequest) {
  try {
    console.log("[members API] GET request received");
    
    // Authorizationヘッダーからトークンを取得
    const authHeader = request.headers.get("authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // 環境変数を取得
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 500 }
      );
    }

    // トークンを検証
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    // 現在のユーザーの profiles を取得
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("shop_id, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    // 同じショップのメンバー一覧を取得（オーナー・メンバー問わず閲覧可能）
    const { data: members, error: membersError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, name, role, created_at")
      .eq("shop_id", profile.shop_id)
      .order("created_at", { ascending: true });

    if (membersError) {
      console.error("[members API] Error fetching members:", membersError);
      return NextResponse.json(
        { error: "Failed to fetch members", details: membersError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(members || []);
  } catch (error: any) {
    console.error("[members API] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error?.message },
      { status: 500 }
    );
  }
}
