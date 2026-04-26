import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { authorizeInternalAdminRequest } from "@/lib/auth/internalAdminRequest";
import crypto from "crypto";

/**
 * Shop Provision API（FIT&LOOK 運営者向け管理者 API）
 * 
 * 新しいショップを作成し、widget_keys を発行する。
 * ownerEmail を渡した場合のみ pending_invites 作成と招待メールを送る。
 * 
 * 認可: ADMIN_TOKEN（x-admin-token）または発行管理者 Bearer
 * 
 * 入力: { shopName, ownerEmail?（任意）, allowedDomains?（任意・省略または [] で後から設定可） }
 * 出力: { shop_id, public_key, secret_key (一度だけ) }
 */
export async function POST(request: NextRequest) {
  try {
    console.log("[provision-shop API] POST request received");

    const authorized = await authorizeInternalAdminRequest(request);
    if (!authorized) {
      console.warn("[provision-shop API] Unauthorized internal admin request");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!supabaseAdmin) {
      console.error("[provision-shop API] Database not configured");
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    // リクエストボディの検証
    const body = await request.json();
    const { shopName, ownerEmail: ownerEmailRaw, allowedDomains } = body;

    if (!shopName || typeof shopName !== "string") {
      return NextResponse.json(
        { error: "shopName is required" },
        { status: 400 }
      );
    }

    if (
      allowedDomains !== undefined &&
      allowedDomains !== null &&
      !Array.isArray(allowedDomains)
    ) {
      return NextResponse.json(
        { error: "allowedDomains must be an array of strings when provided" },
        { status: 400 }
      );
    }

    const allowedDomainsNormalized: string[] = Array.isArray(allowedDomains)
      ? allowedDomains
          .filter((d: unknown): d is string => typeof d === "string")
          .map((d) => d.trim())
          .filter((d) => d.length > 0)
      : [];

    const ownerEmail =
      typeof ownerEmailRaw === "string" && ownerEmailRaw.trim().length > 0
        ? ownerEmailRaw.trim()
        : undefined;

    console.log("[provision-shop API] Creating shop:", { shopName, ownerEmail: ownerEmail ?? "(none)" });

    // 1. shops を作成
    // shopName が提供されない場合は "新規ショップ" として作成（オンボーディングで設定）
    const { data: shop, error: shopError } = await supabaseAdmin
      .from("shops")
      .insert({
        name: shopName || "新規ショップ",
        enabled: true,
      })
      .select()
      .single();

    if (shopError || !shop) {
      console.error("[provision-shop API] Error creating shop:", shopError);
      return NextResponse.json(
        { error: "Failed to create shop", details: shopError?.message },
        { status: 500 }
      );
    }

    console.log("[provision-shop API] Shop created:", shop.id);

    // 2. widget_keys を発行
    const publicKey = `pub_live_${crypto.randomBytes(16).toString("hex")}`;
    const secretKey = `sec_live_${crypto.randomBytes(32).toString("hex")}`;
    
    // secret_key をハッシュ化（bcrypt の代わりに crypto.pbkdf2 を使用）
    const secretKeyHash = crypto
      .pbkdf2Sync(secretKey, process.env.SECRET_KEY_SALT || "Atelier-salt", 10000, 64, "sha512")
      .toString("hex");

    const { data: widgetKey, error: widgetKeyError } = await supabaseAdmin
      .from("widget_keys")
      .insert({
        shop_id: shop.id,
        public_key: publicKey,
        secret_key_hash: secretKeyHash,
        allowed_domains: allowedDomainsNormalized,
        enabled: true,
      })
      .select()
      .single();

    if (widgetKeyError || !widgetKey) {
      console.error("[provision-shop API] Error creating widget_keys:", widgetKeyError);
      // ショップは作成済みなので、エラーでも続行
    } else {
      console.log("[provision-shop API] Widget keys created:", widgetKey.id);
    }

    // アプリのベースURLを取得（環境変数またはリクエストから）
    const getAppUrl = () => {
      // 1. 環境変数から取得（優先）
      if (process.env.NEXT_PUBLIC_APP_URL) {
        return process.env.NEXT_PUBLIC_APP_URL;
      }
      
      // 2. リクエストから取得
      const host = request.headers.get("host");
      const protocol = request.headers.get("x-forwarded-proto") || "http";
      if (host) {
        // localhostの場合は開発環境と判断
        if (host.includes("localhost") || host.includes("127.0.0.1")) {
          return `http://${host}`;
        }
        // 本番環境の場合はhttpsを使用
        return `${protocol}://${host}`;
      }
      
      // 3. フォールバック
      return "http://localhost:3000";
    };
    
    const appUrl = getAppUrl();
    console.log("[provision-shop API] App URL:", appUrl);

    if (!ownerEmail) {
      const domainHint =
        allowedDomainsNormalized.length === 0
          ? " 許可ドメインは未設定です。埋め込み前にコンソールのウィジェット設定で追加してください。"
          : "";
      return NextResponse.json({
        success: true,
        shop_id: shop.id,
        public_key: publicKey,
        secret_key: secretKey,
        message:
          "ショップとウィジェットキーを作成しました。オーナーは後から招待してください（コンソールの運用フローに従って pending_invites / 招待メールを設定）。secret_key はこの応答でのみ表示されます。" +
          domainHint,
      });
    }

    // 3. pending_invites を作成
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("pending_invites")
      .insert({
        shop_id: shop.id,
        email: ownerEmail,
        role: "owner",
      })
      .select()
      .single();

    if (inviteError || !invite) {
      console.error("[provision-shop API] Error creating invite:", inviteError);
      return NextResponse.json(
        { error: "Failed to create invite", details: inviteError?.message },
        { status: 500 }
      );
    }

    console.log("[provision-shop API] Invite created:", invite.id);

    // 4. Supabase Admin API で owner を招待
    try {
      const { data: inviteData, error: inviteAuthError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        ownerEmail,
        {
          data: {
            shop_id: shop.id,
            role: "owner",
          },
          redirectTo: `${appUrl}/auth/set-password`,
        }
      );

      if (inviteAuthError) {
        console.error("[provision-shop API] Error sending invite email:", {
          message: inviteAuthError.message,
          status: inviteAuthError.status,
          name: inviteAuthError.name,
        });
        return NextResponse.json({
          success: true,
          shop_id: shop.id,
          public_key: publicKey,
          secret_key: secretKey,
          message: "Shop provisioned successfully, but invite email failed. Please resend the invite manually.",
          emailError: inviteAuthError.message,
        });
      } else {
        console.log("[provision-shop API] Invite email sent to:", ownerEmail, "User ID:", inviteData?.user?.id);
      }
    } catch (emailError) {
      console.error("[provision-shop API] Exception sending invite email:", emailError);
      return NextResponse.json({
        success: true,
        shop_id: shop.id,
        public_key: publicKey,
        secret_key: secretKey,
        message: "Shop provisioned successfully, but invite email failed. Please resend the invite manually.",
        emailError: emailError instanceof Error ? emailError.message : "Unknown error",
      });
    }

    return NextResponse.json({
      success: true,
      shop_id: shop.id,
      public_key: publicKey,
      secret_key: secretKey,
      message: "Shop provisioned successfully. Save the secret_key now, it will not be shown again.",
    });
  } catch (error: any) {
    console.error("[provision-shop API] Unexpected error:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
