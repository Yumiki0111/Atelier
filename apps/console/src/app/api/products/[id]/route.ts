import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth/middleware";
import { updateProductSchema } from "@atelier/shared";
import { ZodError } from "zod";

// GET /api/products/:id - Get product by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const { data, error } = await supabaseAdmin
      .from("products")
      .select("*")
      .eq("id", id)
      .eq("shop_id", auth.shopId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Product not found" },
          { status: 404 }
        );
      }
      console.error("Error fetching product:", error);
      return NextResponse.json(
        { error: "Failed to fetch product" },
        { status: 500 }
      );
    }

    const product = {
      id: data.id,
      shopId: data.shop_id,
      externalProductId: data.external_product_id,
      name: data.name,
      brand: data.brand,
      category: data.category,
      thumbnailUrl: data.thumbnail_url,
      description: data.description,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return NextResponse.json(product);
  } catch (error) {
    console.error("Error in GET /api/products/:id:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/products/:id - Update product
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await request.json();
    
    console.log("[PATCH /api/products/:id] Received body:", JSON.stringify(body, null, 2));
    
    // shopIdは更新対象外なので除外
    const { shopId, ...bodyWithoutShopId } = body;
    
    console.log("[PATCH /api/products/:id] Body without shopId:", JSON.stringify(bodyWithoutShopId, null, 2));
    
    let validated;
    try {
      validated = updateProductSchema.parse(bodyWithoutShopId);
      console.log("[PATCH /api/products/:id] Validation passed:", JSON.stringify(validated, null, 2));
    } catch (validationError) {
      console.error("[PATCH /api/products/:id] Validation error:", validationError);
      throw validationError;
    }

    const updateData: Record<string, unknown> = {};
    if (validated.name !== undefined) updateData.name = validated.name;
    if (validated.externalProductId !== undefined) updateData.external_product_id = validated.externalProductId || null;
    if (validated.brand !== undefined) updateData.brand = validated.brand || null;
    if (validated.category !== undefined) updateData.category = validated.category || null;
    if (validated.thumbnailUrl !== undefined) {
      // 空文字列の場合はnullに変換
      updateData.thumbnail_url = validated.thumbnailUrl === "" ? null : validated.thumbnailUrl;
    }
    if (validated.description !== undefined) updateData.description = validated.description || null;

    updateData.updated_at = new Date().toISOString();

    console.log("[PATCH /api/products/:id] Update data:", JSON.stringify(updateData, null, 2));
    console.log("[PATCH /api/products/:id] Product ID:", id);
    console.log("[PATCH /api/products/:id] Shop ID:", auth.shopId);

    const { data, error } = await supabaseAdmin
      .from("products")
      .update(updateData)
      .eq("id", id)
      .eq("shop_id", auth.shopId)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Product not found", message: "商品が見つかりませんでした" },
          { status: 404 }
        );
      }
      console.error("[PATCH /api/products/:id] Database error:", error);
      console.error("[PATCH /api/products/:id] Error code:", error.code);
      console.error("[PATCH /api/products/:id] Error message:", error.message);
      console.error("[PATCH /api/products/:id] Error hint:", error.hint);
      console.error("[PATCH /api/products/:id] Error details:", error.details);
      
      // カラムが存在しない場合のエラーを検出
      if (error.message?.includes("column") && error.message?.includes("does not exist")) {
        return NextResponse.json(
          { 
            error: "Database schema error",
            message: "データベースのスキーマが最新ではありません。マイグレーションを実行してください。",
            details: error.message,
            hint: "descriptionカラムが存在しない可能性があります。マイグレーションファイルを確認してください。"
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { 
          error: "Failed to update product",
          message: error.message || "商品の更新に失敗しました",
          details: error.code,
          hint: error.hint,
          fullError: process.env.NODE_ENV === "development" ? JSON.stringify(error, null, 2) : undefined
        },
        { status: 500 }
      );
    }

    const product = {
      id: data.id,
      shopId: data.shop_id,
      externalProductId: data.external_product_id,
      name: data.name,
      brand: data.brand,
      category: data.category,
      thumbnailUrl: data.thumbnail_url,
      description: data.description,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return NextResponse.json(product);
  } catch (error) {
    if (error instanceof ZodError) {
      const issues = error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
        code: issue.code,
      }));
      console.error("[PATCH /api/products/:id] ZodError validation failed:", JSON.stringify(issues, null, 2));
      return NextResponse.json(
        { 
          error: "Invalid request body", 
          details: issues,
          message: "リクエストデータの検証に失敗しました"
        },
        { status: 400 }
      );
    }

    console.error("[PATCH /api/products/:id] Unexpected error:", error);
    console.error("[PATCH /api/products/:id] Error stack:", error instanceof Error ? error.stack : "No stack trace");
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: errorMessage,
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// DELETE /api/products/:id - Delete product
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const { error } = await supabaseAdmin
      .from("products")
      .delete()
      .eq("id", id)
      .eq("shop_id", auth.shopId);

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Product not found" },
          { status: 404 }
        );
      }
      console.error("Error deleting product:", error);
      return NextResponse.json(
        {
          error: "Failed to delete product",
          message: error.message,
          details: error.code,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error in DELETE /api/products/:id:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
