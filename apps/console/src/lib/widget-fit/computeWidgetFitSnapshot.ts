import "server-only";

import { computeFittingCanvasSnapshot } from "@/lib/fitting-compute/fittingCanvasCompute";
import { loadBPATHS_RIG_LINES } from "@/app/(main)/development/fitting/lib/pathData";
import { shouldSuppressGarmentPathRender } from "@/app/(main)/development/fitting/lib/pathUtils";
import type { CustomGarmentData, ShirtSize } from "@/app/(main)/development/fitting/lib/types";
import { buildWidgetFitEaseDiagramFromSnapshot } from "@/lib/widget-fit/buildWidgetFitEaseDiagram";
import type { WidgetFitEaseDiagramJson } from "@/lib/widget-fit/buildWidgetFitEaseDiagram";
import { resolveWidgetFitChestBandMode } from "@/app/(main)/development/fitting/lib/fitCalc";
import { buildWidgetFitEaseSummaryFromSnapshot } from "@/lib/widget-fit/computeWidgetFitEaseSummary";
import type { WidgetFitEaseSummaryJson } from "@/lib/widget-fit/computeWidgetFitEaseSummary";
import {
  orderedSizeLabelsFromCustomGarment,
  resolveOrderedSizeKeysForBand,
} from "@/lib/widget-fit/widgetFitChestBandOrdinal";

/**
 * 開発の FittingCanvas と同じ計算（オーバーレイ・プロットは呼び出し側で使わない）。
 * `garmentPaths` と線スタイル配列は同じインデックスで対応する。
 */
export async function computeWidgetFitSnapshot(params: {
  customGarmentData: CustomGarmentData;
  heightCm: number;
  weightKg: number;
  /** `products.category` など。未指定時はジャケット基準のしきい値 */
  fitChestBandCategory?: string | null;
  /** 試着中のサイズラベル（身長アンカー用）。API はクエリの `size` を渡す */
  currentSizeLabel?: string | null;
}): Promise<{
  viewBoxHeight: number;
  bodyPaths: string[];
  garmentPaths: string[];
  garmentPathStrokeDasharrays: (string | undefined)[];
  garmentPathStrokeWidths: (number | undefined)[];
  garmentPathStrokes: (string | undefined)[];
  fitEaseSummary: WidgetFitEaseSummaryJson;
  fitEaseDiagram: WidgetFitEaseDiagramJson | null;
}> {
  const rigLinePaths = await loadBPATHS_RIG_LINES();
  const shirtSize: ShirtSize = "48";
  const snap = computeFittingCanvasSnapshot({
    height: params.heightCm,
    weight: params.weightKg,
    garment: "custom",
    shirtSize,
    jacketSize: "4",
    customGarmentData: params.customGarmentData,
    animProgress: 1,
    fromSize: null,
    toSize: null,
    rigBodyEnabled: false,
    genericVertexPlotHighlight: null,
    rigLinePaths,
  });

  const garmentPaths: string[] = [];
  const garmentPathStrokeDasharrays: (string | undefined)[] = [];
  const garmentPathStrokeWidths: (number | undefined)[] = [];
  const garmentPathStrokes: (string | undefined)[] = [];

  for (let i = 0; i < snap.customPathDs.length; i++) {
    const d = snap.customPathDs[i]!;
    if (!d || d.length === 0 || shouldSuppressGarmentPathRender(d)) continue;
    garmentPaths.push(d);
    garmentPathStrokeDasharrays.push(snap.customPathStrokeDasharrays[i]);
    garmentPathStrokeWidths.push(snap.customPathStrokeWidths[i]);
    garmentPathStrokes.push(snap.customPathStrokes[i]);
  }

  const fitChestBandMode = resolveWidgetFitChestBandMode(params.fitChestBandCategory);
  const presetLabels = orderedSizeLabelsFromCustomGarment(params.customGarmentData);
  const currentSizeLabel =
    params.currentSizeLabel?.trim() ||
    (presetLabels.length > 0 ? presetLabels[0] : "") ||
    null;
  const bandOrdinalKeys =
    currentSizeLabel != null && currentSizeLabel.length > 0
      ? resolveOrderedSizeKeysForBand(presetLabels, [], currentSizeLabel)
      : null;
  const fitEaseSummary = buildWidgetFitEaseSummaryFromSnapshot(snap, params.weightKg, {
    fitChestBandMode,
    customGarmentData: params.customGarmentData,
    heightCm: bandOrdinalKeys != null ? params.heightCm : undefined,
    orderedSizeKeys: bandOrdinalKeys ?? undefined,
    currentSize:
      bandOrdinalKeys != null && currentSizeLabel != null && currentSizeLabel.length > 0
        ? currentSizeLabel
        : undefined,
  });
  const fitEaseDiagram = buildWidgetFitEaseDiagramFromSnapshot(snap, fitEaseSummary);

  return {
    viewBoxHeight: snap.viewBoxHeight,
    bodyPaths: snap.bodyPaths,
    garmentPaths,
    garmentPathStrokeDasharrays,
    garmentPathStrokeWidths,
    garmentPathStrokes,
    fitEaseSummary,
    fitEaseDiagram,
  };
}
