import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth/middleware";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// GET /api/auth/profile - 現在のユーザープロフィールを取得
export async function GET(request: NextRequest) {
  try {
    console.log("[profile API] GET request received");
    
    console.log("[profile API] Getting authenticated user...");
    const auth = await getAuthenticatedUser(request);
    console.log("[profile API] Authenticated user:", { hasAuth: !!auth, userId: auth?.userId });
    
    if (!auth) {
      console.warn("[profile API] Unauthorized");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!supabaseAdmin) {
      console.error("[profile API] Database not configured");
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    // profiles テーブルからプロフィール情報を取得
    console.log("[profile API] Fetching user data from database...");
    const { data: userData, error: userError } = await supabaseAdmin
      .from("profiles")
      .select("name, email")
      .eq("id", auth.userId)
      .single();

    console.log("[profile API] Database query result:", { hasData: !!userData, hasError: !!userError });

    if (userError || !userData) {
      console.error("[profile API] Error fetching user profile:", userError);
      return NextResponse.json(
        { error: "Failed to fetch profile", details: userError?.message },
        { status: 500 }
      );
    }

    console.log("[profile API] Returning profile data");
    return NextResponse.json({
      name: userData.name || "",
      email: userData.email || "",
    });
  } catch (error) {
    console.error("[profile API] Error in GET /api/auth/profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/auth/profile - プロフィール情報を更新
export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { name, email } = body;

    // バリデーション
    if (name !== undefined && typeof name !== "string") {
      return NextResponse.json(
        { error: "Invalid name" },
        { status: 400 }
      );
    }

    if (email !== undefined && typeof email !== "string") {
      return NextResponse.json(
        { error: "Invalid email" },
        { status: 400 }
      );
    }

    // メールアドレスの形式チェック
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    const updateData: Record<string, string> = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    // profiles テーブルを更新
    const { data: userData, error: userError } = await supabaseAdmin
      .from("profiles")
      .update(updateData)
      .eq("id", auth.userId)
      .select("name, email")
      .single();

    if (userError) {
      console.error("Error updating user profile:", userError);
      return NextResponse.json(
        { error: "Failed to update profile" },
        { status: 500 }
      );
    }

    // メールアドレスが変更された場合、Supabase Authのメールアドレスも更新
    if (email && email !== userData.email) {
      if (!supabaseUrl || !supabaseAnonKey) {
        return NextResponse.json(
          { error: "Supabase not configured" },
          { status: 500 }
        );
      }

      // Authorizationヘッダーからトークンを取得
      const authHeader = request.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        // トークンを使用してクライアントを作成
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        });
        
        const { error: updateError } = await supabase.auth.updateUser({
          email: email,
        });

        if (updateError) {
          console.error("Error updating auth email:", updateError);
          // メールアドレスの更新に失敗しても、usersテーブルの更新は成功しているので続行
        }
      }
    }

    return NextResponse.json({
      name: userData.name || "",
      email: userData.email || "",
    });
  } catch (error) {
    console.error("Error in PATCH /api/auth/profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
