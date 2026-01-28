import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * サインアップAPI（招待ベース）
 * 
 * 1. pending_invites に招待が存在するか確認
 * 2. 招待がある場合のみ Supabase Auth でユーザーを作成
 * 3. profiles は作成せず、ログイン時に post-login API で作成される
 * 
 * 注意: このシステムは招待ベースなので、招待されていないメールではサインアップできません。
 */
export async function POST(request: NextRequest) {
  try {
    // 環境変数の確認
    if (!supabaseAdmin || !supabaseUrl || !supabaseAnonKey) {
      console.error("[Signup] Database not configured");
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    // リクエストボディの検証
    const body = await request.json();
    const { email, password, name } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // 1. pending_invites をチェック（招待されているか確認）
    const { data: pendingInvite, error: inviteError } = await supabaseAdmin
      .from("pending_invites")
      .select("*")
      .eq("email", email)
      .is("accepted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (inviteError) {
      console.error("[Signup] Error checking pending_invites:", inviteError);
      return NextResponse.json(
        { error: "Database error", details: inviteError.message },
        { status: 500 }
      );
    }

    if (!pendingInvite) {
      console.warn("[Signup] No pending invite found for:", email);
      return NextResponse.json(
        { 
          error: "このメールアドレスは招待されていません。",
          message: "アカウントを作成するには、管理者からの招待が必要です。",
        },
        { status: 403 }
      );
    }

    console.log("[Signup] Pending invite found for:", email);

    // 2. Supabase Authでユーザーを作成
    console.log("[Signup] Creating auth user...");
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || "",
        },
      },
    });

    // 認証エラーの処理
    if (authError) {
      console.error("[Signup] Auth error:", {
        message: authError.message,
        status: authError.status,
        name: authError.name,
        code: (authError as any).code,
      });
      
      return NextResponse.json(
        { 
          error: authError.message || "Failed to create user",
          details: authError.message,
          code: authError.status?.toString() || (authError as any).code,
        },
        { status: 400 }
      );
    }

    // authData.userが存在しない場合はエラー
    if (!authData?.user) {
      console.error("[Signup] No user returned from auth.signUp");
      return NextResponse.json(
        { error: "Failed to create user: no user data returned" },
        { status: 400 }
      );
    }

    console.log("[Signup] Auth user created:", authData.user.id);

    // メール確認を自動的に完了させる（開発環境向け）
    // Service Role Keyを使用してメール確認をスキップ
    if (authData.user && !authData.user.email_confirmed_at && supabaseAdmin) {
      console.log("[Signup] Auto-confirming email for development...");
      try {
        const { data: updatedUser, error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(
          authData.user.id,
          {
            email_confirm: true,
          }
        );
        if (confirmError) {
          console.warn("[Signup] Failed to auto-confirm email:", confirmError);
          // エラーでも続行（メール確認は後で手動で行える）
        } else {
          console.log("[Signup] Email confirmed successfully");
        }
      } catch (confirmErr) {
        console.warn("[Signup] Error during email confirmation:", confirmErr);
        // エラーでも続行
      }
    }

    // profiles は作成しない
    // ログイン時に post-login API が pending_invites をチェックして profiles を作成する
    console.log("[Signup] Auth user created successfully. Profile will be created on first login.");

    return NextResponse.json(
      { 
        message: "アカウントが作成されました。ログインしてください。", 
        userId: authData.user.id,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[Signup] Unexpected error:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
