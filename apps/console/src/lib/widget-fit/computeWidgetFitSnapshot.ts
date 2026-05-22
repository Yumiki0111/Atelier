import "server-only";

import { shouldSuppressGarmentPathRender } from "@/app/(main)/development/fitting/lib/pathUtils";
import { computeFlatCmGarmentFitSnapshot } from "@/lib/widget-fit/garmentFlatCmFitPipeline";
import type { CustomGarmentData, ShirtSize } from "@/app/(main)/development/fitting/lib/types";
import type { BodyModelVariant } from "@/app/(main)/development/fitting/lib/bodyModelVariant";
import { buildWidgetFitEaseDiagramFromSnapshot } from "@/lib/widget-fit/buildWidgetFitEaseDiagram";
import type { WidgetFitEaseDiagramJson } from "@/lib/widget-fit/buildWidgetFitEaseDiagram";
import { resolveWidgetFitChestBandMode } from "@/app/(main)/development/fitting/lib/fitCalc";
import {
  buildWidgetFitEaseSummaryFromSnapshot,
  type WidgetFitEaseSummaryJson,
} from "@/lib/widget-fit/computeWidgetFitEaseSummary";
import { resolveWidgetFitSizeKeysOrder } from "@/lib/widget/resolveWidgetFitSizeKeysOrder";
import {
  orderedSizeLabelsFromCustomGarment,
  resolveOrderedSizeKeysForBand,
} from "@/lib/widget-fit/widgetFitChestBandOrdinal";
import type { FittingCanvasSnapshot } from "@/lib/fitting-compute/fittingCanvasComputeTypes";
import type { GarmentPreviewBodyView } from "@/lib/widget-fit/resolveGarmentDataForPreviewView";

const WIDGET_FIT_EASE_DISABLED: WidgetFitEaseSummaryJson = {
  shoulderEaseCm: null,
  chestEaseCm: null,
  sleeveFromWristCm: null,
  hemFromCrotchCm: null,
  fitChestBandJa: "",
  fitToneJa: "",
  linesJa: [],
};

function collectRenderableGarmentSlice(
  snap: FittingCanvasSnapshot,
  fromIdx: number,
  toIdx: number
): {
  garmentPaths: string[];
  garmentPathStrokeDasharrays: (string | undefined)[];
  garmentPathStrokeWidths: (number | undefined)[];
  garmentPathStrokes: (string | undefined)[];
  garmentPathFills: (string | undefined)[];
} {
  const garmentPaths: string[] = [];
  const garmentPathStrokeDasharrays: (string | undefined)[] = [];
  const garmentPathStrokeWidths: (number | undefined)[] = [];
  const garmentPathStrokes: (string | undefined)[] = [];
  const garmentPathFills: (string | undefined)[] = [];

  for (let i = fromIdx; i < toIdx; i++) {
    const d = snap.customPathDs[i]!;
    if (!d || d.length === 0 || shouldSuppressGarmentPathRender(d)) continue;
    garmentPaths.push(d);
    garmentPathStrokeDasharrays.push(snap.customPathStrokeDasharrays[i]);
    garmentPathStrokeWidths.push(snap.customPathStrokeWidths[i]);
    garmentPathStrokes.push(snap.customPathStrokes[i]);
    garmentPathFills.push(snap.customPathFills[i]);
  }

  return {
    garmentPaths,
    garmentPathStrokeDasharrays,
    garmentPathStrokeWidths,
    garmentPathStrokes,
    garmentPathFills,
  };
}

/**
 * `computeFittingCanvasSnapshot` と同じ計算（オーバーレイ・プロットは呼び出し側で使わない）。
 * 平置き cm かつ背面ありのとき、`garmentPathsBehindBody*` は体型より下、`garmentPaths*` は体型より上（前面のみ）。
 * 背面が無い／従来プリセットでは `garmentPathsBehindBody` は空配列。
 */
export async function computeWidgetFitSnapshot(params: {
  customGarmentData: CustomGarmentData;
  heightCm: number;
  weightKg: number;
  /** `products.category` など。未指定時はジャケット基準のしきい値 */
  fitChestBandCategory?: string | null;
  /** 試着中のサイズ（一般論の推奨段と比較） */
  currentSizeLabel?: string | null;
  /**
   * DB アセット等のサイズ列（小→大）。未指定時は `garment_spec` のプリセットのみから復元。
   * 空 `[]` を渡していた経路では胸バッジが幾何フォールバックになり、サイズを変えても常に「おすすめ」になりやすい。
   */
  orderedSizeKeysFromCatalog?: string[] | null;
  /** 試着の前後。平置き cm のみ意味あり */
  bodyView?: GarmentPreviewBodyView;
  /** false のとき fitEase 図解・文言を抑止（プレビュー簡略化用） */
  includeFitEase?: boolean;
}): Promise<{
  viewBoxMinX: number;
  viewBoxWidth: number;
  viewBoxHeight: number;
  bodyPaths: string[];
  garmentPathsBehindBody: string[];
  garmentBehindBodyPathStrokeDasharrays: (string | undefined)[];
  garmentBehindBodyPathStrokeWidths: (number | undefined)[];
  garmentBehindBodyPathStrokes: (string | undefined)[];
  garmentBehindBodyPathFills: (string | undefined)[];
  garmentPaths: string[];
  garmentPathStrokeDasharrays: (string | undefined)[];
  garmentPathStrokeWidths: (number | undefined)[];
  garmentPathStrokes: (string | undefined)[];
  garmentPathFills: (string | undefined)[];
  bodyModelVariant: BodyModelVariant | undefined;
  fitEaseSummary: WidgetFitEaseSummaryJson;
  fitEaseDiagram: WidgetFitEaseDiagramJson | null;
}> {
  const snap = computeFlatCmGarmentFitSnapshot({
    customGarmentData: params.customGarmentData,
    height: params.heightCm,
    weight: params.weightKg,
    bodyView: params.bodyView ?? "front",
    shirtSize: "48" as ShirtSize,
    jacketSize: "4",
  });
  const bodyModelVariant = snap.bodyModelVariant;

  const behindN = snap.behindBodyPathCount;
  const behind = collectRenderableGarmentSlice(snap, 0, behindN);
  const front = collectRenderableGarmentSlice(snap, behindN, snap.customPathDs.length);

  const fitChestBandMode = resolveWidgetFitChestBandMode(params.fitChestBandCategory);
  const presetLabels = orderedSizeLabelsFromCustomGarment(params.customGarmentData);
  const currentSizeLabel =
    params.currentSizeLabel?.trim() || (presetLabels.length > 0 ? presetLabels[0]! : null);
  const catalogOrder =
    params.orderedSizeKeysFromCatalog ??
    resolveWidgetFitSizeKeysOrder([], params.customGarmentData);
  const bandKeys =
    currentSizeLabel != null && currentSizeLabel.length > 0
      ? resolveOrderedSizeKeysForBand(presetLabels, catalogOrder, currentSizeLabel)
      : null;
  const includeFit = params.includeFitEase !== false;
  const fitEaseSummary = includeFit
    ? buildWidgetFitEaseSummaryFromSnapshot(snap, params.weightKg, {
        fitChestBandMode,
        customGarmentData: params.customGarmentData,
        heightCm: bandKeys != null ? params.heightCm : undefined,
        orderedSizeKeys: bandKeys ?? undefined,
        currentSize:
          bandKeys != null && currentSizeLabel != null && currentSizeLabel.length > 0
            ? currentSizeLabel
            : undefined,
      })
    : WIDGET_FIT_EASE_DISABLED;
  const fitEaseDiagram = includeFit
    ? buildWidgetFitEaseDiagramFromSnapshot(snap, fitEaseSummary, {
        clampPillsToViewBox: true,
      })
    : null;

  return {
    viewBoxMinX: snap.viewBoxMinX,
    viewBoxWidth: snap.viewBoxWidth,
    viewBoxHeight: snap.viewBoxHeight,
    bodyPaths: snap.bodyPaths,
    garmentPathsBehindBody: behind.garmentPaths,
    garmentBehindBodyPathStrokeDasharrays: behind.garmentPathStrokeDasharrays,
    garmentBehindBodyPathStrokeWidths: behind.garmentPathStrokeWidths,
    garmentBehindBodyPathStrokes: behind.garmentPathStrokes,
    garmentBehindBodyPathFills: behind.garmentPathFills,
    garmentPaths: front.garmentPaths,
    garmentPathStrokeDasharrays: front.garmentPathStrokeDasharrays,
    garmentPathStrokeWidths: front.garmentPathStrokeWidths,
    garmentPathStrokes: front.garmentPathStrokes,
    garmentPathFills: front.garmentPathFills,
    fitEaseSummary,
    fitEaseDiagram,
    bodyModelVariant: snap.bodyModelVariant ?? bodyModelVariant,
  };
}
