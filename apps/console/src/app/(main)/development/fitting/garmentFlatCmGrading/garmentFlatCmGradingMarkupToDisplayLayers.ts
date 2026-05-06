import type { CustomGarmentData } from "@/app/(main)/development/fitting/lib/types";
import type { BehindBodySvgPaths } from "@/app/(main)/development/fitting/lib/types";
import {
  GARMENT_FLAT_CM_BACK_LAYER_IDS,
} from "./garmentFlatCmGradingConstants";
import type { GarmentFlatCm } from "./garmentFlatCmGradingMeasurements";
import { garmentFlatCmToShapeDeltas } from "./garmentFlatCmGradingMeasurements";
import { isGarmentFlatCmPresetId } from "@/app/(main)/development/fitting/garmentFlatCmGrading/garmentFlatCmPreset";
import { rewriteFlatCmGarmentPath } from "./garmentFlatCmGradingPathDeform";
import {
  collectGarmentFlatCmOutlinePathElements,
  resolveGarmentFlatCmDeformZone,
} from "./garmentFlatCmGradingSvgOutline";

export type GarmentFlatCmFrontOutlineLayer = {
  pathDs: string[];
  pathStrokeDasharrays: (string | undefined)[];
  pathStrokeWidths: (number | undefined)[];
  pathStrokes: (string | undefined)[];
  pathFills: (string | undefined)[];
};

function collectOutlinePaths(root: SVGSVGElement): SVGPathElement[] {
  return collectGarmentFlatCmOutlinePathElements(root);
}

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

/**
 * 開発 `GarmentFlatCmGradingFitting` と同じ: バンドル garment SVG マークアップ＋平置き cm で path を変形し、背面／前面アウトラインへ分割する。
 * ブラウザ専用（DOMParser）。
 */
export function computeGarmentFlatCmLayersFromMarkup(
  garmentSvgMarkup: string,
  flatCm: GarmentFlatCm
): { behind: BehindBodySvgPaths; front: GarmentFlatCmFrontOutlineLayer } | null {
  if (typeof DOMParser === "undefined") return null;
  const gDoc = new DOMParser().parseFromString(garmentSvgMarkup, "image/svg+xml");
  if (gDoc.getElementsByTagName("parsererror").length > 0) return null;
  const srcRoot = gDoc.documentElement;
  if (srcRoot.tagName.toLowerCase() !== "svg") return null;

  const srcOutline = collectOutlinePaths(srcRoot as unknown as SVGSVGElement);
  const initialDsOrdered = srcOutline.map((p) => (p.getAttribute("d") ?? "").trim());
  const working = srcRoot.cloneNode(true) as SVGSVGElement;
  const { dSh, dBw, dBl, dSleeveLengthPx } = garmentFlatCmToShapeDeltas(flatCm);

  const workingOutline = collectOutlinePaths(working);
  workingOutline.forEach((p, i) => {
    const orig = initialDsOrdered[i];
    if (!orig) return;
    const id = p.getAttribute("id");
    const zone = resolveGarmentFlatCmDeformZone(p, id);
    if (!zone) return;
    p.setAttribute("d", rewriteFlatCmGarmentPath(orig, zone, dSh, dBw, dBl, dSleeveLengthPx));
  });

  const pathDs: string[] = [];
  const pathStrokeDasharrays: (string | undefined)[] = [];
  const pathStrokeWidths: (number | undefined)[] = [];
  const pathStrokes: (string | undefined)[] = [];
  const pathFills: (string | undefined)[] = [];

  for (const id of GARMENT_FLAT_CM_BACK_LAYER_IDS) {
    const p = working.querySelector(`#${CSS.escape(id)}`) as SVGPathElement | null;
    if (!p) continue;
    const d = p.getAttribute("d");
    if (d == null || d.trim().length === 0) continue;
    const pres = pathPresentationFromEl(p);
    pathDs.push(d);
    pathStrokeDasharrays.push(pres.dash);
    pathStrokeWidths.push(pres.width);
    pathStrokes.push(pres.stroke);
    pathFills.push(pres.fill);
  }

  const behind: BehindBodySvgPaths = {
    pathDs,
    pathStrokeDasharrays,
    pathStrokeWidths,
    pathStrokes,
    pathFills,
  };

  const frontRoot = working.cloneNode(true) as SVGSVGElement;
  for (const id of GARMENT_FLAT_CM_BACK_LAYER_IDS) {
    frontRoot.querySelector(`#${CSS.escape(id)}`)?.remove();
  }
  frontRoot.querySelector("#rig")?.setAttribute("display", "none");

  const outlinePaths = collectOutlinePaths(frontRoot);
  const fPathDs: string[] = [];
  const fDash: (string | undefined)[] = [];
  const fW: (number | undefined)[] = [];
  const fS: (string | undefined)[] = [];
  const fF: (string | undefined)[] = [];
  for (const p of outlinePaths) {
    const d = p.getAttribute("d")!;
    const pres = pathPresentationFromEl(p);
    fPathDs.push(d);
    fDash.push(pres.dash);
    fW.push(pres.width);
    fS.push(pres.stroke);
    fF.push(pres.fill);
  }

  return {
    behind,
    front: {
      pathDs: fPathDs,
      pathStrokeDasharrays: fDash,
      pathStrokeWidths: fW,
      pathStrokes: fS,
      pathFills: fF,
    },
  };
}

/** プレビュー `GarmentFlatCmGradingEditorMirrorPreview` と同一の平置き cm（サイズ切替アニメ時は lerp）。 */
export function resolveGarmentFlatCmMirrorMeasuresForPreview(args: {
  data: CustomGarmentData;
  fromCustomGarmentData: CustomGarmentData | null;
  toCustomGarmentData: CustomGarmentData | null;
  animProgress: number;
}): GarmentFlatCm {
  const { data, fromCustomGarmentData, toCustomGarmentData, animProgress } = args;
  if (
    fromCustomGarmentData != null &&
    toCustomGarmentData != null &&
    animProgress < 1 &&
    isGarmentFlatCmPresetId(data.presetId)
  ) {
    const lerp = (a: number, b: number) => a + (b - a) * animProgress;
    return {
      shoulder: lerp(fromCustomGarmentData.size.shoulder, toCustomGarmentData.size.shoulder),
      bodyWidth: lerp(fromCustomGarmentData.size.chest, toCustomGarmentData.size.chest),
      bodyLength: lerp(fromCustomGarmentData.size.length, toCustomGarmentData.size.length),
      sleeve: lerp(fromCustomGarmentData.size.sleeve, toCustomGarmentData.size.sleeve),
    };
  }
  return garmentFlatCmFromCustomGarmentSize(data);
}

/** `size`（DB）→ 平置き cm（肩幅・身幅・着丈・袖） */
export function garmentFlatCmFromCustomGarmentSize(data: {
  size: { shoulder: number; chest: number; length: number; sleeve: number };
}): GarmentFlatCm {
  return {
    shoulder: data.size.shoulder,
    bodyWidth: data.size.chest,
    bodyLength: data.size.length,
    sleeve: data.size.sleeve,
  };
}
