import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth/middleware";
import { createAssetSchema } from "@atelier/shared";

// UUID形式をチェックする関数
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// GET /api/assets - List assets
export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      // データベースが設定されていない場合は空配列を返す（開発環境での動作を継続）
      return NextResponse.json([]);
    }

    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json(
        { error: "productId is required" },
        { status: 400 }
      );
    }

    // UUID形式のバリデーション
    if (!isValidUUID(productId)) {
      console.error("Invalid productId format:", productId);
      return NextResponse.json(
        { 
          error: "Invalid productId format. Expected UUID format.",
          details: `Received: ${productId}`
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("assets")
      .select("*")
      .eq("product_id", productId)
      .order("size", { ascending: true })
      .order("version", { ascending: false });

    if (error) {
      console.error("Error fetching assets:", error);
      // より詳細なエラーメッセージを返す
      return NextResponse.json(
        { 
          error: "Failed to fetch assets",
          details: error.message,
          code: error.code
        },
        { status: 500 }
      );
    }

    const assets = data?.map((a) => ({
      id: a.id,
      productId: a.product_id,
      size: a.size,
      glbUrl: a.glb_url, // 後方互換性のため残す
      modelUrl: a.model_url || a.glb_url, // model_urlを優先、なければglb_urlを使用
      thumbnailUrl: a.thumbnail_url,
      version: a.version,
      isActive: a.is_active ?? true,
      createdAt: a.created_at,
      updatedAt: a.updated_at,
    }));

    return NextResponse.json(assets || []);
  } catch (error) {
    console.error("Error in GET /api/assets:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/assets - Create asset
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
    const validated = createAssetSchema.parse(body);

    // Check if product exists and belongs to the user's shop
    const { data: product, error: productError } = await supabaseAdmin
      .from("products")
      .select("id, shop_id")
      .eq("id", validated.productId)
      .eq("shop_id", auth.shopId)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Get the latest version for this product and size
    const { data: existingAssets } = await supabaseAdmin
      .from("assets")
      .select("version")
      .eq("product_id", validated.productId)
      .eq("size", validated.size)
      .order("version", { ascending: false })
      .limit(1);

    const nextVersion =
      existingAssets && existingAssets.length > 0
        ? existingAssets[0].version + 1
        : 1;

    // modelUrlを優先、なければglbUrlを使用（後方互換性）
    const modelUrl = validated.modelUrl || validated.glbUrl;
    
    const { data, error } = await supabaseAdmin
      .from("assets")
      .insert({
        shop_id: product.shop_id, // shop_id を明示的に付与
        product_id: validated.productId,
        size: validated.size,
        glb_url: validated.glbUrl || null, // 後方互換性のため残す
        model_url: modelUrl || null, // model_urlを優先的に使用
        thumbnail_url: validated.thumbnailUrl || null,
        version: nextVersion,
        is_active: validated.isActive ?? true,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating asset:", error);
      return NextResponse.json(
        { error: "Failed to create asset" },
        { status: 500 }
      );
    }

    const asset = {
      id: data.id,
      productId: data.product_id,
      size: data.size,
      glbUrl: data.glb_url, // 後方互換性のため残す
      modelUrl: data.model_url || data.glb_url, // model_urlを優先、なければglb_urlを使用
      thumbnailUrl: data.thumbnail_url,
      version: data.version,
      isActive: data.is_active ?? true,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return NextResponse.json(asset, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid request body", details: error },
        { status: 400 }
      );
    }

    console.error("Error in POST /api/assets:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
