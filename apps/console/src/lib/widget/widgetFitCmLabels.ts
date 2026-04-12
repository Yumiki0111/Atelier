import type { MeasureOverlayData } from "@/app/(main)/development/fitting/lib/types";

/** `buildWidgetFitEaseDiagram` の VIEW_W と一致（着丈テキストを右余白へ） */
const WIDGET_FIT_SVG_VIEW_W = 1505;

/** 公開 API／ウィジェット向け。ゆとりではなく画面上の袖丈・着丈（cm）とラベル座標のみ。 */
export type WidgetFitCmLabelsPayload = {
  wristFromCm: number | null;
  /** 画面上の着丈（cm）。紫ガイドと同系の値。 */
  groinFromCm: number | null;
  wristTextX: number;
  wristTextY: number;
  groinTextX: number;
  groinTextY: number;
};

function pickWristCm(g: NonNullable<MeasureOverlayData["garment"]>): number | null {
  if (g.sleeveGeomDebug != null && Number.isFinite(g.sleeveGeomDebug.cm)) {
    return g.sleeveGeomDebug.cm;
  }
  if (g.sleeveMeasuredCm != null && Number.isFinite(g.sleeveMeasuredCm)) {
    return g.sleeveMeasuredCm;
  }
  return null;
}

function pickGroinCm(g: NonNullable<MeasureOverlayData["garment"]>): number | null {
  if (g.lengthGeomDebug != null && Number.isFinite(g.lengthGeomDebug.cm)) {
    return g.lengthGeomDebug.cm;
  }
  if (g.lengthMeasuredCm != null && Number.isFinite(g.lengthMeasuredCm)) {
    return g.lengthMeasuredCm;
  }
  return null;
}

export function buildWidgetFitCmLabels(overlay: MeasureOverlayData): WidgetFitCmLabelsPayload | null {
  const g = overlay.garment;
  if (!g) return null;

  const wristFromCm = pickWristCm(g);
  const groinFromCm = pickGroinCm(g);
  if (wristFromCm == null && groinFromCm == null) return null;

  const shoulderY = (g.shoulderLeft[1] + g.shoulderRight[1]) / 2;
  const hemY = g.lengthGuideHem ? g.lengthGuideHem[1] : g.hemCenter[1];
  const lengthTopY = g.lengthMeasureTop ? g.lengthMeasureTop[1] : shoulderY;

  let wristTextX = 72;
  let wristTextY = shoulderY + 380;
  if (g.sleeveStart && g.sleeveEnd) {
    wristTextX = (g.sleeveStart[0] + g.sleeveEnd[0]) / 2 - 210;
    wristTextY = (g.sleeveStart[1] + g.sleeveEnd[1]) / 2;
  }

  const groinTextX = WIDGET_FIT_SVG_VIEW_W - 36;
  const groinTextY = (lengthTopY + hemY) / 2;

  return {
    wristFromCm,
    groinFromCm,
    wristTextX,
    wristTextY,
    groinTextX,
    groinTextY,
  };
}
