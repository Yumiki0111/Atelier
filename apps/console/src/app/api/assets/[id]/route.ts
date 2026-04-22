import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth/middleware";
import { updateAssetSchema } from "@Atelier/shared";
import { z } from "zod";
import { isValidUUID } from "@/lib/api/validation";

// GET /api/assets/:id - Get asset by ID
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

    if (!isValidUUID(id)) {
      return NextResponse.json(
        { error: "Invalid asset ID format. Expected UUID format." },
        { status: 400 }
      );
    }

    // まずアセットを取得
    const { data: assetData, error: assetError } = await supabaseAdmin
      .from("assets")
      .select("*")
      .eq("id", id)
      .single();

    if (assetError || !assetData) {
      if (assetError?.code === "PGRST116") {
        return NextResponse.json(
          { error: "Asset not found", message: "アセットが見つかりませんでした" },
          { status: 404 }
        );
      }
      console.error("Error fetching asset:", assetError);
      return NextResponse.json(
        { error: "Asset not found", message: "アセットが見つかりませんでした" },
        { status: 404 }
      );
    }

    // アセットのproduct_idを使って、productsテーブルからshop_idを確認
    const { data: product, error: productError } = await supabaseAdmin
      .from("products")
      .select("shop_id")
      .eq("id", assetData.product_id)
      .single();

    if (productError || !product) {
      console.error("Error fetching product:", productError);
      return NextResponse.json(
        { error: "Asset not found", message: "アセットが見つかりませんでした" },
        { status: 404 }
      );
    }

    // shop_idが一致するか確認
    if (product.shop_id !== auth.shopId) {
      return NextResponse.json(
        { error: "Asset not found", message: "アセットが見つかりませんでした" },
        { status: 404 }
      );
    }

    const asset = {
      id: assetData.id,
      productId: assetData.product_id,
      size: assetData.size,
      thumbnailUrl: assetData.thumbnail_url ?? undefined,
      version: assetData.version,
      isActive: assetData.is_active ?? true,
      createdAt: assetData.created_at,
      updatedAt: assetData.updated_at,
    };

    return NextResponse.json(asset);
  } catch (error) {
    console.error("Error in GET /api/assets/:id:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/assets/:id - Update asset
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

    if (!isValidUUID(id)) {
      return NextResponse.json(
        { error: "Invalid asset ID format. Expected UUID format." },
        { status: 400 }
      );
    }

    const body = await request.json();

    // バリデーション
    let validated;
    try {
      validated = updateAssetSchema.parse(body);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        const issues = validationError.issues?.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        }));
        return NextResponse.json(
          {
            error: "Invalid request body",
            details: issues,
            message: "リクエストデータの検証に失敗しました",
          },
          { status: 400 }
        );
      }
      throw validationError;
    }

    // まずアセットを取得
    const { data: existingAsset, error: fetchError } = await supabaseAdmin
      .from("assets")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !existingAsset) {
      if (fetchError?.code === "PGRST116") {
        return NextResponse.json(
          { error: "Asset not found", message: "アセットが見つかりませんでした" },
          { status: 404 }
        );
      }
      console.error("Error fetching asset:", fetchError);
      return NextResponse.json(
        { error: "Asset not found", message: "アセットが見つかりませんでした" },
        { status: 404 }
      );
    }

    // アセットのproduct_idを使って、productsテーブルからshop_idを確認
    const { data: product, error: productError } = await supabaseAdmin
      .from("products")
      .select("shop_id")
      .eq("id", existingAsset.product_id)
      .single();

    if (productError || !product) {
      console.error("Error fetching product:", productError);
      return NextResponse.json(
        { error: "Asset not found", message: "アセットが見つかりませんでした" },
        { status: 404 }
      );
    }

    // shop_idが一致するか確認
    if (product.shop_id !== auth.shopId) {
      return NextResponse.json(
        { error: "Asset not found", message: "アセットが見つかりませんでした" },
        { status: 404 }
      );
    }

    // 更新データを構築
    const updateData: Record<string, unknown> = {};
    if (validated.size !== undefined) updateData.size = validated.size;
    if (validated.thumbnailUrl !== undefined) {
      updateData.thumbnail_url = validated.thumbnailUrl === "" ? null : validated.thumbnailUrl;
    }
    if (validated.isActive !== undefined) updateData.is_active = validated.isActive;
    // versionは更新不可（新しいバージョンは新規作成で対応）
    // productIdは更新不可

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from("assets")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating asset:", error);
      return NextResponse.json(
        {
          error: "Failed to update asset",
          message: error.message || "アセットの更新に失敗しました",
          details: error.details || error.code,
        },
        { status: 500 }
      );
    }

    const asset = {
      id: data.id,
      productId: data.product_id,
      size: data.size,
      thumbnailUrl: data.thumbnail_url ?? undefined,
      version: data.version,
      isActive: data.is_active ?? true,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return NextResponse.json(asset);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues?.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      }));
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: issues,
          message: "リクエストデータの検証に失敗しました",
        },
        { status: 400 }
      );
    }

    console.error("Error in PATCH /api/assets/:id:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Internal server error",
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}

// DELETE /api/assets/:id - Delete asset
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

    if (!isValidUUID(id)) {
      return NextResponse.json(
        { error: "Invalid asset ID format. Expected UUID format." },
        { status: 400 }
      );
    }

    // まずアセットを取得
    const { data: existingAsset, error: fetchError } = await supabaseAdmin
      .from("assets")
      .select("id, product_id")
      .eq("id", id)
      .single();

    if (fetchError || !existingAsset) {
      if (fetchError?.code === "PGRST116") {
        return NextResponse.json(
          { error: "Asset not found", message: "アセットが見つかりませんでした" },
          { status: 404 }
        );
      }
      console.error("Error fetching asset:", fetchError);
      return NextResponse.json(
        { error: "Asset not found", message: "アセットが見つかりませんでした" },
        { status: 404 }
      );
    }

    // アセットのproduct_idを使って、productsテーブルからshop_idを確認
    const { data: product, error: productError } = await supabaseAdmin
      .from("products")
      .select("shop_id")
      .eq("id", existingAsset.product_id)
      .single();

    if (productError || !product) {
      console.error("Error fetching product:", productError);
      return NextResponse.json(
        { error: "Asset not found", message: "アセットが見つかりませんでした" },
        { status: 404 }
      );
    }

    // shop_idが一致するか確認
    if (product.shop_id !== auth.shopId) {
      return NextResponse.json(
        { error: "Asset not found", message: "アセットが見つかりませんでした" },
        { status: 404 }
      );
    }

    // アセットを削除
    const { error } = await supabaseAdmin
      .from("assets")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting asset:", error);
      return NextResponse.json(
        {
          error: "Failed to delete asset",
          message: error.message || "アセットの削除に失敗しました",
          details: error.details || error.code,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error in DELETE /api/assets/:id:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Internal server error",
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}
