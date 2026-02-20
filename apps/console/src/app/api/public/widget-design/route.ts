import { NextRequest, NextResponse } from "next/server";
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
      // デフォルト値（設定なし）
      const response = NextResponse.json({});
      return setCorsHeaders(response, request);
    }

    const design = {
      button: {
        color: data.button_color || "#ffffff",
        radius: data.button_radius ?? 8,
        width: data.button_width ?? 200,
        height: data.button_height ?? 56,
        fontSize: data.button_font_size ?? 14,
        borderWidth: data.button_border_width ?? 0,
        borderColor: data.button_border_color || "#000000",
        shadow: data.button_shadow ?? true,
        imageUrl: data.button_image_url || undefined,
        imageRadius: data.button_image_radius ?? 0,
        hasImage: data.has_image ?? false,
        title: data.button_title || "試着する",
        hasTitle: data.has_title ?? true,
        subtitle: data.button_subtitle || undefined,
        hasSubtitle: data.has_subtitle ?? false,
      },
    };

    const response = NextResponse.json(design);
    return setCorsHeaders(response, request);
  } catch (error) {
    console.error("[widget-design API] Error:", error);
    const response = NextResponse.json({}, { status: 500 });
    return setCorsHeaders(response, request);
  }
}
