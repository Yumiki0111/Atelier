import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth/middleware";
import { z } from "zod";

const bulkDeleteSchema = z.object({
  productIds: z.array(z.string().uuid()).min(1, "At least one product ID is required"),
});

/**
 * POST /api/products/bulk-delete - Delete multiple products
 * 
 * Request body:
 * {
 *   productIds: string[] // Array of product UUIDs
 * }
 */
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
    const validated = bulkDeleteSchema.parse(body);

    // 指定された商品IDが全て同じshop_idに属しているか確認
    const { data: products, error: checkError } = await supabaseAdmin
      .from("products")
      .select("id, shop_id")
      .in("id", validated.productIds);

    if (checkError) {
      console.error("Error checking products:", checkError);
      return NextResponse.json(
        {
          error: "Failed to check products",
          message: checkError.message,
        },
        { status: 500 }
      );
    }

    if (!products || products.length === 0) {
      return NextResponse.json(
        { error: "No products found" },
        { status: 404 }
      );
    }

    // 全ての商品が同じshop_idに属しているか確認
    const shopIds = new Set(products.map((p) => p.shop_id));
    if (shopIds.size > 1 || !shopIds.has(auth.shopId)) {
      return NextResponse.json(
        { error: "Unauthorized: Products belong to different shop or not your shop" },
        { status: 403 }
      );
    }

    // 一括削除を実行
    const { error: deleteError, count } = await supabaseAdmin
      .from("products")
      .delete()
      .in("id", validated.productIds)
      .eq("shop_id", auth.shopId);

    if (deleteError) {
      console.error("Error deleting products:", deleteError);
      return NextResponse.json(
        {
          error: "Failed to delete products",
          message: deleteError.message,
          details: deleteError.code,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deletedCount: count || products.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: error.issues,
        },
        { status: 400 }
      );
    }

    console.error("Error in POST /api/products/bulk-delete:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
