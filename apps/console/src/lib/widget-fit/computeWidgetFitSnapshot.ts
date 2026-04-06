import "server-only";

import { computeFittingCanvasSnapshot } from "@/lib/fitting-compute/fittingCanvasCompute";
import { loadBPATHS_RIG_LINES } from "@/app/(main)/development/fitting/lib/pathData";
import { shouldSuppressGarmentPathRender } from "@/app/(main)/development/fitting/lib/pathUtils";
import type { CustomGarmentData, ShirtSize } from "@/app/(main)/development/fitting/lib/types";

/**
 * 開発の FittingCanvas と同じ計算（オーバーレイ・プロットは呼び出し側で使わない）。
 * `garmentPaths` と線スタイル配列は同じインデックスで対応する。
 */
export async function computeWidgetFitSnapshot(params: {
  customGarmentData: CustomGarmentData;
  heightCm: number;
  weightKg: number;
}): Promise<{
  viewBoxHeight: number;
  bodyPaths: string[];
  garmentPaths: string[];
  garmentPathStrokeDasharrays: (string | undefined)[];
  garmentPathStrokeWidths: (number | undefined)[];
  garmentPathStrokes: (string | undefined)[];
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

  return {
    viewBoxHeight: snap.viewBoxHeight,
    bodyPaths: snap.bodyPaths,
    garmentPaths,
    garmentPathStrokeDasharrays,
    garmentPathStrokeWidths,
    garmentPathStrokes,
  };
}
