import type { CustomGarmentData } from "@/app/(main)/development/fitting/lib/types";
import type { GradingV4BehindBodyPaths } from "@/app/(main)/development/fitting/lib/types";
import {
  GRADING_V4_GARMENT_BACK_LAYER_IDS,
  GRADING_V4_PATH_ZONES,
} from "./gradingV4Constants";
import type { GradingV4GarmentFlatCm } from "./gradingV4GarmentCm";
import { garmentFlatCmToGradeDeltas } from "./gradingV4GarmentCm";
import { rewriteGradingV4GarmentPath } from "./gradingV4GarmentDeform";

export type GradingV4FrontOutlineLayer = {
  pathDs: string[];
  pathStrokeDasharrays: (string | undefined)[];
  pathStrokeWidths: (number | undefined)[];
  pathStrokes: (string | undefined)[];
  pathFills: (string | undefined)[];
};

function collectGarmentOriginalPathDs(srcRoot: Element): Record<string, string> {
  const garmentOriginalDs: Record<string, string> = {};
  srcRoot.querySelectorAll("path").forEach((p) => {
    const id = p.getAttribute("id");
    const d = p.getAttribute("d");
    if (id && d) {
      garmentOriginalDs[id] = d;
    }
  });
  return garmentOriginalDs;
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

/**
 * 開発 `GradingV4Fitting` と同じ: バンドル garmet SVG マークアップ＋平置き cm で path を変形し、背面／前面アウトラインへ分割する。
 * ブラウザ専用（DOMParser）。
 */
export function computeGradingV4GarmentLayersFromMarkup(
  garmentSvgMarkup: string,
  flatCm: GradingV4GarmentFlatCm
): { behind: GradingV4BehindBodyPaths; front: GradingV4FrontOutlineLayer } | null {
  if (typeof DOMParser === "undefined") return null;
  const gDoc = new DOMParser().parseFromString(garmentSvgMarkup, "image/svg+xml");
  if (gDoc.getElementsByTagName("parsererror").length > 0) return null;
  const srcRoot = gDoc.documentElement;
  if (srcRoot.tagName.toLowerCase() !== "svg") return null;

  const initialDs = collectGarmentOriginalPathDs(srcRoot);
  const working = srcRoot.cloneNode(true) as SVGSVGElement;
  const { dSh, dBw, dBl, dSleeveLengthPx } = garmentFlatCmToGradeDeltas(flatCm);

  working.querySelectorAll("path").forEach((node) => {
    const p = node as SVGPathElement;
    const id = p.getAttribute("id");
    if (!id) return;
    const orig = initialDs[id];
    const zone = GRADING_V4_PATH_ZONES[id];
    if (!orig || !zone) return;
    p.setAttribute("d", rewriteGradingV4GarmentPath(orig, zone, dSh, dBw, dBl, dSleeveLengthPx));
  });

  const pathDs: string[] = [];
  const pathStrokeDasharrays: (string | undefined)[] = [];
  const pathStrokeWidths: (number | undefined)[] = [];
  const pathStrokes: (string | undefined)[] = [];
  const pathFills: (string | undefined)[] = [];

  for (const id of GRADING_V4_GARMENT_BACK_LAYER_IDS) {
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

  const behind: GradingV4BehindBodyPaths = {
    pathDs,
    pathStrokeDasharrays,
    pathStrokeWidths,
    pathStrokes,
    pathFills,
  };

  const frontRoot = working.cloneNode(true) as SVGSVGElement;
  for (const id of GRADING_V4_GARMENT_BACK_LAYER_IDS) {
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

/** プレビュー `GradingV4EditorMirrorPreview` と同一の平置き cm（サイズ切替アニメ時は lerp）。 */
export function resolveGradingV4MirrorFlatCmForPreview(args: {
  data: CustomGarmentData;
  fromCustomGarmentData: CustomGarmentData | null;
  toCustomGarmentData: CustomGarmentData | null;
  animProgress: number;
}): GradingV4GarmentFlatCm {
  const { data, fromCustomGarmentData, toCustomGarmentData, animProgress } = args;
  if (
    fromCustomGarmentData != null &&
    toCustomGarmentData != null &&
    animProgress < 1 &&
    data.presetId === "gradingV4"
  ) {
    const lerp = (a: number, b: number) => a + (b - a) * animProgress;
    return {
      shoulder: lerp(fromCustomGarmentData.size.shoulder, toCustomGarmentData.size.shoulder),
      bodyWidth: lerp(fromCustomGarmentData.size.chest, toCustomGarmentData.size.chest),
      bodyLength: lerp(fromCustomGarmentData.size.length, toCustomGarmentData.size.length),
      sleeve: lerp(fromCustomGarmentData.size.sleeve, toCustomGarmentData.size.sleeve),
    };
  }
  return gradingFlatCmFromCustomGarmentData(data);
}

/** `size`（DB）→ Grading 平置き cm */
export function gradingFlatCmFromCustomGarmentData(data: {
  size: { shoulder: number; chest: number; length: number; sleeve: number };
}): GradingV4GarmentFlatCm {
  return {
    shoulder: data.size.shoulder,
    bodyWidth: data.size.chest,
    bodyLength: data.size.length,
    sleeve: data.size.sleeve,
  };
}
