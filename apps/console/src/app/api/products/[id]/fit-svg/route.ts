import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth/middleware";
import {
  applyWidgetSizeToCustomGarmentData,
  isGarmentSpecRenderable,
} from "@/lib/widget-fit/applyWidgetSizeToGarment";
import { validateGarmentSpecForProduction } from "@/lib/products/validateGarmentSpecForProduction";
import { computeWidgetFitSnapshot } from "@/lib/widget-fit/computeWidgetFitSnapshot";
import type { CustomGarmentData } from "@/app/(main)/development/fitting/lib/types";

const VIEWBOX_W = 1505;

/**
 * 認証済みコンソール用: 自店舗商品の garment_spec を開発と同じ計算で SVG 用パスに変換する。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: productId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const size = searchParams.get("size") || "default";
    const heightCm = Math.min(195, Math.max(150, parseInt(searchParams.get("heightCm") || "170", 10) || 170));
    const weightKg = Math.min(120, Math.max(35, parseFloat(searchParams.get("weightKg") || "60") || 60));

    const { data: product, error } = await supabaseAdmin
      .from("products")
      .select("garment_spec, category")
      .eq("id", productId)
      .eq("shop_id", auth.shopId)
      .single();

    if (error || !product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
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
      return NextResponse.json({ error: "invalid_garment_spec", message }, { status: 400 });
    }

    const base = raw as CustomGarmentData;
    const sized = applyWidgetSizeToCustomGarmentData(base, size);

    let snap;
    try {
      snap = await computeWidgetFitSnapshot({
        customGarmentData: sized,
        heightCm,
        weightKg,
        fitChestBandCategory: (product as { category?: string | null }).category ?? null,
        currentSizeLabel: size,
      });
    } catch (computeErr) {
      const msg = computeErr instanceof Error ? computeErr.message : String(computeErr);
      console.error("[products/[id]/fit-svg] compute failed:", computeErr);
      return NextResponse.json(
        { error: "compute_failed", message: msg },
        { status: 500 }
      );
    }

    return NextResponse.json({
      viewBoxWidth: VIEWBOX_W,
      viewBoxHeight: snap.viewBoxHeight,
      bodyPaths: snap.bodyPaths,
      garmentPaths: snap.garmentPaths,
      garmentPathStrokeDasharrays: snap.garmentPathStrokeDasharrays,
      garmentPathStrokeWidths: snap.garmentPathStrokeWidths,
      garmentPathStrokes: snap.garmentPathStrokes,
      fitEaseSummary: snap.fitEaseSummary,
      fitEaseDiagram: snap.fitEaseDiagram,
    });
  } catch (e) {
    console.error("[products/[id]/fit-svg]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
