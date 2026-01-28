import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * GET /api/debug/db-check - データベースの状態を確認
 * 開発環境でのみ使用（本番環境では削除推奨）
 */
export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        {
          error: "Database not configured",
          details: {
            NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? "✓ set" : "✗ not set",
            SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? "✓ set" : "✗ not set",
          },
        },
        { status: 500 }
      );
    }

    const checks: Record<string, any> = {};

    // conversationsテーブルの存在確認
    try {
      const { data, error } = await supabaseAdmin
        .from("conversations")
        .select("id")
        .limit(1);

      checks.conversations = {
        exists: !error || error.code !== "42P01", // 42P01 = relation does not exist
        error: error ? {
          code: error.code,
          message: error.message,
        } : null,
        count: data ? data.length : 0,
      };
    } catch (error) {
      checks.conversations = {
        exists: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }

    // messagesテーブルの存在確認
    try {
      const { data, error } = await supabaseAdmin
        .from("messages")
        .select("id")
        .limit(1);

      checks.messages = {
        exists: !error || error.code !== "42P01",
        error: error ? {
          code: error.code,
          message: error.message,
        } : null,
        count: data ? data.length : 0,
      };
    } catch (error) {
      checks.messages = {
        exists: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }

    // テスト挿入（conversations）
    let testInsertConversation: any = null;
    if (checks.conversations.exists) {
      try {
        const testId = crypto.randomUUID();
        const { data, error } = await supabaseAdmin
          .from("conversations")
          .insert({
            id: testId,
            shop_id: "test_shop",
            session_id: "test_session",
            message_count: 0,
          })
          .select()
          .single();

        if (!error && data) {
          // テストデータを削除
          await supabaseAdmin
            .from("conversations")
            .delete()
            .eq("id", testId);

          testInsertConversation = {
            success: true,
            message: "Test insert and delete successful",
          };
        } else {
          testInsertConversation = {
            success: false,
            error: error ? {
              code: error.code,
              message: error.message,
              details: error.details,
              hint: error.hint,
            } : "Unknown error",
          };
        }
      } catch (error) {
        testInsertConversation = {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    // テスト挿入（messages）- conversationsテーブルが存在する場合のみ
    let testInsertMessage: any = null;
    if (checks.conversations.exists && checks.messages.exists) {
      try {
        // まずテスト用のconversationを作成
        const testConvId = crypto.randomUUID();
        const { data: convData, error: convError } = await supabaseAdmin
          .from("conversations")
          .insert({
            id: testConvId,
            shop_id: "test_shop",
            session_id: "test_session",
            message_count: 0,
          })
          .select()
          .single();

        if (!convError && convData) {
          // テストメッセージを挿入
          const { data: msgData, error: msgError } = await supabaseAdmin
            .from("messages")
            .insert({
              conversation_id: testConvId,
              role: "user",
              content: "test message",
            })
            .select()
            .single();

          // テストデータを削除
          await supabaseAdmin
            .from("conversations")
            .delete()
            .eq("id", testConvId);

          if (!msgError && msgData) {
            testInsertMessage = {
              success: true,
              message: "Test insert and delete successful",
            };
          } else {
            testInsertMessage = {
              success: false,
              error: msgError ? {
                code: msgError.code,
                message: msgError.message,
                details: msgError.details,
                hint: msgError.hint,
              } : "Unknown error",
            };
          }
        } else {
          testInsertMessage = {
            success: false,
            error: convError ? {
              code: convError.code,
              message: convError.message,
            } : "Failed to create test conversation",
          };
        }
      } catch (error) {
        testInsertMessage = {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    return NextResponse.json({
      database: {
        configured: true,
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      },
      tables: checks,
      testInserts: {
        conversation: testInsertConversation,
        message: testInsertMessage,
      },
    });
  } catch (error) {
    console.error("Error in db-check API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
