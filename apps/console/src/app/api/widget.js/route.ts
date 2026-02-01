import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

export async function GET(request: NextRequest) {
  try {
    // public/widget.jsを読み込む
    const filePath = join(process.cwd(), "public", "widget.js");
    const fileContents = readFileSync(filePath, "utf-8");

    // CORSヘッダーを追加
    const response = new NextResponse(fileContents, {
      status: 200,
      headers: {
        "Content-Type": "application/javascript",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Cache-Control": "public, max-age=31536000, immutable",
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
