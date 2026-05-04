import { RIG_LINE_PATH_COUNT } from "@/lib/fitting-compute/fittingCanvasRigAlign";
import type { GradingV4BehindBodyPaths } from "@/app/(main)/development/fitting/lib/types";

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
  if (presetId === "gradingV4") {
    const rigDs = o.debugRigPathDs;
    if (!Array.isArray(rigDs) || rigDs.length !== RIG_LINE_PATH_COUNT) {
      return {
        ok: false,
        message: `Grading v4 服データのリグ本数が不正です（${Array.isArray(rigDs) ? rigDs.length : 0}本、要 ${RIG_LINE_PATH_COUNT}本）。`,
      };
    }
    const bbRaw = o.gradingV4BehindBody;
    if (bbRaw != null) {
      if (typeof bbRaw !== "object" || Array.isArray(bbRaw)) {
        return { ok: false, message: "gradingV4BehindBody の形式が不正です。" };
      }
      const bb = bbRaw as GradingV4BehindBodyPaths;
      if (!Array.isArray(bb.pathDs) || bb.pathDs.length === 0) {
        return { ok: false, message: "gradingV4BehindBody.pathDs が空です。" };
      }
      const n = bb.pathDs.length;
      const checkAligned = (arr: unknown, field: string): string | null => {
        if (arr == null) return null;
        if (!Array.isArray(arr) || arr.length !== n) {
          return `gradingV4BehindBody.${field} は pathDs と同じ本数である必要があります（${Array.isArray(arr) ? arr.length : 0}≠${n}）。`;
        }
        return null;
      };
      const msg =
        checkAligned(bb.pathStrokeDasharrays, "pathStrokeDasharrays") ||
        checkAligned(bb.pathStrokeWidths, "pathStrokeWidths") ||
        checkAligned(bb.pathStrokes, "pathStrokes") ||
        checkAligned(bb.pathFills, "pathFills") ||
        checkAligned(bb.pathIds, "pathIds");
      if (msg) return { ok: false, message: msg };
    }

    const baseDs = o.gradingV4BasePathDs;
    const outlineIds = o.gradingV4OutlinePathIds;
    const nOutline = Array.isArray(pathDs) ? pathDs.length : 0;
    if (baseDs != null || outlineIds != null) {
      if (!Array.isArray(baseDs) || !Array.isArray(outlineIds)) {
        return { ok: false, message: "gradingV4 の基準パス（gradingV4BasePathDs / OutlinePathIds）の形式が不正です。" };
      }
      if (baseDs.length !== nOutline || outlineIds.length !== nOutline) {
        return {
          ok: false,
          message: `Grading v4 の基準 path 本数が pathDs と一致しません（base ${baseDs.length} / ids ${outlineIds.length} / pathDs ${nOutline}）。`,
        };
      }
    }
    const baseBehindRaw = o.gradingV4BaseBehindBody;
    if (baseBehindRaw != null) {
      if (typeof baseBehindRaw !== "object" || Array.isArray(baseBehindRaw)) {
        return { ok: false, message: "gradingV4BaseBehindBody の形式が不正です。" };
      }
      const baseB = baseBehindRaw as GradingV4BehindBodyPaths;
      if (!Array.isArray(baseB.pathDs) || baseB.pathDs.length === 0) {
        return { ok: false, message: "gradingV4BaseBehindBody.pathDs が空です。" };
      }
      if (bbRaw != null && typeof bbRaw === "object" && !Array.isArray(bbRaw)) {
        const bbOutline = bbRaw as GradingV4BehindBodyPaths;
        const bbn = baseB.pathDs.length;
        const bn = bbOutline.pathDs.length;
        if (bbn !== bn) {
          return {
            ok: false,
            message: `gradingV4BaseBehindBody.pathDs は gradingV4BehindBody と同じ本数である必要があります（${bbn}≠${bn}）。`,
          };
        }
      }
    }
  } else if (presetId !== "gradingV4") {
    return { ok: false, message: "Grading v4 として登録してください（presetId: gradingV4）。" };
  }

  const rigDs = o.debugRigPathDs;
  if (!Array.isArray(rigDs) || rigDs.length === 0) {
    return {
      ok: false,
      message: "服SVGにリグ線がありません。モデルと同じリグ付きのSVGをアップロードしてください。",
    };
  }

  if (rigDs.length !== RIG_LINE_PATH_COUNT) {
    return {
      ok: false,
      message: `服のリグ本数（${rigDs.length}）がモデル（${RIG_LINE_PATH_COUNT}本）と一致しません。`,
    };
  }

  const bmv = o.bodyModelVariant;
  if (
    bmv !== undefined &&
    bmv !== "default" &&
    bmv !== "lineArtVerification" &&
    bmv !== "gridSvgBody"
  ) {
    return { ok: false, message: "garment_spec の bodyModelVariant が不正です。" };
  }

  return { ok: true };
}
