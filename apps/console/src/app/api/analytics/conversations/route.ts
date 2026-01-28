import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth/middleware";

interface ConversationListItem {
  id: string;
  started_at: string;
  message_count: number;
  product_id: string | null;
  product_name: string | null;
  last_message: string | null;
  last_message_at: string | null;
}

interface ConversationsResponse {
  conversations: ConversationListItem[];
  total: number;
  page: number;
  limit: number;
}

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    // 認証チェック
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get("productId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = (page - 1) * limit;

    // クエリの構築
    // デバッグ: 認証されたユーザーのshopIdをログ出力
    console.log("[Conversations API] Fetching conversations for shopId:", auth.shopId);
    
    let query = supabaseAdmin
      .from("conversations")
      .select(
        `
        id,
        started_at,
        message_count,
        product_id,
        products:product_id (
          name
        )
      `,
        { count: "exact" }
      )
      .eq("shop_id", auth.shopId)
      .order("started_at", { ascending: false });

    // フィルタリング
    if (productId) {
      query = query.eq("product_id", productId);
    }
    if (dateFrom) {
      query = query.gte("started_at", dateFrom);
    }
    if (dateTo) {
      query = query.lte("started_at", dateTo);
    }

    // ページネーション
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching conversations:", error);
      return NextResponse.json(
        { error: "Failed to fetch conversations" },
        { status: 500 }
      );
    }

    // 各会話の最新メッセージを取得
    const conversationsWithLastMessage: ConversationListItem[] = await Promise.all(
      (data || []).map(async (conv: any) => {
        // 最新メッセージを取得
        if (!supabaseAdmin) {
          return {
            id: conv.id,
            started_at: conv.started_at,
            message_count: conv.message_count || 0,
            product_id: conv.product_id,
            product_name: (conv.products as any)?.name || null,
            last_message: null,
            last_message_at: null,
          };
        }
        
        const { data: lastMessage } = await supabaseAdmin
          .from("messages")
          .select("content, created_at")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        return {
          id: conv.id,
          started_at: conv.started_at,
          message_count: conv.message_count || 0,
          product_id: conv.product_id,
          product_name: conv.products?.name || null,
          last_message: lastMessage?.content || null,
          last_message_at: lastMessage?.created_at || null,
        };
      })
    );

    const response: ConversationsResponse = {
      conversations: conversationsWithLastMessage,
      total: count || 0,
      page,
      limit,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in conversations API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
