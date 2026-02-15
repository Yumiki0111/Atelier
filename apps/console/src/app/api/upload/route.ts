import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth/middleware";

// App Router用の設定
export const runtime = 'nodejs'; // Node.jsランタイムを使用
export const maxDuration = 300; // 5分（大きなファイルのアップロードに時間がかかる場合があるため）

// ファイルアップロード用のAPIエンドポイント
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

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const folder = formData.get("folder") as string || "uploads"; // デフォルトはuploadsフォルダ

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // ファイルサイズのチェック（500MB制限）
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size exceeds 500MB limit" },
        { status: 400 }
      );
    }

    // 大きなファイル（50MB以上）の場合はクライアントサイドアップロードを推奨
    const LARGE_FILE_THRESHOLD = 50 * 1024 * 1024; // 50MB
    if (file.size > LARGE_FILE_THRESHOLD) {
      // ファイル名を安全にする（UUID + 元の拡張子）
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;
      const bucketName = process.env.SUPABASE_STORAGE_BUCKET || "products";
      
      // 公開URLを取得（アップロード完了後に使用）
      const { data: urlData } = supabaseAdmin.storage
        .from(bucketName)
        .getPublicUrl(filePath);
      
      // クライアントサイドアップロード用の情報を返す
      return NextResponse.json({
        useClientUpload: true,
        fileName,
        filePath,
        bucketName,
        folder,
        contentType: file.type,
        publicUrl: urlData?.publicUrl,
      });
    }

    // ファイル名を安全にする（UUID + 元の拡張子）
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    // ファイルをArrayBufferに変換
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Supabase Storageにアップロード
    // まずバケットが存在するか確認
    // 環境変数からバケット名を取得、なければデフォルト値を使用
    const bucketName = process.env.SUPABASE_STORAGE_BUCKET || "products";
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    
    if (listError) {
      console.error("Error listing buckets:", listError);
      console.error("Available buckets:", buckets);
      return NextResponse.json(
        { 
          error: "Failed to access storage", 
          details: listError.message,
          hint: "Supabase Storageの設定を確認してください。環境変数SUPABASE_SERVICE_ROLE_KEYが正しく設定されているか確認してください。"
        },
        { status: 500 }
      );
    }

    if (process.env.NODE_ENV === "development") {
      console.log("Available buckets:", buckets?.map(b => ({ name: b.name, public: b.public })));
    }

    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    if (!bucketExists) {
      const availableBuckets = buckets?.map(b => b.name).join(", ") || "なし";
      console.error(`Bucket "${bucketName}" does not exist. Available buckets: ${availableBuckets}`);
      return NextResponse.json(
        { 
          error: `Storage bucket "${bucketName}" not found`, 
          details: `バケット "${bucketName}" が存在しません。`,
          availableBuckets: buckets?.map(b => b.name) || [],
          hint: `利用可能なバケット: ${availableBuckets}。Supabase Dashboard > Storage > New bucket でバケットを作成するか、既存のバケット名を使用してください。`
        },
        { status: 500 }
      );
    }

    if (process.env.NODE_ENV === "development") {
      console.log(`Uploading to bucket: ${bucketName}, path: ${filePath}, size: ${file.size} bytes`);
    }
    
    // 大きなファイル（50MB以上）の場合はチャンクアップロードを使用
    const CHUNK_SIZE = 50 * 1024 * 1024; // 50MB per chunk
    const fileSize = file.size;
    
    let data, error;
    
    if (fileSize > CHUNK_SIZE) {
      // チャンクアップロード
      if (process.env.NODE_ENV === "development") {
        console.log(`Large file detected (${fileSize} bytes), using chunked upload`);
      }
      
      // Supabase Storageのチャンクアップロードは、ファイルを分割してアップロードする必要がある
      // しかし、Supabase StorageのNode.jsクライアントは自動的にチャンクアップロードをサポートしていないため、
      // 一度にアップロードを試みる（Supabase Storageの制限は通常50MBだが、プランによって異なる）
      // エラーが発生した場合は、より詳細なエラーメッセージを返す
      
      // まず通常のアップロードを試みる
      const uploadResult = await supabaseAdmin.storage
        .from(bucketName)
        .upload(filePath, buffer, {
          contentType: file.type,
          upsert: false,
        });
      
      data = uploadResult.data;
      error = uploadResult.error;
      
      // エラーが発生し、ファイルサイズ制限に関するエラーの場合
      if (error && (error.message?.includes("maximum allowed size") || error.message?.includes("exceeded"))) {
        return NextResponse.json(
          { 
            error: "File size exceeds storage limit", 
            details: `ファイルサイズ（${(fileSize / 1024 / 1024).toFixed(2)}MB）がSupabase Storageの制限を超えています。`,
            hint: "Supabase Storageの無料プランでは50MB、Proプランでは5GBまでアップロード可能です。プランをアップグレードするか、ファイルサイズを圧縮してください。"
          },
          { status: 413 }
        );
      }
    } else {
      // 通常のアップロード
      const uploadResult = await supabaseAdmin.storage
        .from(bucketName)
        .upload(filePath, buffer, {
          contentType: file.type,
          upsert: false,
        });
      
      data = uploadResult.data;
      error = uploadResult.error;
    }

    if (error) {
      console.error("Error uploading file:", error);
      // StorageErrorの型に合わせて安全にプロパティにアクセス
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorName = error instanceof Error ? error.name : "StorageError";
      
      console.error("Error details:", {
        message: errorMessage,
        name: errorName,
        error: error,
      });
      
      // バケットが見つからない場合の詳細なエラー情報
      if (errorMessage?.includes("Bucket not found") || errorMessage?.includes("404")) {
        const availableBuckets = buckets?.map(b => b.name).join(", ") || "なし";
        return NextResponse.json(
          { 
            error: "Bucket not found", 
            details: `バケット "${bucketName}" が見つかりませんでした。`,
            availableBuckets: buckets?.map(b => b.name) || [],
            hint: `利用可能なバケット: ${availableBuckets}。Supabase Dashboardでバケットを作成するか、既存のバケット名を使用してください。`
          },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { 
          error: "Failed to upload file", 
          details: errorMessage,
          hint: errorMessage?.includes("new row violates row-level security")
            ? "StorageのRLSポリシーを確認してください。公開バケットとして設定するか、適切なポリシーを設定してください。"
            : "ファイルのアップロードに失敗しました。ファイルサイズや形式を確認してください。"
        },
        { status: 500 }
      );
    }

    // アップロードされたファイルが存在するか確認
    const { data: fileData, error: fileError } = await supabaseAdmin.storage
      .from(bucketName)
      .list(folder, {
        limit: 100,
        search: fileName,
      });

    if (fileError) {
      console.error("Error checking uploaded file:", fileError);
    }

    // 公開URLを取得
    const { data: urlData } = supabaseAdmin.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      console.error("Failed to get public URL");
      return NextResponse.json(
        { 
          error: "Failed to get public URL",
          details: "ファイルはアップロードされましたが、公開URLの取得に失敗しました"
        },
        { status: 500 }
      );
    }

    // バケットが公開設定かどうかを確認
    const bucket = buckets?.find(b => b.name === bucketName);
    const isPublic = bucket?.public === true;

    if (process.env.NODE_ENV === "development") {
      console.log("Upload successful:", {
        fileName,
        filePath,
        url: urlData.publicUrl,
        bucketPublic: isPublic,
        fileExists: fileData && fileData.length > 0,
      });
    }

    return NextResponse.json({
      url: urlData.publicUrl,
      path: filePath,
      fileName: fileName,
      bucketPublic: isPublic,
      warning: !isPublic ? "バケットが公開設定になっていない可能性があります。Supabase Dashboardで確認してください。" : undefined,
    });
  } catch (error) {
    console.error("Error in POST /api/upload:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
