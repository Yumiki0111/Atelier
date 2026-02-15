import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * CORSヘッダーを設定するヘルパー関数（公開API用）
 * originヘッダーを反映する
 */
export function setCorsHeaders(response: NextResponse, request: NextRequest): NextResponse {
  const origin = request.headers.get("origin");
  if (origin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type");
    response.headers.set("Access-Control-Allow-Credentials", "true");
  }
  return response;
}

/**
 * OPTIONSプリフライトリクエストのレスポンスを生成する
 */
export function handleCorsOptions(request: NextRequest): NextResponse {
  const response = new NextResponse(null, { status: 200 });
  return setCorsHeaders(response, request);
}

/**
 * publicKeyからwidgetKeyを取得し、ドメイン検証を行う
 * @returns widgetKey（成功時）またはNextResponse（エラー時）
 */
export async function validatePublicKeyAndDomain(
  request: NextRequest,
  publicKey: string
): Promise<
  | { success: true; shopId: string }
  | { success: false; response: NextResponse }
> {
  if (!supabaseAdmin) {
    const response = NextResponse.json({ enabled: false, error: "Database not configured" }, { status: 500 });
    return { success: false, response: setCorsHeaders(response, request) };
  }

  // public_key から shop_id を取得（enabled=true のみ）
  const { data: widgetKey, error: keyError } = await supabaseAdmin
    .from("widget_keys")
    .select("shop_id, allowed_domains")
    .eq("public_key", publicKey)
    .eq("enabled", true)
    .single();

  if (keyError || !widgetKey) {
    const response = NextResponse.json({ enabled: false }, { status: 403 });
    return { success: false, response: setCorsHeaders(response, request) };
  }

  // ドメイン検証
  const origin = request.headers.get("origin") || request.headers.get("referer");
  if (!origin) {
    const response = NextResponse.json({ enabled: false, error: "Origin or referer header required" }, { status: 400 });
    return { success: false, response: setCorsHeaders(response, request) };
  }

  try {
    const url = new URL(origin);
    const host = url.host;
    const allowedDomains: string[] = widgetKey.allowed_domains || [];

    const isAllowed = allowedDomains.some((domain) => {
      // 完全一致
      if (host === domain) return true;
      // サブドメイン許可
      if (host.endsWith(`.${domain}`)) return true;
      return false;
    });

    if (!isAllowed) {
      const response = NextResponse.json(
        { enabled: false, error: `ドメイン "${host}" が許可されていません。` },
        { status: 403 }
      );
      return { success: false, response: setCorsHeaders(response, request) };
    }
  } catch {
    const response = NextResponse.json({ enabled: false, error: "Invalid origin" }, { status: 400 });
    return { success: false, response: setCorsHeaders(response, request) };
  }

  return { success: true, shopId: widgetKey.shop_id };
}
