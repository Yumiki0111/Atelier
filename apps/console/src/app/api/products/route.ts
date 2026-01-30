import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth/middleware";
import {
  createProductSchema,
  updateProductSchema,
} from "@atelier/shared";

// GET /api/products - List products
export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      console.error("Supabase client not initialized. Check environment variables.");
      return NextResponse.json(
        {
          error: "Database not configured",
          message: "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set",
        },
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

    const searchParams = request.nextUrl.searchParams;
    const shopId = searchParams.get("shopId") || auth.shopId;

    let query = supabaseAdmin.from("products").select("*");

    if (shopId) {
      query = query.eq("shop_id", shopId);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching products:", error);
      return NextResponse.json(
        {
          error: "Failed to fetch products",
          message: error.message,
          details: error.code,
        },
        { status: 500 }
      );
    }

    // Transform database format to API format
    const products = data?.map((p) => ({
      id: p.id,
      shopId: p.shop_id,
      externalProductId: p.external_product_id,
      name: p.name,
      brand: p.brand,
      category: p.category,
      thumbnailUrl: p.thumbnail_url,
      description: p.description,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));

    return NextResponse.json(products || []);
  } catch (error) {
    console.error("Error in GET /api/products:", error);
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

// POST /api/products - Create product
export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        {
          error: "Database not configured",
          message: "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set",
        },
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
    const validated = createProductSchema.parse(body);
    
    // shopIdを認証情報から取得（リクエストのshopIdは無視）
    validated.shopId = auth.shopId;

    const { data, error } = await supabaseAdmin
      .from("products")
      .insert({
        shop_id: validated.shopId,
        external_product_id: validated.externalProductId || null,
        name: validated.name,
        brand: validated.brand || null,
        category: validated.category || null,
        thumbnail_url: validated.thumbnailUrl || null,
        description: validated.description || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating product:", error);
      return NextResponse.json(
        {
          error: "Failed to create product",
          message: error.message,
          details: error.code,
          hint: error.hint,
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
      sku: data.sku,
      handle: data.handle,
      url: data.url,
      sizeTypeId: data.size_type_id,
      thumbnailUrl: data.thumbnail_url,
      previewImageUrl: data.preview_image_url,
      description: data.description,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid request body", details: error },
        { status: 400 }
      );
    }

    console.error("Error in POST /api/products:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
