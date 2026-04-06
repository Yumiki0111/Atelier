import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { createEventSchema } from "@Atelier/shared";
import { z } from "zod";

// CORSヘッダーを設定する関数
function getCorsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*", // ウィジェットは任意のドメインから送信されるため全オリジン許可
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

/**
 * OPTIONS /api/events - CORS preflight
 */
export async function OPTIONS() {
  return NextResponse.json({}, { headers: getCorsHeaders() });
}

export async function POST(request: NextRequest) {
  let body: any;
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500, headers: getCorsHeaders() }
      );
    }

    body = await request.json();
    
    // productIdがUUID形式でない場合はnullに変換（外部キー制約エラーを防ぐ）
    let validProductId: string | null = null;
    if (body.productId) {
      // UUID形式かどうかを簡易チェック（8-4-4-4-12の形式）
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(body.productId)) {
        validProductId = body.productId;
      } else {
        console.warn("[Events API] Invalid productId format (not UUID), setting to null:", body.productId);
        validProductId = null;
      }
    }
    
    // productIdを修正したボディでバリデーション
    const bodyToValidate = {
      ...body,
      productId: validProductId || undefined,
    };
    
    const validated = createEventSchema.parse(bodyToValidate);

    const { error } = await supabaseAdmin.from("events").insert({
      shop_id: validated.shopId,
      product_id: validated.productId || null,
      type: validated.type,
      meta: validated.meta || null,
      session_id: validated.sessionId || null,
      user_agent: validated.userAgent || null,
      ip_address: validated.ipAddress || null,
    });

    if (error) {
      console.error("Error inserting event:", error);
      return NextResponse.json(
        { error: "Failed to save event" },
        { status: 500, headers: getCorsHeaders() }
      );
    }

    return NextResponse.json({ success: true }, { status: 201, headers: getCorsHeaders() });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("[Events API] Validation error:", error);
      console.error("[Events API] Validation issues:", JSON.stringify(error.issues, null, 2));
      console.error("[Events API] Request body:", JSON.stringify(body, null, 2));
      return NextResponse.json(
        { 
          error: "Invalid request body", 
          details: error.message,
          // 開発環境でのみ詳細を返す
          ...(process.env.NODE_ENV === "development" 
            ? { issues: error.issues } 
            : {})
        },
        { status: 400, headers: getCorsHeaders() }
      );
    }

    console.error("Error in events API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: getCorsHeaders() }
    );
  }
}
