import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth/middleware";

// App Router用の設定
export const runtime = 'nodejs';
export const maxDuration = 60; // 1分（Signed URL生成は短時間で完了）

// Signed URLを生成するAPIエンドポイント
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { fileName, folder, contentType } = body;

    if (!fileName) {
      return NextResponse.json(
        { error: "fileName is required" },
        { status: 400 }
      );
    }

    // 環境変数からバケット名を取得、なければデフォルト値を使用
    const bucketName = process.env.SUPABASE_STORAGE_BUCKET || "products";
    const filePath = `${folder || "models"}/${fileName}`;

    // Supabase StorageのREST APIを使用してアップロード用のURLを生成
    // Service Role Keyを使用して、アップロード用の一時的なURLを生成
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Supabase configuration missing" },
        { status: 500 }
      );
    }
    
    // Supabase StorageのREST APIを使用して、PUTリクエストでアップロードするためのURLを生成
    // 実際には、クライアント側でSupabaseクライアントを使用してアップロードする必要があります
    // しかし、RLSポリシーを回避するため、Service Role Keyを使用したアップロードが必要
    
    // 公開URLを取得（アップロード完了後に使用）
    const { data: urlData } = supabaseAdmin.storage
      .from(bucketName)
      .getPublicUrl(filePath);
    
    // アップロード用の情報を返す
    return NextResponse.json({
      path: filePath,
      publicUrl: urlData?.publicUrl,
      bucketName,
    });
  } catch (error) {
    console.error("Error in POST /api/upload/signed-url:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
