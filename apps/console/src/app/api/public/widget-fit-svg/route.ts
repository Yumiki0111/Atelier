import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { setCorsHeaders, handleCorsOptions, validatePublicKeyAndDomain } from "@/lib/api/cors";
import {
  applyWidgetSizeToCustomGarmentData,
  isGarmentSpecRenderable,
} from "@/lib/widget-fit/applyWidgetSizeToGarment";
import { validateGarmentSpecForProduction } from "@/lib/products/validateGarmentSpecForProduction";
import { resolveWidgetFitSizeKeysOrder } from "@/lib/widget/resolveWidgetFitSizeKeysOrder";
import { normalizeWidgetFitSizeQuery } from "@/lib/widget-fit/widgetFitGradingSize";
import { computeWidgetFitSnapshot } from "@/lib/widget-fit/computeWidgetFitSnapshot";
import type { CustomGarmentData } from "@/app/(main)/development/fitting/lib/types";

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

/**
 * 公開API: 登録済み garment_spec と開発と同じ計算で SVG 用パスを返す（寸法・プロットなし）。
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const publicKey = searchParams.get("publicKey");
    const externalProductId = searchParams.get("externalProductId");
    const sizeParam = searchParams.get("size") || "default";
    const heightCm = Math.min(195, Math.max(150, parseInt(searchParams.get("heightCm") || "170", 10) || 170));
    const weightKg = Math.min(120, Math.max(35, parseFloat(searchParams.get("weightKg") || "60") || 60));

    if (!publicKey || !externalProductId) {
      const response = NextResponse.json(
        { error: "publicKey and externalProductId are required" },
        { status: 400 }
      );
      return setCorsHeaders(response, request);
    }

    const validation = await validatePublicKeyAndDomain(request, publicKey);
    if (!validation.success) {
      return validation.response;
    }
    const shopId = validation.shopId;

    if (!supabaseAdmin) {
      const response = NextResponse.json({ error: "Database not configured" }, { status: 500 });
      return setCorsHeaders(response, request);
    }

    const { data: product, error: productError } = await supabaseAdmin
      .from("products")
      .select("id, garment_spec, category")
      .eq("shop_id", shopId)
      .eq("external_product_id", externalProductId)
      .single();

    if (productError || !product) {
      const response = NextResponse.json({ error: "Product not found" }, { status: 404 });
      return setCorsHeaders(response, request);
    }

    const raw = product.garment_spec;
    if (!isGarmentSpecRenderable(raw)) {
      let message = "garment_spec がないか、2D 試着に使えません。";
      if (raw != null && typeof raw === "object" && !Array.isArray(raw)) {
        const p = raw as { pathDs?: unknown };
        if (Array.isArray(p.pathDs) && p.pathDs.length > 0) {
          const v = validateGarmentSpecForProduction(raw);
          if (!v.ok) message = v.message;
        }
      }
      const response = NextResponse.json(
        { error: "invalid_garment_spec", message },
        { status: 400 }
      );
      return setCorsHeaders(response, request);
    }

    const base = raw as CustomGarmentData;
    const resolvedSize = normalizeWidgetFitSizeQuery(sizeParam, base);
    const sized = applyWidgetSizeToCustomGarmentData(base, resolvedSize);

    let catalogOrder = resolveWidgetFitSizeKeysOrder([], base);
    const productId = (product as { id: string }).id;
    const { data: assetRows } = await supabaseAdmin
      .from("assets")
      .select("size")
      .eq("product_id", productId)
      .eq("shop_id", shopId);
    if (assetRows != null && assetRows.length > 0) {
      const fromAssets = [
        ...new Set(assetRows.map((r) => String((r as { size?: unknown }).size ?? "").trim()).filter(Boolean)),
      ];
      catalogOrder = resolveWidgetFitSizeKeysOrder(fromAssets, base);
    }

    const snap = await computeWidgetFitSnapshot({
      customGarmentData: sized,
      heightCm,
      weightKg,
      fitChestBandCategory: (product as { category?: string | null }).category ?? null,
      currentSizeLabel: resolvedSize,
      orderedSizeKeysFromCatalog: catalogOrder,
    });

    const response = NextResponse.json({
      viewBoxMinX: snap.viewBoxMinX,
      viewBoxWidth: snap.viewBoxWidth,
      viewBoxHeight: snap.viewBoxHeight,
      bodyPaths: snap.bodyPaths,
      garmentPathsBehindBody: snap.garmentPathsBehindBody,
      garmentBehindBodyPathStrokeDasharrays: snap.garmentBehindBodyPathStrokeDasharrays,
      garmentBehindBodyPathStrokeWidths: snap.garmentBehindBodyPathStrokeWidths,
      garmentBehindBodyPathStrokes: snap.garmentBehindBodyPathStrokes,
      garmentBehindBodyPathFills: snap.garmentBehindBodyPathFills,
      garmentPaths: snap.garmentPaths,
      garmentPathStrokeDasharrays: snap.garmentPathStrokeDasharrays,
      garmentPathStrokeWidths: snap.garmentPathStrokeWidths,
      garmentPathStrokes: snap.garmentPathStrokes,
      garmentPathFills: snap.garmentPathFills,
      presetId: base.presetId,
      fitEaseSummary: snap.fitEaseSummary,
      fitEaseDiagram: snap.fitEaseDiagram,
    });
    return setCorsHeaders(response, request);
  } catch (e) {
    console.error("[widget-fit-svg]", e);
    const response = NextResponse.json({ error: "Internal server error" }, { status: 500 });
    return setCorsHeaders(response, request);
  }
}
