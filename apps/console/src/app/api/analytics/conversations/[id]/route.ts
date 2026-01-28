import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth/middleware";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  product_id: string | null;
  context: any;
}

interface ConversationDetail {
  id: string;
  shop_id: string;
  product_id: string | null;
  product_name: string | null;
  session_id: string | null;
  user_agent: string | null;
  ip_address: string | null;
  started_at: string;
  ended_at: string | null;
  message_count: number;
  created_at: string;
  updated_at: string;
  messages: Message[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: conversationId } = await params;

    // 会話情報を取得（shop_idでフィルタリング）
    const { data: conversation, error: convError } = await supabaseAdmin
      .from("conversations")
      .select(
        `
        id,
        shop_id,
        product_id,
        session_id,
        user_agent,
        ip_address,
        started_at,
        ended_at,
        message_count,
        created_at,
        updated_at,
        products:product_id (
          name
        )
      `
      )
      .eq("id", conversationId)
      .eq("shop_id", auth.shopId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // メッセージを取得
    const { data: messages, error: messagesError } = await supabaseAdmin
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (messagesError) {
      console.error("Error fetching messages:", messagesError);
      return NextResponse.json(
        { error: "Failed to fetch messages" },
        { status: 500 }
      );
    }

    const response: ConversationDetail = {
      id: conversation.id,
      shop_id: conversation.shop_id,
      product_id: conversation.product_id,
      product_name: (conversation.products as any)?.name || null,
      session_id: conversation.session_id,
      user_agent: conversation.user_agent,
      ip_address: conversation.ip_address,
      started_at: conversation.started_at,
      ended_at: conversation.ended_at,
      message_count: conversation.message_count || 0,
      created_at: conversation.created_at,
      updated_at: conversation.updated_at,
      messages: (messages || []).map((msg) => ({
        id: msg.id,
        role: msg.role as "user" | "assistant",
        content: msg.content,
        created_at: msg.created_at,
        product_id: msg.product_id,
        context: msg.context,
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in conversation detail API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
