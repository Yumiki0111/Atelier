import { RIG_LINE_PATH_COUNT } from "@/lib/fitting-compute/fittingCanvasRigAlign";
import type { BehindBodySvgPaths } from "@/app/(main)/development/fitting/lib/types";
import { isGarmentFlatCmPresetId } from "@/app/(main)/development/fitting/garmentFlatCmGrading/garmentFlatCmPreset";

/**
 * 2D 試着用 garment_spec（pathDs あり）を保存・公開する前提の検証。
 * pathDs が無い／空のときは 2D 試着対象外としてスキップ（ok）。
 */
export function validateGarmentSpecForProduction(
  spec: unknown
): { ok: true } | { ok: false; message: string } {
  if (spec == null || typeof spec !== "object" || Array.isArray(spec)) {
    return { ok: false, message: "garment_spec の形式が不正です。" };
  }
  const o = spec as Record<string, unknown>;
  const pathDs = o.pathDs;
  if (!Array.isArray(pathDs) || pathDs.length === 0) {
    return { ok: true };
  }
  if (typeof pathDs[0] !== "string") {
    return { ok: false, message: "garment_spec の pathDs が不正です。" };
  }

  const presetId = o.presetId;
  if (!isGarmentFlatCmPresetId(presetId)) {
    return {
      ok: false,
      message: "平置き cm グレード商品は presetId: garmentFlatCmGrading が必要です。",
    };
  }

  const rigDs = o.debugRigPathDs;
  if (!Array.isArray(rigDs) || rigDs.length !== RIG_LINE_PATH_COUNT) {
    return {
      ok: false,
      message: `平置き cm 服データのリグ本数が不正です（${Array.isArray(rigDs) ? rigDs.length : 0}本、要 ${RIG_LINE_PATH_COUNT}本）。`,
    };
  }

  const bbRaw = o.behindBody;
  if (bbRaw != null) {
    if (typeof bbRaw !== "object" || Array.isArray(bbRaw)) {
      return { ok: false, message: "behindBody の形式が不正です。" };
    }
    const bb = bbRaw as BehindBodySvgPaths;
    if (!Array.isArray(bb.pathDs) || bb.pathDs.length === 0) {
      return { ok: false, message: "behindBody.pathDs が空です。" };
    }
    const n = bb.pathDs.length;
    const checkAligned = (arr: unknown, field: string): string | null => {
      if (arr == null) return null;
      if (!Array.isArray(arr) || arr.length !== n) {
        return `behindBody.${field} は pathDs と同じ本数である必要があります（${Array.isArray(arr) ? arr.length : 0}≠${n}）。`;
      }
      return null;
    };
    const msg =
      checkAligned(bb.pathStrokeDasharrays, "pathStrokeDasharrays") ||
      checkAligned(bb.pathStrokeWidths, "pathStrokeWidths") ||
      checkAligned(bb.pathStrokes, "pathStrokes") ||
      checkAligned(bb.pathFills, "pathFills") ||
      checkAligned(bb.pathIds, "pathIds") ||
      checkAligned(bb.pathZones, "pathZones");
    if (msg) return { ok: false, message: msg };
  }

  const baseDs = o.flatCmBasePathDs;
  const outlineIds = o.flatCmOutlinePathIds;
  const outlineZones = o.flatCmOutlinePathZones;
  const nOutline = Array.isArray(pathDs) ? pathDs.length : 0;
  if (outlineZones != null) {
    if (!Array.isArray(outlineZones) || outlineZones.length !== nOutline) {
      return {
        ok: false,
        message: `flatCmOutlinePathZones は pathDs と同じ本数である必要があります（${Array.isArray(outlineZones) ? outlineZones.length : 0}≠${nOutline}）。`,
      };
    }
  }
  if (baseDs != null || outlineIds != null) {
    if (!Array.isArray(baseDs) || !Array.isArray(outlineIds)) {
      return { ok: false, message: "基準パス（flatCmBasePathDs / flatCmOutlinePathIds）の形式が不正です。" };
    }
    if (baseDs.length !== nOutline || outlineIds.length !== nOutline) {
      return {
        ok: false,
        message: `基準 path 本数が pathDs と一致しません（base ${baseDs.length} / ids ${outlineIds.length} / pathDs ${nOutline}）。`,
      };
    }
  }
  const baseBehindRaw = o.flatCmBaseBehindBody;
  if (baseBehindRaw != null) {
    if (typeof baseBehindRaw !== "object" || Array.isArray(baseBehindRaw)) {
      return { ok: false, message: "flatCmBaseBehindBody の形式が不正です。" };
    }
    const baseB = baseBehindRaw as BehindBodySvgPaths;
    if (!Array.isArray(baseB.pathDs) || baseB.pathDs.length === 0) {
      return { ok: false, message: "flatCmBaseBehindBody.pathDs が空です。" };
    }
    if (bbRaw != null && typeof bbRaw === "object" && !Array.isArray(bbRaw)) {
      const bbOutline = bbRaw as BehindBodySvgPaths;
      const bbn = baseB.pathDs.length;
      const bn = bbOutline.pathDs.length;
      if (bbn !== bn) {
        return {
          ok: false,
          message: `flatCmBaseBehindBody.pathDs は behindBody と同じ本数である必要があります（${bbn}≠${bn}）。`,
        };
      }
      if (baseB.pathZones != null) {
        if (!Array.isArray(baseB.pathZones) || baseB.pathZones.length !== bbn) {
          return {
            ok: false,
            message: `flatCmBaseBehindBody.pathDs と pathZones の本数が一致しません。`,
          };
        }
      }
    }
  }
  const rearViewRaw = o.rearViewGarment;
  if (rearViewRaw != null) {
    if (typeof rearViewRaw !== "object" || Array.isArray(rearViewRaw)) {
      return { ok: false, message: "rearViewGarment の形式が不正です。" };
    }
    const rv = rearViewRaw as Record<string, unknown>;
    const rvPath = rv.pathDs;
    const rvRig = rv.debugRigPathDs;
    if (!Array.isArray(rvPath) || rvPath.length === 0 || typeof rvPath[0] !== "string") {
      return { ok: false, message: "rearViewGarment.pathDs が不正です。" };
    }
    if (!Array.isArray(rvRig) || rvRig.length !== RIG_LINE_PATH_COUNT) {
      return {
        ok: false,
        message: `rearViewGarment のリグ本数が不正です（${Array.isArray(rvRig) ? rvRig.length : 0}本、要 ${RIG_LINE_PATH_COUNT}本）。`,
      };
    }
  }

  const bmv = o.bodyModelVariant;
  if (
    bmv !== undefined &&
    bmv !== "default" &&
    bmv !== "gridSvgBody" &&
    bmv !== "gridSvgBodyBack" &&
    bmv !== "lineArtVerification"
  ) {
    return { ok: false, message: "garment_spec の bodyModelVariant が不正です。" };
  }

  return { ok: true };
}
