import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * GET /api/debug/conversations - 会話ログを確認（デバッグ用）
 * 開発環境でのみ使用（本番環境では削除推奨）
 */
export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    // TypeScriptの型チェックのために定数に保存
    const admin = supabaseAdmin;

    const searchParams = request.nextUrl.searchParams;
    const shopId = searchParams.get("shopId") || "default_shop";
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    // 会話を取得
    const { data: conversations, error: conversationsError } = await admin
      .from("conversations")
      .select(
        `
        id,
        shop_id,
        product_id,
        session_id,
        started_at,
        message_count,
        created_at
      `
      )
      .eq("shop_id", shopId)
      .order("started_at", { ascending: false })
      .limit(limit);

    if (conversationsError) {
      console.error("Error fetching conversations:", conversationsError);
      return NextResponse.json(
        {
          error: "Failed to fetch conversations",
          details: conversationsError,
        },
        { status: 500 }
      );
    }

    // 各会話のメッセージ数を確認
    const conversationsWithMessages = await Promise.all(
      (conversations || []).map(async (conv) => {
        const { data: messages, error: messagesError } = await admin
          .from("messages")
          .select("id, role, content, created_at")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: true })
          .limit(10);

        return {
          ...conv,
          messages: messages || [],
          messagesError: messagesError ? {
            code: messagesError.code,
            message: messagesError.message,
          } : null,
        };
      })
    );

    return NextResponse.json({
      shopId,
      total: conversations?.length || 0,
      conversations: conversationsWithMessages,
    });
  } catch (error) {
    console.error("Error in debug conversations API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
