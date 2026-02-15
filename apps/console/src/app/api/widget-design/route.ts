import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth/middleware";

/**
 * ウィジェットデザイン設定API
 *
 * GET  /api/widget-design  → 現在のショップの設定を取得
 * PUT  /api/widget-design  → 現在のショップの設定を更新（なければ作成）
 */

// DB行 → フロントエンド用の camelCase に変換
function toApiFormat(row: Record<string, unknown>) {
  return {
    backgroundImage: row.background_image ?? "",
    backgroundColor: row.background_color ?? "#f5f5f5",
    selectedModelId: row.model_id ?? "clo_model_men",
    widgetTheme: row.theme ?? "light",
    buttonText: row.button_text ?? "試着する",
    buttonColor: row.button_color ?? "#ffffff",
    buttonRadius: row.button_radius ?? 8,
    buttonWidth: row.button_width ?? 200,
    buttonHeight: row.button_height ?? 56,
    buttonFontSize: row.button_font_size ?? 14,
    buttonBorderWidth: row.button_border_width ?? 0,
    buttonBorderColor: row.button_border_color ?? "#000000",
    buttonShadow: row.button_shadow ?? true,
  };
}

// フロントエンド → DB行の snake_case に変換
function toDbFormat(body: Record<string, unknown>) {
  const fields: Record<string, unknown> = {};
  if (body.backgroundImage !== undefined) fields.background_image = body.backgroundImage;
  if (body.backgroundColor !== undefined) fields.background_color = body.backgroundColor;
  if (body.selectedModelId !== undefined) fields.model_id = body.selectedModelId;
  if (body.widgetTheme !== undefined) fields.theme = body.widgetTheme;
  if (body.buttonText !== undefined) fields.button_text = body.buttonText;
  if (body.buttonColor !== undefined) fields.button_color = body.buttonColor;
  if (body.buttonRadius !== undefined) fields.button_radius = body.buttonRadius;
  if (body.buttonWidth !== undefined) fields.button_width = body.buttonWidth;
  if (body.buttonHeight !== undefined) fields.button_height = body.buttonHeight;
  if (body.buttonFontSize !== undefined) fields.button_font_size = body.buttonFontSize;
  if (body.buttonBorderWidth !== undefined) fields.button_border_width = body.buttonBorderWidth;
  if (body.buttonBorderColor !== undefined) fields.button_border_color = body.buttonBorderColor;
  if (body.buttonShadow !== undefined) fields.button_shadow = body.buttonShadow;
  return fields;
}

// GET /api/widget-design
export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from("widget_designs")
      .select("*")
      .eq("shop_id", auth.shopId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching widget design:", error);
      return NextResponse.json({ error: "Failed to fetch widget design" }, { status: 500 });
    }

    // まだ設定がない場合はデフォルト値を返す
    if (!data) {
      return NextResponse.json(toApiFormat({}));
    }

    return NextResponse.json(toApiFormat(data));
  } catch (error) {
    console.error("Error in GET /api/widget-design:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/widget-design
export async function PUT(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const dbFields = toDbFormat(body);

    // UPSERT: 既にあれば更新、なければ挿入
    const { data, error } = await supabaseAdmin
      .from("widget_designs")
      .upsert(
        { shop_id: auth.shopId, ...dbFields },
        { onConflict: "shop_id" }
      )
      .select()
      .single();

    if (error) {
      console.error("Error saving widget design:", error);
      return NextResponse.json({ error: "Failed to save widget design" }, { status: 500 });
    }

    return NextResponse.json(toApiFormat(data));
  } catch (error) {
    console.error("Error in PUT /api/widget-design:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
