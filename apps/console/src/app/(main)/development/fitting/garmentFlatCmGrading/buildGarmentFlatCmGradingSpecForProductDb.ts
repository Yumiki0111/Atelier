import type { CustomGarmentData, BehindBodySvgPaths, GarmentRearViewSpec } from "@/app/(main)/development/fitting/lib/types";
import { GARMENT_FLAT_CM_PRESET_ID } from "@/app/(main)/development/fitting/garmentFlatCmGrading/garmentFlatCmPreset";
import { RIG_LINE_PATH_COUNT } from "@/lib/fitting-compute/fittingCanvasRigAlign";
import {
  GARMENT_FLAT_CM_PATH_ZONES,
  GARMENT_FLAT_CM_BACK_LAYER_IDS,
  CX,
  MEASURE_BODY_LENGTH_Y1,
  SH_L_X,
  SH_R_X,
  SH_Y,
  type GarmentFlatCmZone,
} from "./garmentFlatCmGradingConstants";
import {
  collectGarmentFlatCmBackLayerPathElementsByIdOrder,
  collectGarmentFlatCmFrontOutlinePathElements,
  isGarmentFlatCmOutlineExcludedPath,
  resolveGarmentFlatCmDeformZone,
  stripGarmentFlatCmMeasureDecorations,
} from "./garmentFlatCmGradingSvgOutline";
import { garmentFlatCmToShapeDeltas, type GarmentFlatCm } from "./garmentFlatCmGradingMeasurements";
import { rewriteFlatCmGarmentPath } from "./garmentFlatCmGradingPathDeform";

/**
 * `#rig` 内の DOM 順（shaft…）→ `gridSvgRigData` と同一 index 契約への並べ替え。
 */
export const GARMENT_FLAT_CM_DOM_RIG_PATH_INDICES_FOR_BPATHS_ORDER: readonly number[] = [
  0, 8, 5, 1, 3, 6, 7, 2, 4,
];

const SVG_NS = "http://www.w3.org/2000/svg";

/** 格子 389×518 ガーメント用脊髄リグ（`#rig` の shaft と同一想定） */
function normalizePathDWhitespace(d: string): string {
  return d.trim().replace(/\s+/g, " ");
}

/**
 * 縦脊髄 1 本（M194.x 付近・上端 y≈0・`V` で下着ぐらいまで）。
 * エクスポート由来で `V291.999` / `V292.249` や `M … 0.25V…` になるため `294` 固定はしない。
 */
function isLikelyGridSpinePathDForFlatCmGarment(d: string): boolean {
  const t = normalizePathDWhitespace(d);
  /** `0V291` のように V 直前に空白が無い export が多い（Downloads/rig.svg 等） */
  const m = /^M\s*194\.\d+\s+(0(?:\.\d+)?)\s*V\s*(\d+(?:\.\d+)?)$/i.exec(t);
  if (!m) return false;
  const vy = Number.parseFloat(m[2]!);
  return Number.isFinite(vy) && vy >= 285 && vy <= 300;
}

function collectGarmentFlatCmNonMeasurePathElements(root: Element): SVGPathElement[] {
  const candidates: SVGPathElement[] = [];
  root.querySelectorAll("path").forEach((node) => {
    const p = node as SVGPathElement;
    if (isGarmentFlatCmOutlineExcludedPath(p)) return;
    const d = p.getAttribute("d");
    if (d?.trim()) candidates.push(p);
  });
  return candidates;
}

/** document 順で、脊髄とみなせる path から続く 9 本（格子リグ塊）。 */
function findFlatCmGridNinePathBlock(candidates: SVGPathElement[]): SVGPathElement[] | null {
  if (candidates.length < RIG_LINE_PATH_COUNT) return null;
  for (let i = 0; i <= candidates.length - RIG_LINE_PATH_COUNT; i++) {
    const d0 = candidates[i]!.getAttribute("d");
    if (!d0 || !isLikelyGridSpinePathDForFlatCmGarment(d0)) continue;
    return candidates.slice(i, i + RIG_LINE_PATH_COUNT);
  }
  return null;
}

/**
 * Figma 等の「フラット export」では `#rig` 無しで 9 本のリグ path が並ぶことがある。
 * document 順で最初に現れる脊髄（M194.x…）から **連続 9 本**を `<g id="rig">` に束ねる。
 * リグは先頭でなくてもよい（計測の赤線や本体パスが前にあっても可）。
 */
export function ensureGarmentFlatCmRigGroupOnClonedSvg(svgRoot: SVGSVGElement): void {
  if (svgRoot.querySelector("#rig")) return;
  const candidates = collectGarmentFlatCmNonMeasurePathElements(svgRoot);
  const rigPaths = findFlatCmGridNinePathBlock(candidates);
  if (!rigPaths) return;
  const doc = svgRoot.ownerDocument;
  if (!doc) return;
  const parent = rigPaths[0]!.parentNode;
  if (!parent) return;
  const rigG = doc.createElementNS(SVG_NS, "g");
  rigG.setAttribute("id", "rig");
  parent.insertBefore(rigG, rigPaths[0]!);
  for (const p of rigPaths) {
    rigG.appendChild(p);
  }
}

/**
 * `#rig` があればその子 path。無い場合はフラット export 前提で document 順の連続9本（いずれかの位置で1本目が脊髄）。
 */
export function collectGarmentFlatCmRigPathDsFromSvgRoot(root: Element): string[] | null {
  const rigG = root.querySelector("#rig");
  if (rigG) {
    const rigPathsRaw = Array.from(rigG.querySelectorAll("path")) as SVGPathElement[];
    const rigDomDs = rigPathsRaw
      .map((p) => p.getAttribute("d"))
      .filter((d): d is string => d != null && d.trim().length > 0);
    return rigDomDs.length === RIG_LINE_PATH_COUNT ? rigDomDs : null;
  }
  const candidates = collectGarmentFlatCmNonMeasurePathElements(root);
  const block = findFlatCmGridNinePathBlock(candidates);
  if (!block) return null;
  return block.map((p) => p.getAttribute("d")!.trim());
}

/** 服 SVG アップロード検証: パース →（必要なら）フラットリグを `#rig` 化 →9本確認 */
export function garmentFlatCmRigMarkupValidationError(markup: string): string | null {
  if (typeof DOMParser === "undefined") {
    return "SVG の検証に DOM が必要です。";
  }
  const doc = new DOMParser().parseFromString(markup, "image/svg+xml");
  if (doc.getElementsByTagName("parsererror").length > 0) {
    return "SVG の解析に失敗しました（不正なマークアップの可能性があります）";
  }
  const root = doc.documentElement;
  if (root.tagName.toLowerCase() !== "svg") {
    return "ルート要素が <svg> ではありません";
  }
  const svgRoot = root as unknown as SVGSVGElement;
  ensureGarmentFlatCmRigGroupOnClonedSvg(svgRoot);
  const ds = collectGarmentFlatCmRigPathDsFromSvgRoot(svgRoot);
  if (!ds || ds.length !== RIG_LINE_PATH_COUNT) {
    return "リグを認識できません。#rig に9本の path を入れるか、格子と同じ順の黒リグ9本を連続で置く（先頭は脊髄 M194.x 0付近の縦線。V294 以外の小数も可）。計測は #measures 内推奨。標準どおり <g id=\"rig\"> で囲んでも構いません。";
  }
  return null;
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

function behindBodyPathsFromPathElements(pathEls: SVGPathElement[]): BehindBodySvgPaths | null {
  if (pathEls.length === 0) return null;
  const pathDs: string[] = [];
  const pathIds: string[] = [];
  const pathZones: GarmentFlatCmZone[] = [];
  const pathStrokeDasharrays: (string | undefined)[] = [];
  const pathStrokeWidths: (number | undefined)[] = [];
  const pathStrokes: (string | undefined)[] = [];
  const pathFills: (string | undefined)[] = [];
  for (const p of pathEls) {
    const d = p.getAttribute("d");
    if (d == null || d.trim().length === 0) continue;
    const id = p.getAttribute("id")?.trim() ?? "";
    const z = resolveGarmentFlatCmDeformZone(p, id || undefined) ?? "body";
    const pres = pathPresentationFromEl(p);
    pathDs.push(d);
    pathIds.push(id);
    pathZones.push(z);
    pathStrokeDasharrays.push(pres.dash);
    pathStrokeWidths.push(pres.width);
    pathStrokes.push(pres.stroke);
    pathFills.push(pres.fill);
  }
  if (pathDs.length === 0) return null;
  return { pathDs, pathIds, pathZones, pathStrokeDasharrays, pathStrokeWidths, pathStrokes, pathFills };
}

/** `garmentBackRoot`（試着用に切り出した背面 SVG）から背面レイヤを `GARMENT_FLAT_CM_BACK_LAYER_IDS` 順で読む（DOM 全体順とは一致しないことがある）。 */
function collectBehindBodyPathsFromBackRoot(backRoot: SVGSVGElement): BehindBodySvgPaths | null {
  return behindBodyPathsFromPathElements(collectGarmentFlatCmBackLayerPathElementsByIdOrder(backRoot));
}

/**
 * 未グレードのガーメント SVG マークアップから、ウィジェット用の S 基準 path スライスを取り出す（ブラウザの DOMParser 前提）。
 */
export function extractFlatCmBaseGarmentSlicesFromMarkup(garmentSvgMarkup: string): {
  flatCmOutlinePathIds: string[];
  flatCmOutlinePathZones: GarmentFlatCmZone[];
  flatCmBasePathDs: string[];
  flatCmBaseBehindBody?: BehindBodySvgPaths;
} | null {
  if (typeof DOMParser === "undefined") return null;
  const gDoc = new DOMParser().parseFromString(garmentSvgMarkup, "image/svg+xml");
  const srcRoot = gDoc.documentElement;
  if (gDoc.getElementsByTagName("parsererror").length > 0 || srcRoot.tagName.toLowerCase() !== "svg") {
    return null;
  }
  const svgRoot = srcRoot as unknown as SVGSVGElement;
  ensureGarmentFlatCmRigGroupOnClonedSvg(svgRoot);
  stripGarmentFlatCmMeasureDecorations(svgRoot);
  const outlinePaths = collectGarmentFlatCmFrontOutlinePathElements(svgRoot);
  if (outlinePaths.length === 0) return null;
  const flatCmOutlinePathIds: string[] = [];
  const flatCmOutlinePathZones: GarmentFlatCmZone[] = [];
  const flatCmBasePathDs: string[] = [];
  for (let i = 0; i < outlinePaths.length; i++) {
    const p = outlinePaths[i]!;
    const idRaw = p.getAttribute("id")?.trim();
    const d = p.getAttribute("d");
    if (!d?.trim()) {
      return null;
    }
    const zone = resolveGarmentFlatCmDeformZone(p, idRaw);
    if (!zone) {
      return null;
    }
    flatCmOutlinePathIds.push(idRaw && idRaw.length > 0 ? idRaw : `__gfc_outline_${i}`);
    flatCmOutlinePathZones.push(zone);
    flatCmBasePathDs.push(d.trim());
  }
  const behindEls = collectGarmentFlatCmBackLayerPathElementsByIdOrder(svgRoot);
  const flatCmBaseBehindBody = behindBodyPathsFromPathElements(behindEls) ?? undefined;
  return {
    flatCmOutlinePathIds,
    flatCmOutlinePathZones,
    flatCmBasePathDs,
    ...(flatCmBaseBehindBody ? { flatCmBaseBehindBody } : {}),
  };
}

/**
 * パース済みガーメント SVG 上で、マークアップ由来の S 基準スライスに基づき平置き cm グレードを適用する（背面専用アップロード SVG の試着プレビュー用）。
 */
export function applyGarmentFlatCmGradeToParsedSvgRoot(
  svgRoot: SVGSVGElement,
  garmentCm: GarmentFlatCm,
  sourceMarkup: string
): void {
  const slices = extractFlatCmBaseGarmentSlicesFromMarkup(sourceMarkup);
  if (slices == null) return;
  const { dSh, dBw, dBl, dSleeveLengthPx } = garmentFlatCmToShapeDeltas(garmentCm);
  const frontPaths = collectGarmentFlatCmFrontOutlinePathElements(svgRoot);
  const nFront = Math.min(
    frontPaths.length,
    slices.flatCmBasePathDs.length,
    slices.flatCmOutlinePathZones.length
  );
  for (let i = 0; i < nFront; i++) {
    const p = frontPaths[i]!;
    const orig = slices.flatCmBasePathDs[i]!;
    const zone = slices.flatCmOutlinePathZones[i]!;
    p.setAttribute("d", rewriteFlatCmGarmentPath(orig, zone, dSh, dBw, dBl, dSleeveLengthPx));
  }
  const bb = slices.flatCmBaseBehindBody;
  if (bb?.pathDs?.length) {
    const behindEls = collectGarmentFlatCmBackLayerPathElementsByIdOrder(svgRoot);
    for (let i = 0; i < behindEls.length && i < bb.pathDs.length; i++) {
      const p = behindEls[i]!;
      const orig = bb.pathDs[i]!;
      const pathId = bb.pathIds?.[i] ?? p.getAttribute("id")?.trim() ?? "";
      const canonBackId = GARMENT_FLAT_CM_BACK_LAYER_IDS[i];
      const zone =
        bb.pathZones?.[i] ??
        (pathId ? GARMENT_FLAT_CM_PATH_ZONES[pathId] : undefined) ??
        (canonBackId ? GARMENT_FLAT_CM_PATH_ZONES[canonBackId] : undefined) ??
        ("body" as GarmentFlatCmZone);
      p.setAttribute("d", rewriteFlatCmGarmentPath(orig, zone, dSh, dBw, dBl, dSleeveLengthPx));
    }
  }
}

/**
 * 前面＋背面ガーメント SVG（389×518・applyScene 済み）から商品 DB 用 `CustomGarmentData` を組み立てる。
 * 背面はボディより下のレイヤのみ。デザイン座標は格子リグと同じ viewBox のため `bodyModelVariant: gridSvgBody` と組み合わせる。
 *
 * @param garmentSvgSourceMarkup 登録元の raw SVG。渡すと S 基準の `flatCmBasePathDs` 等を同梱（ウィジェットでサイズ別に path を再計算するため）。
 */
export function buildGarmentFlatCmGradingSpecFromFrontAndBackSvg(
  garmentFrontRoot: SVGSVGElement,
  garmentBackRoot: SVGSVGElement | null,
  garmentCm: GarmentFlatCm,
  garmentSvgSourceMarkup?: string | null
): CustomGarmentData | null {
  const rigDomDs = collectGarmentFlatCmRigPathDsFromSvgRoot(garmentFrontRoot);
  if (!rigDomDs || rigDomDs.length !== RIG_LINE_PATH_COUNT) {
    return null;
  }

  const perm = GARMENT_FLAT_CM_DOM_RIG_PATH_INDICES_FOR_BPATHS_ORDER;
  if (perm.length !== RIG_LINE_PATH_COUNT) {
    return null;
  }
  const debugRigPathDs = perm.map((domIdx) => rigDomDs[domIdx]!);

  const outlinePaths = collectGarmentFlatCmFrontOutlinePathElements(garmentFrontRoot);
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

  const behindBody = garmentBackRoot != null ? collectBehindBodyPathsFromBackRoot(garmentBackRoot) : null;

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
    presetId: GARMENT_FLAT_CM_PRESET_ID,
    bodyModelVariant: "gridSvgBody",
    debugRigPathDs,
    ...(behindBody ? { behindBody } : {}),
  };

  const mk = garmentSvgSourceMarkup?.trim();
  if (mk) {
    const baseSlices = extractFlatCmBaseGarmentSlicesFromMarkup(mk);
    if (
      baseSlices &&
      baseSlices.flatCmBasePathDs.length === pathDs.length &&
      baseSlices.flatCmOutlinePathIds.length === pathDs.length &&
      baseSlices.flatCmOutlinePathZones.length === pathDs.length
    ) {
      data.flatCmOutlinePathIds = baseSlices.flatCmOutlinePathIds;
      data.flatCmOutlinePathZones = baseSlices.flatCmOutlinePathZones;
      data.flatCmBasePathDs = baseSlices.flatCmBasePathDs;
      if (baseSlices.flatCmBaseBehindBody && behindBody) {
        const bn = behindBody.pathDs.length;
        const bbn = baseSlices.flatCmBaseBehindBody.pathDs.length;
        if (bn === bbn && bbn > 0) {
          data.flatCmBaseBehindBody = baseSlices.flatCmBaseBehindBody;
        }
      }
    }
  }

  return data;
}

/** 背面 SVG が無い／未マウントのときの後方互換用（背面レイヤは保存されない） */
export function buildGarmentFlatCmGradingSpecFromFrontSvg(
  garmentFrontRoot: SVGSVGElement,
  garmentCm: GarmentFlatCm,
  garmentSvgSourceMarkup?: string | null
): CustomGarmentData | null {
  return buildGarmentFlatCmGradingSpecFromFrontAndBackSvg(
    garmentFrontRoot,
    null,
    garmentCm,
    garmentSvgSourceMarkup
  );
}

export function pickRearViewGarmentFieldsForSpec(built: CustomGarmentData): GarmentRearViewSpec {
  return {
    pathDs: built.pathDs,
    landmarks: built.landmarks,
    ...(built.pathStrokeDasharrays != null ? { pathStrokeDasharrays: built.pathStrokeDasharrays } : {}),
    ...(built.pathStrokeWidths != null ? { pathStrokeWidths: built.pathStrokeWidths } : {}),
    ...(built.pathStrokes != null ? { pathStrokes: built.pathStrokes } : {}),
    ...(built.pathFills != null ? { pathFills: built.pathFills } : {}),
    ...(built.debugRigPathDs != null ? { debugRigPathDs: built.debugRigPathDs } : {}),
    ...(built.behindBody != null ? { behindBody: built.behindBody } : {}),
    ...(built.flatCmOutlinePathIds != null ? { flatCmOutlinePathIds: built.flatCmOutlinePathIds } : {}),
    ...(built.flatCmOutlinePathZones != null ? { flatCmOutlinePathZones: built.flatCmOutlinePathZones } : {}),
    ...(built.flatCmBasePathDs != null ? { flatCmBasePathDs: built.flatCmBasePathDs } : {}),
    ...(built.flatCmBaseBehindBody != null ? { flatCmBaseBehindBody: built.flatCmBaseBehindBody } : {}),
  };
}

/**
 * `rearViewGarment` を spec に合成（登録用 `buildGarmentSpec` と背面プレビューで同一条件）。
 */
export function mergeRearGarmentMarkupIntoFlatCmSpec(
  main: CustomGarmentData,
  rearMarkup: string | null | undefined,
  garmentCm: GarmentFlatCm,
): CustomGarmentData {
  const rearMk = rearMarkup?.trim();
  if (!rearMk || typeof DOMParser === "undefined") return main;
  const rDoc = new DOMParser().parseFromString(rearMk, "image/svg+xml");
  if (rDoc.getElementsByTagName("parsererror").length > 0) return main;
  const rearRoot = rDoc.documentElement as unknown as SVGSVGElement;
  if (rearRoot?.tagName?.toLowerCase() !== "svg") return main;
  ensureGarmentFlatCmRigGroupOnClonedSvg(rearRoot);
  applyGarmentFlatCmGradeToParsedSvgRoot(rearRoot, garmentCm, rearMk);
  const rearFull = buildGarmentFlatCmGradingSpecFromFrontSvg(rearRoot, garmentCm, rearMk);
  if (!rearFull) return main;
  return { ...main, rearViewGarment: pickRearViewGarmentFieldsForSpec(rearFull) };
}
