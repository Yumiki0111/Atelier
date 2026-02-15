import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );
}

/**
 * API Routesで認証をチェックするミドルウェア
 * @param request NextRequest
 * @returns { userId: string, shopId: string } | null
 */
export async function getAuthenticatedUser(
  request: NextRequest
): Promise<{ userId: string; shopId: string; userRole: "owner" | "member" | null } | null> {
  
  try {
    // Authorizationヘッダーからトークンを取得
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.substring(7);

    // Supabaseクライアントを作成（トークン検証用）
    if (!supabaseUrl || !supabaseAnonKey) {
      return null;
    }
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // トークンを検証
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error("Error verifying token:", error);
      return null;
    }

    // profiles テーブルから shop_id を取得（RLSをバイパスするためsupabaseAdminを使用）
    if (!supabaseAdmin) {
      console.error("supabaseAdmin not initialized");
      return null;
    }

    const { data: profileData, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("shop_id, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profileData) {
      console.error("Error fetching shop_id from profiles:", profileError);
      return null;
    }

    return {
      userId: user.id,
      shopId: profileData.shop_id,
      userRole: profileData.role as "owner" | "member" | null,
    };
  } catch (error) {
    console.error("Error in getAuthenticatedUser:", error);
    return null;
  }
}

/**
 * 認証が必要なAPI Route用のラッパー
 */
export function requireAuth(
  handler: (
    request: NextRequest,
    context: { userId: string; shopId: string; userRole: "owner" | "member" | null }
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const auth = await getAuthenticatedUser(request);

    if (!auth) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    return handler(request, auth);
  };
}
