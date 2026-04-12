import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth/middleware";
import { updateProductSchema } from "@Atelier/shared";
import { ZodError } from "zod";
import { stripGarmentSpecForStorage } from "@/lib/products/stripGarmentSpecForStorage";
import { validateGarmentSpecForProduction } from "@/lib/products/validateGarmentSpecForProduction";
import {
  isPostgrestSchemaCacheError,
  POSTGREST_SCHEMA_DRIFT_MESSAGE_JA,
} from "@/lib/supabase/postgrestSchemaErrors";

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
      priceYen: data.price_yen ?? undefined,
      thumbnailUrl: data.thumbnail_url,
      garmentSpec: data.garment_spec ?? undefined,
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
    
    // shopIdは更新対象外なので除外
    const { shopId: _stripShopId, ...bodyWithoutShopId } = body;
    void _stripShopId;

    const validated = updateProductSchema.parse(bodyWithoutShopId);

    const updateData: Record<string, unknown> = {};
    if (validated.name !== undefined) updateData.name = validated.name;
    if (validated.externalProductId !== undefined) updateData.external_product_id = validated.externalProductId || null;
    if (validated.brand !== undefined) updateData.brand = validated.brand || null;
    if (validated.category !== undefined) updateData.category = validated.category || null;
    if (validated.priceYen !== undefined) {
      updateData.price_yen = validated.priceYen;
    }
    if (validated.thumbnailUrl !== undefined) {
      // 空文字列の場合はnullに変換
      updateData.thumbnail_url = validated.thumbnailUrl === "" ? null : validated.thumbnailUrl;
    }
    if (validated.garmentSpec !== undefined) {
      const garmentSpecStored = stripGarmentSpecForStorage(validated.garmentSpec);
      if (garmentSpecStored != null) {
        const v = validateGarmentSpecForProduction(garmentSpecStored);
        if (!v.ok) {
          return NextResponse.json(
            { error: "Invalid garment_spec", message: v.message },
            { status: 400 }
          );
        }
      }
      updateData.garment_spec = garmentSpecStored;
    }

    updateData.updated_at = new Date().toISOString();

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
      console.error("[PATCH /api/products/:id] Database error:", error.message, error.code);
      
      // カラム未適用（マイグレーション未実行）や schema cache 不整合
      if (isPostgrestSchemaCacheError(error.message)) {
        return NextResponse.json(
          {
            error: "Database schema error",
            message: POSTGREST_SCHEMA_DRIFT_MESSAGE_JA,
            details: error.message,
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { 
          error: "Failed to update product",
          message: error.message || "商品の更新に失敗しました",
          details: process.env.NODE_ENV === "development" ? error.code : undefined,
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
      priceYen: data.price_yen ?? undefined,
      thumbnailUrl: data.thumbnail_url,
      garmentSpec: data.garment_spec ?? undefined,
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
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: process.env.NODE_ENV === "development" ? errorMessage : "商品の更新に失敗しました",
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
