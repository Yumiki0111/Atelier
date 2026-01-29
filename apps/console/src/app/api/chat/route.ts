import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { supabaseAdmin } from "@/lib/supabase/server";

const groqApiKey = process.env.GROQ_API_KEY;

// Groqクライアントの初期化（APIキーが設定されている場合のみ）
const groq = groqApiKey ? new Groq({ apiKey: groqApiKey }) : null;

// CORSヘッダーを設定する関数
function getCorsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*", // 開発環境では全てのオリジンを許可
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

/**
 * OPTIONS /api/chat - CORS preflight
 */
export async function OPTIONS() {
  return NextResponse.json({}, { headers: getCorsHeaders() });
}

/**
 * POST /api/chat - LLMチャットAPI
 * Groqを使用してユーザーの質問に回答
 */
export async function POST(request: NextRequest) {
  try {
    // データベース接続の確認
    if (!supabaseAdmin) {
      console.error("[Chat API] supabaseAdmin is not initialized. Check environment variables:");
      console.error("  - NEXT_PUBLIC_SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL ? "✓ set" : "✗ not set");
      console.error("  - SUPABASE_SERVICE_ROLE_KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "✓ set" : "✗ not set");
    }

    if (!groq) {
      return NextResponse.json(
        {
          error: "Chat service not configured",
          message: "GROQ_API_KEY environment variable is not set",
        },
        { 
          status: 500,
          headers: getCorsHeaders(),
        }
      );
    }

    const body = await request.json();
    const { message, productId, shopId, context, conversationId, sessionId } = body;

    console.log("[Chat API] Received request:", {
      hasMessage: !!message,
      messageLength: message?.length,
      productId,
      shopId,
      conversationId,
      sessionId,
      hasContext: !!context,
    });

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { 
          status: 400,
          headers: getCorsHeaders(),
        }
      );
    }

    if (!shopId) {
      return NextResponse.json(
        { error: "shopId is required" },
        { 
          status: 400,
          headers: getCorsHeaders(),
        }
      );
    }

    // productIdがUUID形式でない場合はnullに変換（外部キー制約エラーを防ぐ）
    let validProductId: string | null = null;
    if (productId) {
      // UUID形式かどうかを簡易チェック（8-4-4-4-12の形式）
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(productId)) {
        validProductId = productId;
      } else {
        console.warn("[Chat API] Invalid productId format (not UUID), setting to null:", productId);
        validProductId = null;
      }
    }

    // セッションIDの生成（存在しない場合）
    const currentSessionId = sessionId || crypto.randomUUID();
    
    // デモ環境の判定（shopIdが'default_shop'の場合は保存しない）
    const isDemoMode = shopId === 'default_shop';
    
    if (isDemoMode) {
      console.log("[Chat API] Demo mode detected (shopId: 'default_shop'), skipping database save");
    }
    
    // 会話IDの管理
    let currentConversationId = conversationId;
    
    // 会話が存在しない場合は新規作成（デモ環境ではスキップ）
    if (!currentConversationId && supabaseAdmin && !isDemoMode) {
      try {
        const newConversationId = crypto.randomUUID();
        const userAgent = request.headers.get("user-agent") || null;
        const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                         request.headers.get("x-real-ip") || null;

        console.log("[Chat API] Creating new conversation:", {
          id: newConversationId,
          shop_id: shopId,
          product_id: productId,
          session_id: currentSessionId,
        });

        const { data: convData, error: convError } = await supabaseAdmin
          .from("conversations")
          .insert({
            id: newConversationId,
            shop_id: shopId,
            product_id: validProductId, // 検証済みのproductIdを使用
            session_id: currentSessionId,
            user_agent: userAgent,
            ip_address: ipAddress,
            started_at: new Date().toISOString(),
            message_count: 0,
          })
          .select()
          .single();

        if (convError) {
          console.error("[Chat API] Error creating conversation:", {
            error: convError,
            code: convError.code,
            message: convError.message,
            details: convError.details,
            hint: convError.hint,
            shopId,
            productId,
          });
          // 会話作成に失敗してもチャットは続行
        } else {
          console.log("[Chat API] Conversation created successfully:", {
            id: convData?.id,
            shop_id: convData?.shop_id,
          });
          currentConversationId = newConversationId;
        }
      } catch (error) {
        console.error("[Chat API] Error in conversation creation:", {
          error,
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          shopId,
          productId,
        });
        // 会話作成に失敗してもチャットは続行
      }
    } else if (!currentConversationId) {
      console.warn("[Chat API] supabaseAdmin is not available, conversation will not be saved");
    } else {
      console.log("[Chat API] Using existing conversation:", currentConversationId);
    }

    // 商品情報を取得（validProductIdがある場合）
    let productInfo = null;
    if (validProductId && supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from("products")
          .select("*")
          .eq("id", validProductId)
          .single();
        
        if (!error && data) {
          productInfo = {
            id: data.id,
            name: data.name,
            brand: data.brand,
            category: data.category,
            sku: data.sku,
            description: data.description,
            sizeTypeId: data.size_type_id,
          };
        }
      } catch (error) {
        console.error("Error fetching product info:", error);
        // 商品情報の取得に失敗してもチャットは続行
      }
    }

    // 商品情報をコンテキストに含める
    const systemPrompt = `あなたはアパレルECサイトのカスタマーサポートAIアシスタントです。
ユーザーからの質問に対して、親切で丁寧に回答してください。
商品に関する質問（サイズ、素材、着こなし、商品説明など）に答えることができます。
商品情報が提供されている場合は、その情報を参照して回答してください。
わからないことは正直に「わかりません」と答えてください。`;

    // 商品情報がある場合は追加のコンテキストを提供
    let userMessage = message;
    if (productInfo) {
      const productContext = [
        `商品名: ${productInfo.name}`,
        productInfo.brand ? `ブランド: ${productInfo.brand}` : null,
        productInfo.category ? `カテゴリ: ${productInfo.category}` : null,
        productInfo.sku ? `SKU: ${productInfo.sku}` : null,
        productInfo.description ? `商品説明: ${productInfo.description}` : null,
      ]
        .filter(Boolean)
        .join("\n");
      
      userMessage = `${productContext}\n\nユーザーの質問: ${message}`;
    } else if (context?.productName) {
      userMessage = `商品名: ${context.productName}\n\nユーザーの質問: ${message}`;
    }

    // Groq APIを呼び出し
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userMessage,
        },
      ],
      model: "llama-3.1-8b-instant", // 無料で高速なモデル
      temperature: 0.7,
      max_tokens: 500,
    });

    const response = completion.choices[0]?.message?.content || "申し訳ございませんが、回答を生成できませんでした。";

    // 会話ログを保存（会話IDが存在する場合のみ、デモ環境ではスキップ）
    if (currentConversationId && supabaseAdmin && !isDemoMode) {
      try {
        console.log("[Chat API] Saving messages for conversation:", currentConversationId);
        
        // ユーザーメッセージを保存
        const { data: userMsgData, error: userMsgError } = await supabaseAdmin
          .from("messages")
          .insert({
            conversation_id: currentConversationId,
            shop_id: shopId,
            role: "user",
            content: message,
            product_id: validProductId,
            context: context || null,
          })
          .select()
          .single();

        if (userMsgError) {
          console.error("[Chat API] Error saving user message:", {
            error: userMsgError,
            code: userMsgError.code,
            message: userMsgError.message,
            details: userMsgError.details,
            hint: userMsgError.hint,
            conversationId: currentConversationId,
          });
        } else {
          console.log("[Chat API] User message saved:", userMsgData?.id);
        }

        // アシスタントレスポンスを保存
        const { data: assistantMsgData, error: assistantMsgError } = await supabaseAdmin
          .from("messages")
          .insert({
            conversation_id: currentConversationId,
            shop_id: shopId,
            role: "assistant",
            content: response,
            product_id: validProductId,
            context: context || null,
          })
          .select()
          .single();

        if (assistantMsgError) {
          console.error("[Chat API] Error saving assistant message:", {
            error: assistantMsgError,
            code: assistantMsgError.code,
            message: assistantMsgError.message,
            details: assistantMsgError.details,
            hint: assistantMsgError.hint,
            conversationId: currentConversationId,
          });
        } else {
          console.log("[Chat API] Assistant message saved:", assistantMsgData?.id);
        }

        // 会話のメッセージ数を更新
        if (!userMsgError && !assistantMsgError) {
          // 現在のメッセージ数を取得してから更新
          const { data: currentConv, error: fetchError } = await supabaseAdmin
            .from("conversations")
            .select("message_count")
            .eq("id", currentConversationId)
            .single();

          if (!fetchError && currentConv) {
            const { error: updateError } = await supabaseAdmin
              .from("conversations")
              .update({ 
                message_count: (currentConv.message_count || 0) + 2,
                updated_at: new Date().toISOString()
              })
              .eq("id", currentConversationId);

            if (updateError) {
              console.error("[Chat API] Error updating conversation:", {
                error: updateError,
                code: updateError.code,
                message: updateError.message,
                conversationId: currentConversationId,
              });
            } else {
              console.log("[Chat API] Conversation message_count updated");
            }
          } else if (fetchError) {
            console.error("[Chat API] Error fetching conversation for update:", {
              error: fetchError,
              conversationId: currentConversationId,
            });
          }
        }
      } catch (error) {
        console.error("[Chat API] Error saving conversation log:", {
          error,
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          conversationId: currentConversationId,
        });
        // 会話ログの保存に失敗してもチャットレスポンスは返す
      }
    } else {
      if (isDemoMode) {
        console.log("[Chat API] Demo mode: Conversation and messages are not saved to database");
      } else {
        if (!currentConversationId) {
          console.warn("[Chat API] No conversation ID available, messages will not be saved");
        }
        if (!supabaseAdmin) {
          console.warn("[Chat API] supabaseAdmin is not available, messages will not be saved");
        }
      }
    }

    // レスポンスを返す前に、会話IDが設定されているか確認
    if (!currentConversationId) {
      console.warn("[Chat API] WARNING: No conversation ID available in response. Conversation may not be saved.");
    }

    return NextResponse.json(
      {
        response,
        model: completion.model,
        conversationId: currentConversationId || null, // undefinedの代わりにnullを返す
        sessionId: currentSessionId,
      },
      { 
        status: 200,
        headers: getCorsHeaders(),
      }
    );
  } catch (error) {
    console.error("Error in chat API:", error);
    
    // Groq APIのエラーを適切に処理
    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: "Failed to get chat response",
          message: error.message,
        },
        { 
          status: 500,
          headers: getCorsHeaders(),
        }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { 
        status: 500,
        headers: getCorsHeaders(),
      }
    );
  }
}
