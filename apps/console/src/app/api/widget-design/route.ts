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
    buttonColor: row.button_color ?? "#ffffff",
    buttonText: row.button_text ?? "", // デフォルト値は空文字列（設定されていない場合は表示しない）
    buttonShape: row.button_shape === "circle" ? "circle" : "pill",
    buttonImageUrl: row.button_image_url ?? "",
    interfaceBackgroundColor: (row.interface_background_color as string) ?? "#fafafa",
    canvasBackgroundColor: (row.canvas_background_color as string) ?? "#fafafa",
    ctaCartLabel: (row.cta_cart_label as string) ?? "カートに追加",
    ctaTryOnLabel: (row.cta_try_on_label as string) ?? "この体型で試着する",
    ctaAccentColor: (row.cta_accent_color as string) ?? "#3d3835",
  };
}

// フロントエンド → DB行の snake_case に変換
function toDbFormat(body: Record<string, unknown>) {
  const fields: Record<string, unknown> = {};
  if (body.buttonColor !== undefined) fields.button_color = body.buttonColor;
  if (body.buttonText !== undefined) fields.button_text = body.buttonText;
  if (body.buttonShape !== undefined) fields.button_shape = body.buttonShape;
  if (body.buttonImageUrl !== undefined) fields.button_image_url = body.buttonImageUrl;
  if (body.interfaceBackgroundColor !== undefined) {
    fields.interface_background_color = body.interfaceBackgroundColor;
  }
  if (body.canvasBackgroundColor !== undefined) {
    fields.canvas_background_color = body.canvasBackgroundColor;
  }
  if (body.ctaCartLabel !== undefined) fields.cta_cart_label = body.ctaCartLabel;
  if (body.ctaTryOnLabel !== undefined) fields.cta_try_on_label = body.ctaTryOnLabel;
  if (body.ctaAccentColor !== undefined) fields.cta_accent_color = body.ctaAccentColor;
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
      return NextResponse.json(
        {
          error: "Failed to fetch widget design",
          /** ローカルでテーブル未作成のときは `relation "widget_designs" does not exist` など */
          details: error.message,
          code: error.code,
        },
        { status: 500 }
      );
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
