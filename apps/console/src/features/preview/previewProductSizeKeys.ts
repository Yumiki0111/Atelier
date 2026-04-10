import type { Product } from "@Atelier/shared";
import { resolveWidgetFitSizeKeysOrder } from "@/lib/widget/resolveWidgetFitSizeKeysOrder";
import { isGarmentSpecRenderable } from "@/lib/widget-fit/applyWidgetSizeToGarment";
import type { CustomGarmentData } from "@/app/(main)/development/fitting/lib/types";

/**
 * プレビュー用のサイズチップ一覧（ウィジェットと同一の `resolveWidgetFitSizeKeysOrder`）。
 */
export function getPreviewSizeKeys(product: Product, assets: { size: string }[]): string[] {
  const fromAssets = [...new Set(assets.map((a) => a.size))].filter(Boolean) as string[];
  const result = resolveWidgetFitSizeKeysOrder(fromAssets, product.garmentSpec);

  const renderable = isGarmentSpecRenderable(product.garmentSpec);
  let presetRowCount = 0;
  if (renderable && product.garmentSpec != null && typeof product.garmentSpec === "object") {
    const gs = product.garmentSpec as CustomGarmentData;
    const presets = gs.genericSymmetricTop?.sizePresets ?? [];
    presetRowCount = presets.filter(
      (p) =>
        String(p.label).trim() !== "" &&
        Number.isFinite(p.length) &&
        Number.isFinite(p.sleeve)
    ).length;
  }

  let branch: string;
  if (renderable && presetRowCount > 0) {
    branch = fromAssets.length > 0 ? "merge-assets-presets" : "presets-only";
  } else if (fromAssets.length > 0) {
    branch = "assets-only";
  } else if (renderable) {
    branch = presetRowCount > 0 ? "presets-fallback" : "default";
  } else {
    branch = "empty";
  }

  // #region agent log
  fetch("http://127.0.0.1:7468/ingest/8ae11b2e-0353-49f9-add8-94485bd038d3", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "ccdd04" },
    body: JSON.stringify({
      sessionId: "ccdd04",
      runId: "post-preview-fix",
      hypothesisId: "D",
      location: "previewProductSizeKeys.ts",
      message: "getPreviewSizeKeys",
      data: {
        branch,
        resultCount: result.length,
        presetRowCount,
        assetKeyCount: fromAssets.length,
        productId: product.id,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  return result;
}
