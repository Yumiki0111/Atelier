import type { CustomGarmentData, BehindBodySvgPaths, GarmentRearViewSpec, CustomLandmarks } from "@/app/(main)/development/fitting/lib/types";
import { parseStoredBodyModelVariant } from "@/app/(main)/development/fitting/lib/bodyModelVariant";
import {
  GARMENT_FLAT_CM_PRESET_ID,
  isGarmentFlatCmPresetId,
} from "@/app/(main)/development/fitting/garmentFlatCmGrading/garmentFlatCmPreset";

function pickBehindBody(v: unknown): BehindBodySvgPaths | undefined {
  if (v == null || typeof v !== "object" || Array.isArray(v)) return undefined;
  const b = v as BehindBodySvgPaths;
  if (!Array.isArray(b.pathDs) || b.pathDs.length === 0) return undefined;
  return b;
}

function parseRearViewSpec(raw: Record<string, unknown>): GarmentRearViewSpec {
  return {
    pathDs: raw.pathDs as string[],
    pathStrokeDasharrays: raw.pathStrokeDasharrays as GarmentRearViewSpec["pathStrokeDasharrays"],
    pathStrokeWidths: raw.pathStrokeWidths as GarmentRearViewSpec["pathStrokeWidths"],
    pathStrokes: raw.pathStrokes as GarmentRearViewSpec["pathStrokes"],
    pathFills: raw.pathFills as GarmentRearViewSpec["pathFills"],
    landmarks: raw.landmarks as CustomLandmarks,
    debugRigPathDs: raw.debugRigPathDs as string[] | undefined,
    behindBody: pickBehindBody(raw.behindBody),
    flatCmOutlinePathIds: raw.flatCmOutlinePathIds as string[] | undefined,
    flatCmOutlinePathZones: raw.flatCmOutlinePathZones as GarmentRearViewSpec["flatCmOutlinePathZones"],
    flatCmBasePathDs: raw.flatCmBasePathDs as string[] | undefined,
    flatCmBaseBehindBody: pickBehindBody(raw.flatCmBaseBehindBody),
  };
}

/**
 * DB / API から取り出した `garment_spec` を、型どおりのフィールドへ整形する。
 */
export function parseStoredGarmentSpec(raw: unknown): CustomGarmentData | null {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;

  const presetRaw = o.presetId;
  const presetId = isGarmentFlatCmPresetId(presetRaw) ? GARMENT_FLAT_CM_PRESET_ID : (presetRaw as CustomGarmentData["presetId"]);

  const rearRaw = o.rearViewGarment;
  const rearViewGarment =
    rearRaw != null && typeof rearRaw === "object" && !Array.isArray(rearRaw)
      ? parseRearViewSpec(rearRaw as Record<string, unknown>)
      : undefined;

  return {
    pathDs: o.pathDs as string[],
    pathStrokeDasharrays: o.pathStrokeDasharrays as CustomGarmentData["pathStrokeDasharrays"],
    pathStrokeWidths: o.pathStrokeWidths as CustomGarmentData["pathStrokeWidths"],
    pathStrokes: o.pathStrokes as CustomGarmentData["pathStrokes"],
    pathFills: o.pathFills as CustomGarmentData["pathFills"],
    landmarks: o.landmarks as CustomLandmarks,
    size: o.size as CustomGarmentData["size"],
    photoDerived: o.photoDerived as boolean | undefined,
    presetId,
    flatCmOfferedSizeLabels: o.flatCmOfferedSizeLabels as CustomGarmentData["flatCmOfferedSizeLabels"],
    flatCmOfferedSizeCm: o.flatCmOfferedSizeCm as CustomGarmentData["flatCmOfferedSizeCm"],
    bodyModelVariant: parseStoredBodyModelVariant(o.bodyModelVariant),
    debugRigPathDs: o.debugRigPathDs as string[] | undefined,
    behindBody: pickBehindBody(o.behindBody),
    flatCmOutlinePathIds: o.flatCmOutlinePathIds as string[] | undefined,
    flatCmOutlinePathZones: o.flatCmOutlinePathZones as CustomGarmentData["flatCmOutlinePathZones"],
    flatCmBasePathDs: o.flatCmBasePathDs as string[] | undefined,
    flatCmBaseBehindBody: pickBehindBody(o.flatCmBaseBehindBody),
    rearViewGarment,
  };
}
