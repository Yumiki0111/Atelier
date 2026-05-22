import type { CustomGarmentData } from "@/app/(main)/development/fitting/lib/types";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isGarmentSpecRenderable } from "@/lib/widget-fit/applyWidgetSizeToGarment";
import { prepareFlatCmGarmentForWidgetSize } from "@/lib/widget-fit/garmentFlatCmFitPipeline";
import { parseStoredGarmentSpec } from "@/lib/widget-fit/parseStoredGarmentSpec";
import { resolveWidgetFitSizeKeysOrder } from "@/lib/widget/resolveWidgetFitSizeKeysOrder";
import { resolveWidgetFitInitialSize } from "@/lib/widget-fit/widgetFitFlatCmSize";
import { formatPriceYenForDisplay, normalizeWidgetCtaAccentColor } from "@Atelier/shared";

export type PublicEmbedWidgetFitProps = {
  /** `events.shop_id` 用（埋め込みからのアナリティクス送信） */
  shopId: string;
  productId: string;
  /** `products.category`（試着の胸ゆとりしきい値に使用） */
  productCategory?: string | null;
  /** カート URL テンプレ `{{productId}}` 用（店舗の外部商品 ID） */
  externalProductId: string;
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
    .select("id, name, category, thumbnail_url, garment_spec, external_product_id, price_yen")
    .eq("shop_id", shopId)
    .eq("external_product_id", externalProductId)
    .single();

  if (productError || !product) return null;

  const category = product.category || undefined;
  const garmentFitAvailable = isGarmentSpecRenderable(product.garment_spec);
  if (!garmentFitAvailable) return null;

  const parsedSpec = parseStoredGarmentSpec(product.garment_spec);
  if (!parsedSpec) return null;

  const sizeKeys = resolveWidgetFitSizeKeysOrder([], parsedSpec);
  const initialSize = resolveWidgetFitInitialSize(
    sizeKeys.includes("M") ? "M" : undefined,
    parsedSpec,
    sizeKeys
  );
  const customGarmentData = prepareFlatCmGarmentForWidgetSize(parsedSpec, initialSize);

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
        ctaAccentColor: normalizeWidgetCtaAccentColor(designData.cta_accent_color),
      }
    : undefined;

  return {
    shopId,
    productId: product.id,
    productCategory: category ?? null,
    externalProductId: (product.external_product_id as string | null) ?? externalProductId,
    productName: product.name,
    thumbnailUrl: product.thumbnail_url ?? null,
    priceDisplay: formatPriceYenForDisplay(product.price_yen as number | null | undefined),
    sizeKeys,
    initialSize,
    garmentFitAvailable: true,
    customGarmentData,
    interfaceBackgroundColor: design?.interfaceBackgroundColor,
    canvasBackgroundColor: design?.canvasBackgroundColor,
    ctaCartLabel: design?.ctaCartLabel,
    ctaTryOnLabel: design?.ctaTryOnLabel,
    ctaAccentColor: design?.ctaAccentColor,
  };
}
