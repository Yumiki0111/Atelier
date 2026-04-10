import { supabaseAdmin } from "@/lib/supabase/server";
import { isGarmentSpecRenderable } from "@/lib/widget-fit/applyWidgetSizeToGarment";
import type { CustomGarmentData } from "@/app/(main)/development/fitting/lib/types";
import { resolveWidgetFitSizeKeysOrder } from "@/lib/widget/resolveWidgetFitSizeKeysOrder";

export type PublicEmbedWidgetFitProps = {
  productId: string;
  productName: string;
  thumbnailUrl: string | null;
  priceDisplay: string;
  sizeKeys: string[];
  initialSize: string;
  garmentFitAvailable: boolean;
  customGarmentData: CustomGarmentData | null;
  interfaceBackgroundColor?: string;
  canvasBackgroundColor?: string;
  ctaCartLabel?: string;
  ctaTryOnLabel?: string;
  ctaAccentColor?: string;
};

/**
 * `/embed/widget-fit` 用。Referer 検証なし（サーバー専用・公開キーは URL に含まれる）。
 * 2D 試着可能な商品のみデータを返す。
 */
export async function getPublicEmbedWidgetFitProps(
  publicKey: string,
  externalProductId: string
): Promise<PublicEmbedWidgetFitProps | null> {
  if (!supabaseAdmin || !publicKey || !externalProductId) return null;

  const { data: widgetKey, error: keyError } = await supabaseAdmin
    .from("widget_keys")
    .select("shop_id")
    .eq("public_key", publicKey)
    .eq("enabled", true)
    .single();

  if (keyError || !widgetKey) return null;

  const shopId = widgetKey.shop_id;

  const { data: product, error: productError } = await supabaseAdmin
    .from("products")
    .select("id, name, category, thumbnail_url, garment_spec")
    .eq("shop_id", shopId)
    .eq("external_product_id", externalProductId)
    .single();

  if (productError || !product) return null;

  const category = product.category || undefined;
  const garmentFitAvailable = isGarmentSpecRenderable(product.garment_spec);
  if (!garmentFitAvailable) return null;

  const { data: allAssets, error: assetsError } = await supabaseAdmin
    .from("assets")
    .select("size, glb_url, model_url, version, is_active, product_id")
    .eq("shop_id", shopId)
    .eq("product_id", product.id)
    .eq("is_active", true)
    .order("size", { ascending: true })
    .order("version", { ascending: false });

  const assetsWithCategory = (assetsError ? [] : allAssets ?? []).map((asset) => ({
    ...asset,
    category,
  }));

  const assetsBySizeAndCategory = new Map<
    string,
    Map<string, { glbUrl?: string; modelUrl?: string; version: number; isActive: boolean; category?: string }>
  >();

  for (const asset of assetsWithCategory) {
    const size = asset.size;
    const categoryKey = asset.category || "default";
    if (!assetsBySizeAndCategory.has(size)) {
      assetsBySizeAndCategory.set(size, new Map());
    }
    const categoryMap = assetsBySizeAndCategory.get(size)!;
    const existing = categoryMap.get(categoryKey);
    if (asset.is_active !== false) {
      const modelUrl = asset.model_url || asset.glb_url;
      if (modelUrl) {
        if (!existing || asset.version > existing.version) {
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

  const assetKeys = Array.from(assetsBySizeAndCategory.keys());
  const sizeKeys = resolveWidgetFitSizeKeysOrder(assetKeys, product.garment_spec);
  const defaultSize =
    sizeKeys.includes("M") ? "M" : sizeKeys.length > 0 ? sizeKeys[0] : undefined;

  const initialSize = defaultSize && sizeKeys.includes(defaultSize) ? defaultSize : sizeKeys[0] ?? "M";

  const { data: designData } = await supabaseAdmin
    .from("widget_designs")
    .select("*")
    .eq("shop_id", shopId)
    .maybeSingle();

  const design = designData
    ? {
        interfaceBackgroundColor: designData.interface_background_color ?? "#fafafa",
        canvasBackgroundColor: designData.canvas_background_color ?? "#fafafa",
        ctaCartLabel: designData.cta_cart_label ?? "カートに追加",
        ctaTryOnLabel: designData.cta_try_on_label ?? "この体型で試着する",
        ctaAccentColor: designData.cta_accent_color ?? "#3d3835",
      }
    : undefined;

  return {
    productId: product.id,
    productName: product.name,
    thumbnailUrl: product.thumbnail_url ?? null,
    priceDisplay: "—",
    sizeKeys,
    initialSize,
    garmentFitAvailable: true,
    customGarmentData: product.garment_spec as CustomGarmentData,
    interfaceBackgroundColor: design?.interfaceBackgroundColor,
    canvasBackgroundColor: design?.canvasBackgroundColor,
    ctaCartLabel: design?.ctaCartLabel,
    ctaTryOnLabel: design?.ctaTryOnLabel,
    ctaAccentColor: design?.ctaAccentColor,
  };
}
