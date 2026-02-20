import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

export async function GET(request: NextRequest) {
  try {
    // public/widget.jsを読み込む
    const filePath = join(process.cwd(), "public", "widget.js");
    
    // ファイルの存在確認とデバッグ情報
    const fs = await import("fs");
    const stats = fs.statSync(filePath);
    const fileContents = readFileSync(filePath, "utf-8");
    
    // デバッグ用: ファイルサイズと最終更新日時をログに出力（本番環境のみ）
    if (process.env.VERCEL) {
      console.log(`[widget.js] File size: ${stats.size} bytes, Modified: ${stats.mtime.toISOString()}`);
      // ファイルの最初の100文字を確認（デバッグ用）
      const preview = fileContents.substring(0, 100);
      console.log(`[widget.js] File preview: ${preview}...`);
    }

    // CORSヘッダーを追加
    // キャッシュを短く設定して、デプロイ後の更新を確実に反映
    const response = new NextResponse(fileContents, {
      status: 200,
      headers: {
        "Content-Type": "application/javascript",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Cache-Control": "public, max-age=3600, must-revalidate",
      },
    });

    return response;
  } catch (error) {
    console.error("[widget.js route] Error reading widget.js:", error);
    return new NextResponse("Widget file not found", { status: 404 });
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
