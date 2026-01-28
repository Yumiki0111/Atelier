import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

/**
 * 商品CSV一括インポートAPI
 * 
 * CSVフォーマット（UTF-8、ヘッダー必須）:
 * - external_product_id（必須）
 * - name（任意）
 * 
 * 既存商品（同一shop_id + external_product_id）は更新せずスキップ
 * 最大5000行まで処理
 */
export async function POST(request: NextRequest) {
  try {
    console.log("[import-csv API] POST request received");
    
    // Authorizationヘッダーからトークンを取得
    const authHeader = request.headers.get("authorization");
    console.log("[import-csv API] Auth header:", authHeader ? "present" : "missing");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.warn("[import-csv API] Missing or invalid authorization header");
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // 環境変数を取得
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("[import-csv API] Supabase not configured");
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 500 }
      );
    }

    // トークンを検証してユーザーIDを取得
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      console.error("[import-csv API] Invalid or expired token:", authError);
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    if (!supabaseAdmin) {
      console.error("[import-csv API] Database not configured");
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    // 現在のユーザーの shop_id を取得
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("shop_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("[import-csv API] Profile not found:", profileError);
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    const shopId = profile.shop_id;
    console.log("[import-csv API] User shop_id:", shopId);

    // multipart/form-data からファイルを取得
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "CSV file is required" },
        { status: 400 }
      );
    }

    // ファイルサイズチェック（10MBまで）
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size exceeds 10MB" },
        { status: 400 }
      );
    }

    // UTF-8 でファイル内容を読み込む
    const csvText = await file.text();
    const lines = csvText.split(/\r?\n/).filter((line) => line.trim() !== "");

    if (lines.length === 0) {
      return NextResponse.json(
        { error: "CSV file is empty" },
        { status: 400 }
      );
    }

    // 最大行数チェック（ヘッダー含め5001行まで = データ5000行）
    if (lines.length > 5001) {
      return NextResponse.json(
        { error: "CSV file exceeds 5000 rows" },
        { status: 400 }
      );
    }

    // ヘッダー行をパース
    const headerLine = lines[0];
    const headers = headerLine.split(",").map((h) => h.trim());

    const externalProductIdIndex = headers.indexOf("external_product_id");
    const nameIndex = headers.indexOf("name");

    if (externalProductIdIndex === -1) {
      return NextResponse.json(
        { error: "CSV must have 'external_product_id' column" },
        { status: 400 }
      );
    }

    console.log("[import-csv API] CSV headers:", headers);

    // データ行を処理
    const dataLines = lines.slice(1);
    let addedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i];
      const values = line.split(",").map((v) => v.trim());

      const externalProductId = values[externalProductIdIndex];
      const name = nameIndex !== -1 ? values[nameIndex] : null;

      if (!externalProductId) {
        failedCount++;
        errors.push(`Row ${i + 2}: external_product_id is missing`);
        continue;
      }

      try {
        // 既存商品を検索
        const { data: existingProduct, error: checkError } = await supabaseAdmin
          .from("products")
          .select("id")
          .eq("shop_id", shopId)
          .eq("external_product_id", externalProductId)
          .maybeSingle();

        if (checkError) {
          failedCount++;
          errors.push(`Row ${i + 2}: ${checkError.message}`);
          continue;
        }

        if (existingProduct) {
          // 既に存在する場合はスキップ
          skippedCount++;
          continue;
        }

        // 新規商品を追加
        const { error: insertError } = await supabaseAdmin
          .from("products")
          .insert({
            shop_id: shopId,
            external_product_id: externalProductId,
            name: name || externalProductId,
          });

        if (insertError) {
          failedCount++;
          errors.push(`Row ${i + 2}: ${insertError.message}`);
          continue;
        }

        addedCount++;
      } catch (err: any) {
        failedCount++;
        errors.push(`Row ${i + 2}: ${err.message || "Unknown error"}`);
      }
    }

    console.log("[import-csv API] Import completed:", {
      addedCount,
      skippedCount,
      failedCount,
    });

    return NextResponse.json({
      success: true,
      addedCount,
      skippedCount,
      failedCount,
      errors: errors.length > 0 ? errors.slice(0, 10) : [], // 最大10件のエラーを返す
    });
  } catch (error: any) {
    console.error("[import-csv API] Unexpected error:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
