import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

/**
 * 初回ログイン確定API
 *
 * 1) 既に profiles がある → 成功（手動作成ユーザー・2回目以降のログイン用）
 * 2) 未受諾の pending_invites がある → profiles を upsert し招待を確定
 * 3) どちらもない → 403
 */
export async function POST(request: NextRequest) {
  try {
    console.log("[post-login API] POST request received");
    
    // Authorizationヘッダーからトークンを取得
    const authHeader = request.headers.get("authorization");
    console.log("[post-login API] Auth header:", authHeader ? "present" : "missing");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.warn("[post-login API] Missing or invalid authorization header");
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    console.log("[post-login API] Token extracted, length:", token.length);

    // 環境変数を取得
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("[post-login API] Supabase not configured");
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 500 }
      );
    }

    // トークンを検証してユーザーIDを取得
    console.log("[post-login API] Verifying token...");
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(token);

    console.log("[post-login API] Token verification result:", { hasUser: !!user, hasError: !!authError });

    if (authError || !user) {
      console.error("[post-login API] Invalid or expired token:", authError);
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    if (!supabaseAdmin) {
      console.error("[post-login API] Database not configured");
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    const userEmail = user.email;
    if (!userEmail) {
      console.error("[post-login API] User email not found");
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );
    }

    const { data: existingProfile, error: existingProfileError } = await supabaseAdmin
      .from("profiles")
      .select("shop_id, role")
      .eq("id", user.id)
      .maybeSingle();

    if (existingProfileError) {
      console.error("[post-login API] Error fetching profile:", existingProfileError);
      return NextResponse.json(
        { error: "Database error", details: existingProfileError.message },
        { status: 500 }
      );
    }

    if (existingProfile?.shop_id) {
      console.log("[post-login API] Profile already exists for user:", user.id);
      return NextResponse.json({
        success: true,
        shopId: existingProfile.shop_id,
        role: existingProfile.role,
      });
    }

    console.log("[post-login API] Looking up pending_invites for email:", userEmail);

    // pending_invites を email で検索（未受諾のもの）
    const { data: pendingInvite, error: inviteError } = await supabaseAdmin
      .from("pending_invites")
      .select("*")
      .eq("email", userEmail)
      .is("accepted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (inviteError) {
      console.error("[post-login API] Error fetching pending_invites:", inviteError);
      return NextResponse.json(
        { error: "Database error", details: inviteError.message },
        { status: 500 }
      );
    }

    if (!pendingInvite) {
      console.warn("[post-login API] No pending invite found for:", userEmail);
      return NextResponse.json(
        { 
          error: "Not invited",
          message: "このメールアドレスは招待されていません。管理者に連絡してください。"
        },
        { status: 403 }
      );
    }

    console.log("[post-login API] Pending invite found:", {
      shop_id: pendingInvite.shop_id,
      role: pendingInvite.role,
    });

    // profiles に upsert（既に存在する場合は何もしない）
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: user.id,
          shop_id: pendingInvite.shop_id,
          role: pendingInvite.role,
          email: userEmail,
          name: user.user_metadata?.name || null,
        },
        {
          onConflict: "id",
          ignoreDuplicates: false, // 既存レコードがあっても更新する
        }
      )
      .select()
      .single();

    if (profileError) {
      console.error("[post-login API] Error upserting profile:", profileError);
      return NextResponse.json(
        { error: "Failed to create profile", details: profileError.message },
        { status: 500 }
      );
    }

    console.log("[post-login API] Profile created/updated:", profile.id);

    // pending_invites の accepted_at を更新
    const { error: acceptError } = await supabaseAdmin
      .from("pending_invites")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", pendingInvite.id);

    if (acceptError) {
      console.error("[post-login API] Error updating accepted_at:", acceptError);
      // エラーでも続行（profileは作成済み）
    }

    console.log("[post-login API] Invite accepted successfully");

    return NextResponse.json({
      success: true,
      shopId: pendingInvite.shop_id,
      role: pendingInvite.role,
    });
  } catch (error: any) {
    console.error("[post-login API] Unexpected error:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
