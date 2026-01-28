import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Member Invite API（Owner 専用）
 * 
 * Owner が自分のショップにメンバーを招待する。
 * 
 * 認可: profiles.role = 'owner' のみ
 * 
 * 入力: { memberEmail }
 * 出力: { success: true }
 */
export async function POST(request: NextRequest) {
  try {
    console.log("[invite-member API] POST request received");
    
    // Authorizationヘッダーからトークンを取得
    const authHeader = request.headers.get("authorization");
    console.log("[invite-member API] Auth header:", authHeader ? "present" : "missing");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.warn("[invite-member API] Missing or invalid authorization header");
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    console.log("[invite-member API] Token extracted, length:", token.length);

    // 環境変数を取得
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("[invite-member API] Supabase not configured");
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 500 }
      );
    }

    // トークンを検証してユーザーIDを取得
    console.log("[invite-member API] Verifying token...");
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(token);

    console.log("[invite-member API] Token verification result:", { hasUser: !!user, hasError: !!authError });

    if (authError || !user) {
      console.error("[invite-member API] Invalid or expired token:", authError);
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    if (!supabaseAdmin) {
      console.error("[invite-member API] Database not configured");
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
      console.error("[invite-member API] Profile not found:", profileError);
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    // role が owner でない場合は拒否
    if (profile.role !== "owner") {
      console.warn("[invite-member API] User is not owner:", user.id);
      return NextResponse.json(
        { error: "Only owners can invite members" },
        { status: 403 }
      );
    }

    console.log("[invite-member API] User is owner of shop:", profile.shop_id);

    // リクエストボディの検証
    const body = await request.json();
    const { memberEmails } = body;

    if (!memberEmails || !Array.isArray(memberEmails) || memberEmails.length === 0) {
      return NextResponse.json(
        { error: "memberEmails must be a non-empty array" },
        { status: 400 }
      );
    }

    // メールアドレスのバリデーション
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validEmails = memberEmails.filter((email: string) => emailRegex.test(email.trim()));
    
    if (validEmails.length === 0) {
      return NextResponse.json(
        { error: "No valid email addresses provided" },
        { status: 400 }
      );
    }

    // 重複を除去
    const uniqueEmails = Array.from(new Set(validEmails.map((email: string) => email.trim().toLowerCase())));

    console.log("[invite-member API] Inviting members:", uniqueEmails);

    const results = {
      success: [] as string[],
      failed: [] as string[],
      skipped: [] as string[],
    };

    // 各メールアドレスに対して招待を作成
    for (const email of uniqueEmails) {
      try {
        // pending_invites に upsert（既に存在する場合は更新しない）
        const { data: invite, error: inviteError } = await supabaseAdmin
          .from("pending_invites")
          .upsert(
            {
              shop_id: profile.shop_id,
              email: email,
              role: "member",
            },
            {
              onConflict: "shop_id,email",
              ignoreDuplicates: true, // 既に存在する場合は何もしない
            }
          )
          .select()
          .maybeSingle();

        if (inviteError) {
          console.error("[invite-member API] Error creating invite for", email, ":", inviteError);
          results.failed.push(email);
          continue;
        }

        // 既に存在する場合はスキップ
        if (!invite) {
          console.log("[invite-member API] Invite already exists for:", email);
          results.skipped.push(email);
          continue;
        }

        console.log("[invite-member API] Invite created:", invite.id);

        // Supabase Admin API でメンバーを招待
        try {
          const { data: inviteData, error: inviteAuthError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
            email,
            {
              data: {
                shop_id: profile.shop_id,
                role: "member",
              },
              redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/set-password`,
            }
          );

          if (inviteAuthError) {
            console.error("[invite-member API] Error sending invite email for", email, ":", {
              message: inviteAuthError.message,
              status: inviteAuthError.status,
              name: inviteAuthError.name,
            });
            // エラーを記録
            results.failed.push(email);
            continue;
          } else {
            console.log("[invite-member API] Invite email sent to:", email, "User ID:", inviteData?.user?.id);
          }
        } catch (emailError) {
          console.error("[invite-member API] Exception sending invite email for", email, ":", emailError);
          // エラーを記録
          results.failed.push(email);
          continue;
        }

        results.success.push(email);
      } catch (error) {
        console.error("[invite-member API] Unexpected error for", email, ":", error);
        results.failed.push(email);
      }
    }

    return NextResponse.json({
      success: true,
      results: {
        success: results.success,
        failed: results.failed,
        skipped: results.skipped,
      },
      message: `${results.success.length}件の招待を送信しました${results.skipped.length > 0 ? `（${results.skipped.length}件は既に招待済み）` : ""}${results.failed.length > 0 ? `（${results.failed.length}件は失敗）` : ""}`,
    });
  } catch (error: any) {
    console.error("[invite-member API] Unexpected error:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
