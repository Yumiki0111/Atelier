import { NextRequest, NextResponse } from "next/server";
import {
  WIDGET_DESIGN_CANVAS_BG_DEFAULT,
  WIDGET_DESIGN_INTERFACE_BG_DEFAULT,
  normalizeWidgetCtaAccentColor,
} from "@Atelier/shared";
import { supabaseAdmin } from "@/lib/supabase/server";
import { setCorsHeaders, handleCorsOptions, validatePublicKeyAndDomain } from "@/lib/api/cors";

/**
 * ウィジェットデザイン設定 公開API（軽量版）
 *
 * publicKey からショップのデザイン設定のみを返す
 * ボタン初期表示時に呼ばれるため高速に応答する
 */

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

export async function GET(request: NextRequest) {
  try {
    const publicKey = request.nextUrl.searchParams.get("publicKey");
    if (!publicKey) {
      const response = NextResponse.json(
        { error: "publicKey is required" },
        { status: 400 }
      );
      return setCorsHeaders(response, request);
    }

    const validation = await validatePublicKeyAndDomain(request, publicKey);
    if (!validation.success) {
      return validation.response;
    }
    const shopId = validation.shopId;

    if (!supabaseAdmin) {
      const response = NextResponse.json({}, { status: 500 });
      return setCorsHeaders(response, request);
    }

    const { data } = await supabaseAdmin
      .from("widget_designs")
      .select("*")
      .eq("shop_id", shopId)
      .maybeSingle();

    if (!data) {
      // デザイン未設定でも shopId は返す（ウィジェット側の分析・イベント用）
      const response = NextResponse.json({ shopId });
      return setCorsHeaders(response, request);
    }

    const design = {
      shopId,
      button: {
        color: data.button_color || "#ffffff",
        text: data.button_text || "", // デフォルト値は空文字列（設定されていない場合は表示しない）
        shape: data.button_shape === "circle" ? "circle" : "pill", // circle or pill
        imageUrl: data.button_image_url || undefined,
      },
      interfaceBackgroundColor:
        data.interface_background_color ?? WIDGET_DESIGN_INTERFACE_BG_DEFAULT,
      canvasBackgroundColor: data.canvas_background_color ?? WIDGET_DESIGN_CANVAS_BG_DEFAULT,
      ctaCartLabel: data.cta_cart_label ?? "カートに追加",
      ctaTryOnLabel: data.cta_try_on_label ?? "この体型で試着する",
      ctaAccentColor: normalizeWidgetCtaAccentColor(data.cta_accent_color),
      launcherPlacement: data.launcher_placement === "floating" ? "floating" : "inline",
    };

    const response = NextResponse.json(design);
    return setCorsHeaders(response, request);
  } catch (error) {
    console.error("[widget-design API] Error:", error);
    const response = NextResponse.json({}, { status: 500 });
    return setCorsHeaders(response, request);
  }
}
