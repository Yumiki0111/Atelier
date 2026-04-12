import type { MeasureOverlayData } from "@/app/(main)/development/fitting/lib/types";

type GarmentG = NonNullable<MeasureOverlayData["garment"]>;

/**
 * 採寸オーバーレイ（`FittingCanvasMeasureOverlayGarmentSleeve` の `screenSleeveCm`）と同じ袖「幾何」cm。
 * パイプライン後の `sleeveGeomDebug.cm` を正とし、図・ツールチップ・ウィジェットで数値を揃える。
 */
export function resolveSleeveGeomDisplayCm(g: GarmentG): number | null {
  const sleeveGeom = g.sleeveGeomDebug;
  const measuredSleeve = g.sleeveMeasuredCm;
  const rawBefore = g.sleeveGeomBeforeSleeveFixDebug;
  const inputSleeve = g.size.sleeve;
  const screenSleeveCm =
    sleeveGeom != null && Number.isFinite(sleeveGeom.cm)
      ? sleeveGeom.cm
      : measuredSleeve != null && Number.isFinite(measuredSleeve)
        ? measuredSleeve
        : rawBefore != null && Number.isFinite(rawBefore.cm)
          ? rawBefore.cm
          : inputSleeve;
  return Number.isFinite(screenSleeveCm) ? screenSleeveCm : null;
}
