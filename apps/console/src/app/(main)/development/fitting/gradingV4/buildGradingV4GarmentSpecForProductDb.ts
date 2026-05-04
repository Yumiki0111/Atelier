import type { CustomGarmentData, GradingV4BehindBodyPaths } from "@/app/(main)/development/fitting/lib/types";
import { RIG_LINE_PATH_COUNT } from "@/lib/fitting-compute/fittingCanvasRigAlign";
import {
  CX,
  GRADING_V4_GARMENT_BACK_LAYER_IDS,
  MEASURE_BODY_LENGTH_Y1,
  SH_L_X,
  SH_R_X,
  SH_Y,
} from "./gradingV4Constants";
import type { GradingV4GarmentFlatCm } from "./gradingV4GarmentCm";

/**
 * `#rig` 内の DOM 順（shaft…）→ `gridSvgRigData` と同一 index 契約への並べ替え。
 */
export const GRADING_V4_DOM_RIG_PATH_INDICES_FOR_BPATHS_ORDER: readonly number[] = [
  0, 8, 5, 1, 3, 6, 7, 2, 4,
];

function pathPresentationFromEl(p: SVGPathElement): {
  dash?: string;
  width?: number;
  stroke?: string;
  fill?: string;
} {
  const dash = p.getAttribute("stroke-dasharray") ?? undefined;
  const sw = p.getAttribute("stroke-width");
  const width = sw != null && sw !== "" ? Number.parseFloat(sw) : undefined;
  const stroke = p.getAttribute("stroke") ?? undefined;
  const fill = p.getAttribute("fill") ?? undefined;
  return {
    ...(dash ? { dash } : {}),
    ...(width != null && Number.isFinite(width) ? { width } : {}),
    ...(stroke ? { stroke } : {}),
    ...(fill ? { fill } : {}),
  };
}

function collectOutlinePaths(root: SVGSVGElement): SVGPathElement[] {
  const out: SVGPathElement[] = [];
  root.querySelectorAll("path").forEach((node) => {
    const p = node as SVGPathElement;
    if (p.closest("#rig") || p.closest("#measures")) return;
    const d = p.getAttribute("d");
    if (d != null && d.trim().length > 0) {
      out.push(p);
    }
  });
  return out;
}

function collectBehindPathsInLayerOrderFromSourceRoot(
  sourceRoot: SVGSVGElement
): SVGPathElement[] {
  const pathEls: SVGPathElement[] = [];
  for (const id of GRADING_V4_GARMENT_BACK_LAYER_IDS) {
    const el = sourceRoot.querySelector(`#${CSS.escape(id)}`);
    if (!el) continue;
    if (el.tagName.toLowerCase() === "path") {
      pathEls.push(el as SVGPathElement);
    } else {
      pathEls.push(...(Array.from(el.querySelectorAll("path")) as SVGPathElement[]));
    }
  }
  return pathEls;
}

function behindBodyPathsFromPathElements(pathEls: SVGPathElement[]): GradingV4BehindBodyPaths | null {
  if (pathEls.length === 0) return null;
  const pathDs: string[] = [];
  const pathIds: string[] = [];
  const pathStrokeDasharrays: (string | undefined)[] = [];
  const pathStrokeWidths: (number | undefined)[] = [];
  const pathStrokes: (string | undefined)[] = [];
  const pathFills: (string | undefined)[] = [];
  for (const p of pathEls) {
    const d = p.getAttribute("d");
    if (d == null || d.trim().length === 0) continue;
    const id = p.getAttribute("id")?.trim() ?? "";
    const pres = pathPresentationFromEl(p);
    pathDs.push(d);
    pathIds.push(id);
    pathStrokeDasharrays.push(pres.dash);
    pathStrokeWidths.push(pres.width);
    pathStrokes.push(pres.stroke);
    pathFills.push(pres.fill);
  }
  if (pathDs.length === 0) return null;
  return { pathDs, pathIds, pathStrokeDasharrays, pathStrokeWidths, pathStrokes, pathFills };
}

/** `garmentBackSvg`（背面のみ）内の path を開発の積み順どおりに取得 */
function collectBehindBodyPathsFromBackRoot(backRoot: SVGSVGElement): GradingV4BehindBodyPaths | null {
  const pathEls = Array.from(backRoot.querySelectorAll("path")) as SVGPathElement[];
  return behindBodyPathsFromPathElements(pathEls);
}

/**
 * 未グレードのガーメント SVG マークアップから、ウィジェット用の S 基準 path スライスを取り出す（ブラウザの DOMParser 前提）。
 */
export function extractGradingV4BaseGarmentSlicesFromMarkup(garmentSvgMarkup: string): {
  gradingV4OutlinePathIds: string[];
  gradingV4BasePathDs: string[];
  gradingV4BaseBehindBody?: GradingV4BehindBodyPaths;
} | null {
  if (typeof DOMParser === "undefined") return null;
  const gDoc = new DOMParser().parseFromString(garmentSvgMarkup, "image/svg+xml");
  const srcRoot = gDoc.documentElement;
  if (gDoc.getElementsByTagName("parsererror").length > 0 || srcRoot.tagName.toLowerCase() !== "svg") {
    return null;
  }
  const svgRoot = srcRoot as unknown as SVGSVGElement;
  const outlinePaths = collectOutlinePaths(svgRoot);
  if (outlinePaths.length === 0) return null;
  const gradingV4OutlinePathIds: string[] = [];
  const gradingV4BasePathDs: string[] = [];
  for (const p of outlinePaths) {
    const id = p.getAttribute("id")?.trim();
    const d = p.getAttribute("d");
    if (!id || !d?.trim()) {
      return null;
    }
    gradingV4OutlinePathIds.push(id);
    gradingV4BasePathDs.push(d);
  }
  const behindEls = collectBehindPathsInLayerOrderFromSourceRoot(svgRoot);
  const gradingV4BaseBehindBody = behindBodyPathsFromPathElements(behindEls) ?? undefined;
  return {
    gradingV4OutlinePathIds,
    gradingV4BasePathDs,
    ...(gradingV4BaseBehindBody ? { gradingV4BaseBehindBody } : {}),
  };
}

/**
 * 前面＋背面ガーメント SVG（389×518・applyScene 済み）から商品 DB 用 `CustomGarmentData` を組み立てる。
 * 背面はボディより下のレイヤのみ。デザイン座標は格子リグと同じ viewBox のため `bodyModelVariant: gridSvgBody` と組み合わせる。
 *
 * @param garmentSvgSourceMarkup 登録元の raw SVG。渡すと S 基準の `gradingV4BasePathDs` 等を同梱（ウィジェットでサイズ別に path を再計算するため）。
 */
export function buildGradingV4GarmentSpecFromFrontAndBackSvg(
  garmentFrontRoot: SVGSVGElement,
  garmentBackRoot: SVGSVGElement | null,
  garmentCm: GradingV4GarmentFlatCm,
  garmentSvgSourceMarkup?: string | null
): CustomGarmentData | null {
  const rigG = garmentFrontRoot.querySelector("#rig");
  const rigPathsRaw = rigG
    ? (Array.from(rigG.querySelectorAll("path")) as SVGPathElement[])
    : [];
  const rigDomDs = rigPathsRaw
    .map((p) => p.getAttribute("d"))
    .filter((d): d is string => d != null && d.trim().length > 0);
  if (rigDomDs.length !== RIG_LINE_PATH_COUNT) {
    return null;
  }

  const perm = GRADING_V4_DOM_RIG_PATH_INDICES_FOR_BPATHS_ORDER;
  if (perm.length !== RIG_LINE_PATH_COUNT) {
    return null;
  }
  const debugRigPathDs = perm.map((domIdx) => rigDomDs[domIdx]!);

  const outlinePaths = collectOutlinePaths(garmentFrontRoot);
  if (outlinePaths.length === 0) {
    return null;
  }

  const pathDs: string[] = [];
  const pathStrokeDasharrays: (string | undefined)[] = [];
  const pathStrokeWidths: (number | undefined)[] = [];
  const pathStrokes: (string | undefined)[] = [];
  const pathFills: (string | undefined)[] = [];

  for (const p of outlinePaths) {
    const d = p.getAttribute("d")!;
    const pres = pathPresentationFromEl(p);
    pathDs.push(d);
    pathStrokeDasharrays.push(pres.dash);
    pathStrokeWidths.push(pres.width);
    pathStrokes.push(pres.stroke);
    pathFills.push(pres.fill);
  }

  const gradingV4BehindBody =
    garmentBackRoot != null ? collectBehindBodyPathsFromBackRoot(garmentBackRoot) : null;

  const data: CustomGarmentData = {
    pathDs,
    pathStrokeDasharrays,
    pathStrokeWidths,
    pathStrokes,
    pathFills,
    landmarks: {
      shoulderY: SH_Y,
      shoulderLx: SH_L_X,
      shoulderRx: SH_R_X,
      hemY: MEASURE_BODY_LENGTH_Y1,
      hemCx: CX,
    },
    size: {
      shoulder: garmentCm.shoulder,
      chest: garmentCm.bodyWidth,
      length: garmentCm.bodyLength,
      sleeve: garmentCm.sleeve,
    },
    presetId: "gradingV4",
    bodyModelVariant: "gridSvgBody",
    debugRigPathDs,
    ...(gradingV4BehindBody ? { gradingV4BehindBody } : {}),
  };

  const mk = garmentSvgSourceMarkup?.trim();
  if (mk) {
    const baseSlices = extractGradingV4BaseGarmentSlicesFromMarkup(mk);
    if (
      baseSlices &&
      baseSlices.gradingV4BasePathDs.length === pathDs.length &&
      baseSlices.gradingV4OutlinePathIds.length === pathDs.length
    ) {
      data.gradingV4OutlinePathIds = baseSlices.gradingV4OutlinePathIds;
      data.gradingV4BasePathDs = baseSlices.gradingV4BasePathDs;
      if (baseSlices.gradingV4BaseBehindBody && gradingV4BehindBody) {
        const bn = gradingV4BehindBody.pathDs.length;
        const bbn = baseSlices.gradingV4BaseBehindBody.pathDs.length;
        if (bn === bbn && bbn > 0) {
          data.gradingV4BaseBehindBody = baseSlices.gradingV4BaseBehindBody;
        }
      }
    }
  }

  return data;
}

/** 背面 SVG が無い／未マウントのときの後方互換用（背面レイヤは保存されない） */
export function buildGradingV4GarmentSpecFromFrontSvg(
  garmentFrontRoot: SVGSVGElement,
  garmentCm: GradingV4GarmentFlatCm,
  garmentSvgSourceMarkup?: string | null
): CustomGarmentData | null {
  return buildGradingV4GarmentSpecFromFrontAndBackSvg(
    garmentFrontRoot,
    null,
    garmentCm,
    garmentSvgSourceMarkup
  );
}
