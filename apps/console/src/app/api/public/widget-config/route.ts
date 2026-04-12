import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { setCorsHeaders, handleCorsOptions, validatePublicKeyAndDomain } from "@/lib/api/cors";
import { isGarmentSpecRenderable } from "@/lib/widget-fit/applyWidgetSizeToGarment";
import type { CustomGarmentData } from "@/app/(main)/development/fitting/lib/types";
import { resolveWidgetFitSizeKeysOrder } from "@/lib/widget/resolveWidgetFitSizeKeysOrder";
import { formatPriceYenForDisplay, normalizeWidgetCtaAccentColor } from "@Atelier/shared";

/**
 * Widget Config 公開API
 * 
 * pubkey + external_product_id から最新の3DモデルURLを返す
 * 
 * クエリパラメータ:
 * - publicKey: widget_keys.public_key（必須）
 * - externalProductId: products.external_product_id（必須）
 * 
 * レスポンス:
 * - { enabled: true, asset: { defaultSize: "M", sizes: { "S": { glbUrl: "..." }, "M": { glbUrl: "..." }, "L": { glbUrl: "..." } } } } または { enabled: false }
 */

// OPTIONS リクエスト（プリフライト）を処理
export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const publicKey = searchParams.get("publicKey");
    const externalProductId = searchParams.get("externalProductId");

    if (!publicKey || !externalProductId) {
      const response = NextResponse.json(
        { enabled: false, error: "publicKey and externalProductId are required" },
        { status: 400 }
      );
      return setCorsHeaders(response, request);
    }

    // publicKey + ドメイン検証
    const validation = await validatePublicKeyAndDomain(request, publicKey);
    if (!validation.success) {
      return validation.response;
    }
    const shopId = validation.shopId;

    if (!supabaseAdmin) {
      const response = NextResponse.json({ enabled: false }, { status: 500 });
      return setCorsHeaders(response, request);
    }

    // products を (shop_id, external_product_id) で検索（garment_spec は 2D 試着用）
    const { data: product, error: productError } = await supabaseAdmin
      .from("products")
      .select("id, name, category, thumbnail_url, garment_spec, price_yen")
      .eq("shop_id", shopId)
      .eq("external_product_id", externalProductId)
      .single();

    if (productError || !product) {
      const response = NextResponse.json({ 
        enabled: false,
        error: `商品が見つかりません。external_product_id: "${externalProductId}" が正しく登録されているか確認してください。`
      });
      return setCorsHeaders(response, request);
    }

    // assets を (shop_id, product_id) で取得（is_active: true のみ）
    // 並びは GET /api/assets と同様（version で最新を優先）。created_at は環境によって列が無く PostgREST が失敗することがあるため使わない
    const { data: allAssets, error: assetsError } = await supabaseAdmin
      .from("assets")
      .select("size, glb_url, model_url, version, is_active, product_id")
      .eq("shop_id", shopId)
      .eq("product_id", product.id)
      .eq("is_active", true)
      .order("size", { ascending: true })
      .order("version", { ascending: false });

    const category = product.category || undefined;

    if (assetsError) {
      console.error("[widget-config API] Error fetching assets:", assetsError);
    }

    const assetsWithCategory = (assetsError ? [] : allAssets ?? []).map((asset) => ({
      ...asset,
      category,
    }));

    const garmentFitAvailable = isGarmentSpecRenderable(product.garment_spec);

    if (
      (!assetsWithCategory || assetsWithCategory.length === 0) &&
      !garmentFitAvailable
    ) {
      const response = NextResponse.json({
        enabled: false,
        error: "No assets or garment data for this product",
      });
      return setCorsHeaders(response, request);
    }

    // サイズごと、カテゴリーごとに最新バージョンのアセットを取得（GLB がある場合）
    const assetsBySizeAndCategory = new Map<string, Map<string, { glbUrl?: string; modelUrl?: string; version: number; isActive: boolean; category?: string }>>();
    
    for (const asset of assetsWithCategory) {
      const size = asset.size;
      const categoryKey = asset.category || "default";
      
      if (!assetsBySizeAndCategory.has(size)) {
        assetsBySizeAndCategory.set(size, new Map());
      }
      const categoryMap = assetsBySizeAndCategory.get(size)!;
      
      const existing = categoryMap.get(categoryKey);
      
      // is_active: true のアセットのみを処理（既にフィルタ済みだが念のため）
      if (asset.is_active !== false) {
        // model_urlまたはglb_urlが存在するアセットのみを処理
        const modelUrl = asset.model_url || asset.glb_url;
        if (modelUrl) {
          if (
            !existing ||
            asset.version > existing.version
          ) {
            categoryMap.set(categoryKey, {
              glbUrl: asset.glb_url || undefined,
              modelUrl: asset.model_url || undefined,
              version: asset.version,
              isActive: true,
              category,
            });
          }
        }
      }
    }

    // サイズごとのアセットリストを構築（GLB がある場合）。無い場合は garment_spec のプリセットから
    let sizes: Record<string, { glbUrl?: string; modelUrl?: string; category?: string }[]> = {};
    let defaultSize: string | undefined;

    if (assetsBySizeAndCategory.size > 0) {
      for (const [size, categoryMap] of assetsBySizeAndCategory.entries()) {
        const assets: { glbUrl?: string; modelUrl?: string; category?: string }[] = [];
        for (const [, asset] of categoryMap.entries()) {
          const modelUrl = asset.modelUrl || asset.glbUrl;
          if (modelUrl) {
            assets.push({
              glbUrl: asset.glbUrl || undefined,
              modelUrl: asset.modelUrl || undefined,
              category: asset.category,
            });
          }
        }
        if (assets.length > 0) {
          sizes[size] = assets;
        }

        if (!defaultSize || size === "M") {
          defaultSize = size;
        }
      }

      if (!defaultSize) {
        defaultSize = Array.from(assetsBySizeAndCategory.keys())[0] || undefined;
      }
    } else if (garmentFitAvailable) {
      const gs = product.garment_spec as CustomGarmentData;
      const presets = gs.genericSymmetricTop?.sizePresets ?? [];
      if (presets.length > 0) {
        for (const p of presets) {
          sizes[p.label] = [{ category }];
        }
        defaultSize = presets[0].label;
      } else {
        sizes.default = [{ category }];
        defaultSize = "default";
      }
    }

    /** `Object.keys` の順が UI の並びになるため、プレビューと同じ着丈→袖丈順に組み替え（プリセットのみキーもマージ） */
    if (garmentFitAvailable) {
      const ordered = resolveWidgetFitSizeKeysOrder(Object.keys(sizes), product.garment_spec);
      const gs = product.garment_spec as CustomGarmentData;
      const presetLabels = new Set(
        (gs.genericSymmetricTop?.sizePresets ?? [])
          .map((p) => String(p.label).trim())
          .filter(Boolean)
      );
      const next: Record<string, { glbUrl?: string; modelUrl?: string; category?: string }[]> = {};
      for (const k of ordered) {
        const existing = sizes[k];
        if (existing != null && existing.length > 0) {
          next[k] = existing;
        } else if (presetLabels.has(k)) {
          next[k] = [{ category }];
        }
      }
      sizes = next;
      if (ordered.includes("M")) defaultSize = "M";
      else if (ordered[0]) defaultSize = ordered[0];
    }

    // ウィジェットデザイン設定を取得
    const { data: designData } = await supabaseAdmin
      .from("widget_designs")
      .select("*")
      .eq("shop_id", shopId)
      .maybeSingle();

    const design = designData
      ? {
          backgroundImage: designData.background_image || undefined,
          backgroundColor: designData.background_color || undefined,
          theme: designData.theme || "light",
          button: {
            color: designData.button_color || "#ffffff",
            text: designData.button_text || "", // デフォルト値は空文字列（設定されていない場合は表示しない）
            shape: designData.button_shape === "circle" ? "circle" : "pill",
            imageUrl: designData.button_image_url || undefined,
          },
          interfaceBackgroundColor: designData.interface_background_color ?? "#fafafa",
          canvasBackgroundColor: designData.canvas_background_color ?? "#fafafa",
          ctaCartLabel: designData.cta_cart_label ?? "カートに追加",
          ctaTryOnLabel: designData.cta_try_on_label ?? "この体型で試着する",
          ctaAccentColor: normalizeWidgetCtaAccentColor(designData.cta_accent_color),
          launcherPlacement:
            designData.launcher_placement === "floating" ? "floating" : "inline",
        }
      : undefined;

    const responseData = {
      enabled: true,
      shopId,
      asset: {
        defaultSize,
        sizes,
        productName: product.name,
        thumbnailUrl: product.thumbnail_url || undefined,
        priceDisplay: formatPriceYenForDisplay(product.price_yen as number | null | undefined),
        /** 開発で登録した SVG 試着を API `/api/public/widget-fit-svg` で再現可能 */
        garmentFitAvailable,
      },
      design,
    };

    // デバッグログ（本番環境では削除推奨）
    console.log("[widget-config API] Response:", JSON.stringify({
      productId: product.id,
      externalProductId,
      defaultSize,
      sizesKeys: Object.keys(sizes),
      sizesCount: Object.values(sizes).reduce((sum, arr) => sum + arr.length, 0),
      sizes: Object.fromEntries(
        Object.entries(sizes).map(([size, assets]) => [
          size,
          assets.map(a => ({ hasModelUrl: !!a.modelUrl, hasGlbUrl: !!a.glbUrl, category: a.category }))
        ])
      ),
    }, null, 2));

    const response = NextResponse.json(responseData);
    return setCorsHeaders(response, request);
  } catch (error) {
    console.error("[widget-config API] Unexpected error:", error);
    const response = NextResponse.json({ enabled: false }, { status: 500 });
    return setCorsHeaders(response, request);
  }
}
