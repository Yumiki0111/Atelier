import type { CustomGarmentData } from "@/app/(main)/development/fitting/lib/types";
import { validateGarmentSpecForProduction } from "@/lib/products/validateGarmentSpecForProduction";
import {
  GARMENT_FLAT_CM_PATH_ZONES,
  GARMENT_FLAT_CM_BACK_LAYER_IDS,
  type GarmentFlatCmZone,
} from "@/app/(main)/development/fitting/garmentFlatCmGrading/garmentFlatCmGradingConstants";
import { GARMENT_FLAT_CM_PRESET_ID, isGarmentFlatCmPresetId } from "@/app/(main)/development/fitting/garmentFlatCmGrading/garmentFlatCmPreset";
import {
  garmentFlatCmToShapeDeltas,
  GARMENT_FLAT_CM_SIZE_TABLE,
  type GarmentFlatCm,
} from "@/app/(main)/development/fitting/garmentFlatCmGrading/garmentFlatCmGradingMeasurements";
import { rewriteFlatCmGarmentPath } from "@/app/(main)/development/fitting/garmentFlatCmGrading/garmentFlatCmGradingPathDeform";

import { inferGarmentFlatCmSizeKey, parseFlatCmSizeKey } from "@/lib/widget-fit/widgetFitFlatCmSize";

function resolveFlatCmWidgetOutlineZone(
  i: number,
  pathId: string,
  flatCmOutlinePathZones: readonly GarmentFlatCmZone[] | undefined
): GarmentFlatCmZone | undefined {
  return flatCmOutlinePathZones?.[i] ?? GARMENT_FLAT_CM_PATH_ZONES[pathId];
}

/** ウィジェットで選んだサイズラベルに合わせて平置き cm カタログを反映 */
export function applyWidgetSizeToCustomGarmentData(
  base: CustomGarmentData,
  selectedSize: string
): CustomGarmentData {
  const data = JSON.parse(JSON.stringify(base)) as CustomGarmentData;
  const refSizeSnapshot = { ...data.size };
  const key =
    parseFlatCmSizeKey(selectedSize) ?? inferGarmentFlatCmSizeKey(data) ?? "S";
  const flat = GARMENT_FLAT_CM_SIZE_TABLE[key];

  const refFlatCm: GarmentFlatCm = {
    shoulder: data.size.shoulder,
    bodyWidth: data.size.chest,
    bodyLength: data.size.length,
    sleeve: data.size.sleeve,
  };

  data.size = {
    shoulder: flat.shoulder,
    chest: flat.bodyWidth,
    length: flat.bodyLength,
    sleeve: flat.sleeve,
  };

  const targetFlatCm: GarmentFlatCm = {
    shoulder: flat.shoulder,
    bodyWidth: flat.bodyWidth,
    bodyLength: flat.bodyLength,
    sleeve: flat.sleeve,
  };

  const resolveFlatCmOutlineIdsForRewrite = (dataPathN: number): readonly string[] | null => {
    const oc = data.flatCmOutlinePathIds?.length ?? 0;
    if (oc === dataPathN && oc > 0) return data.flatCmOutlinePathIds!;
    return null;
  };


  if (isGarmentFlatCmPresetId(data.presetId)) {
    data.presetId = GARMENT_FLAT_CM_PRESET_ID;

    const outlineIds = resolveFlatCmOutlineIdsForRewrite(data.pathDs.length);
    const explicitBaseReady =
      Boolean(data.flatCmOutlinePathIds?.length) &&
      Boolean(data.flatCmBasePathDs?.length) &&
      data.flatCmOutlinePathIds!.length === data.flatCmBasePathDs!.length &&
      data.flatCmOutlinePathIds!.length === data.pathDs.length;

    if (explicitBaseReady) {
      const { dSh, dBw, dBl, dSleeveLengthPx } = garmentFlatCmToShapeDeltas(targetFlatCm);

      const outlineZone = (i: number, pathId: string): GarmentFlatCmZone | undefined =>
        resolveFlatCmWidgetOutlineZone(i, pathId, data.flatCmOutlinePathZones);

      data.pathDs = data.flatCmOutlinePathIds!.map((pathId, i) => {
        const zone = outlineZone(i, pathId);
        const baseD = data.flatCmBasePathDs![i];
        if (!zone || baseD == null || baseD.length === 0) {
          return data.pathDs[i] ?? "";
        }
        return rewriteFlatCmGarmentPath(baseD, zone, dSh, dBw, dBl, dSleeveLengthPx);
      });

      const behind = data.behindBody;
      const behindBase = data.flatCmBaseBehindBody;
      if (behind?.pathDs?.length && behindBase?.pathDs?.length === behind.pathDs.length) {
        const prevBehindDs = behind.pathDs.slice();
        behind.pathDs = behind.pathDs.map((_, i) => {
          const pathId = behind.pathIds?.[i] ?? "";
          const zone =
            behindBase.pathZones?.[i] ?? (pathId ? GARMENT_FLAT_CM_PATH_ZONES[pathId] : undefined);
          const baseDRow = behindBase.pathDs[i];
          if (!zone || baseDRow == null || baseDRow.length === 0) {
            return prevBehindDs[i] ?? "";
          }
          return rewriteFlatCmGarmentPath(baseDRow, zone, dSh, dBw, dBl, dSleeveLengthPx);
        });
      }
    } else if (outlineIds != null && outlineIds.length === data.pathDs.length) {
      const { dSh, dBw, dBl, dSleeveLengthPx } = garmentFlatCmToShapeDeltas(targetFlatCm, refFlatCm);

      data.pathDs = outlineIds.map((pathId, i) => {
        const zone = resolveFlatCmWidgetOutlineZone(i, pathId, data.flatCmOutlinePathZones);
        const cur = data.pathDs[i];
        if (!zone || cur == null || cur.length === 0) return cur ?? "";
        return rewriteFlatCmGarmentPath(cur, zone, dSh, dBw, dBl, dSleeveLengthPx);
      });

      const behind = data.behindBody;
      const needsStandardBehindRewrite =
        behind?.pathDs &&
        behind.pathDs.length === GARMENT_FLAT_CM_BACK_LAYER_IDS.length &&
        !(data.flatCmBaseBehindBody?.pathDs?.length === behind.pathDs.length && behind.pathIds?.length === behind.pathDs.length);

      if (needsStandardBehindRewrite) {
        behind.pathDs = GARMENT_FLAT_CM_BACK_LAYER_IDS.map((pathId, i) => {
          const zone = GARMENT_FLAT_CM_PATH_ZONES[pathId];
          const cur = behind.pathDs[i];
          if (!zone || cur == null || cur.length === 0) return cur ?? "";
          return rewriteFlatCmGarmentPath(cur, zone, dSh, dBw, dBl, dSleeveLengthPx);
        });
      }
    }
  }

  if (isGarmentFlatCmPresetId(data.presetId) && data.rearViewGarment) {
    data.presetId = GARMENT_FLAT_CM_PRESET_ID;
    const rearMerged: CustomGarmentData = {
      ...data.rearViewGarment,
      size: refSizeSnapshot,
      presetId: GARMENT_FLAT_CM_PRESET_ID,
      bodyModelVariant: "gridSvgBody",
    };
    const rearSized = applyWidgetSizeToCustomGarmentData(rearMerged, selectedSize);
    data.rearViewGarment = {
      pathDs: rearSized.pathDs,
      pathStrokeDasharrays: rearSized.pathStrokeDasharrays,
      pathStrokeWidths: rearSized.pathStrokeWidths,
      pathStrokes: rearSized.pathStrokes,
      pathFills: rearSized.pathFills,
      landmarks: rearSized.landmarks,
      debugRigPathDs: rearSized.debugRigPathDs,
      behindBody: rearSized.behindBody,
      flatCmOutlinePathIds: rearSized.flatCmOutlinePathIds,
      flatCmOutlinePathZones: rearSized.flatCmOutlinePathZones,
      flatCmBasePathDs: rearSized.flatCmBasePathDs,
      flatCmBaseBehindBody: rearSized.flatCmBaseBehindBody,
    };
  }

  return data;
}

/**
 * ウィジェット・プレビューで 2D 試着を出せるか。
 */
export function isGarmentSpecRenderable(spec: unknown): spec is CustomGarmentData {
  if (!spec || typeof spec !== "object") return false;
  const p = spec as { pathDs?: unknown };
  if (!Array.isArray(p.pathDs) || p.pathDs.length === 0 || typeof p.pathDs[0] !== "string") {
    return false;
  }
  return validateGarmentSpecForProduction(spec).ok;
}
