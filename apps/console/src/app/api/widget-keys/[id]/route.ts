import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth/middleware";
import { z } from "zod";

const updateWidgetKeySchema = z.object({
  allowed_domains: z.array(z.string().min(1)).optional(),
  enabled: z.boolean().optional(),
});

/**
 * PATCH /api/widget-keys/:id - Update widget key
 * 
 * 許可ドメインや有効/無効を更新
 */
export async function PATCH(
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

    // オーナーのみ更新可能
    if (auth.userRole !== "owner") {
      return NextResponse.json(
        { error: "Only owners can update widget keys" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    
    const validated = updateWidgetKeySchema.parse(body);

    // 既存のwidget_keyを取得して、shop_idを確認
    const { data: existingKey, error: fetchError } = await supabaseAdmin
      .from("widget_keys")
      .select("shop_id")
      .eq("id", id)
      .single();

    if (fetchError || !existingKey) {
      return NextResponse.json(
        { error: "Widget key not found" },
        { status: 404 }
      );
    }

    // 自分のショップのキーか確認
    if (existingKey.shop_id !== auth.shopId) {
      return NextResponse.json(
        { error: "Unauthorized: This widget key belongs to a different shop" },
        { status: 403 }
      );
    }

    // 更新データを構築
    const updateData: Record<string, unknown> = {};
    if (validated.allowed_domains !== undefined) {
      // TEXT[]型の配列として保存（空配列の場合は空配列として保存）
      updateData.allowed_domains = validated.allowed_domains.length > 0 
        ? validated.allowed_domains 
        : [];
      console.log("[PATCH /api/widget-keys/:id] Updating allowed_domains:", updateData.allowed_domains);
    }
    if (validated.enabled !== undefined) {
      updateData.enabled = validated.enabled;
    }

    console.log("[PATCH /api/widget-keys/:id] Update data:", updateData);

    // 更新
    const { data, error } = await supabaseAdmin
      .from("widget_keys")
      .update(updateData)
      .eq("id", id)
      .eq("shop_id", auth.shopId)
      .select("id, shop_id, public_key, allowed_domains, enabled, created_at, updated_at")
      .single();

    console.log("[PATCH /api/widget-keys/:id] Update result:", { data, error });

    if (error) {
      console.error("Error updating widget key:", error);
      return NextResponse.json(
        {
          error: "Failed to update widget key",
          message: error.message,
          details: error.code,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: error.issues,
        },
        { status: 400 }
      );
    }

    console.error("Error in PATCH /api/widget-keys/:id:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
