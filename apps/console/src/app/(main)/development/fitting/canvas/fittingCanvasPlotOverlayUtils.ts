import {
  mirrorLeftGlobalVertexToRightInner,
  mirrorSleeveMeasureRangeToOppositeInner,
} from "../lib/sleeveMeasureBodyExact";
import { getScalableSpec } from "../lib/customGarmentUtils";
import { resolveEffectiveSleeveGradingGeometry, resolveGenericScalableSpec } from "../generic";
import type { CustomGarmentData, GenericVertexPlotHighlight } from "../lib/types";

/** 連結頂点 # の文字（密な頂点でも重なりにくいよう小さめ） */
export const FONT_INDEX_GARMENT = 14;
export const FONT_INDEX_GARMENT_HIGHLIGHT = 16;

/**
 * 服プロット（`garmentShoulderPoints`）の `#` ラベル。
 * viewBox 高さが ~3k–4k px と大きいため、`meet` 表示では画面ピクセルに強く縮む。読めるよう user space でも大きめに取る。
 */
export const FONT_INDEX_GARMENT_PLOT = 40;
export const FONT_INDEX_GARMENT_PLOT_HIGHLIGHT = 46;

export function indexLabelStrokeWidth(fontSize: number): number {
  return Math.max(1, Math.round(fontSize * 0.09));
}

/** 連続インデックスでもラベル方向がそろわないよう黄金角（ラジアン） */
const GOLDEN_ANGLE_RAD = Math.PI * (3 - Math.sqrt(5));

/**
 * 頂点からラベル中心までのオフセット。密な輪郭でも # が同じ方向に積み上がらない。
 */
export function indexLabelRadialOffset(index: number, radiusPx: number): { ox: number; oy: number } {
  const angle = (index * GOLDEN_ANGLE_RAD) % (Math.PI * 2);
  return {
    ox: Math.cos(angle) * radiusPx,
    oy: Math.sin(angle) * radiusPx,
  };
}

/** 頂点マーカー（円）と `#` テキストの間の余白（px） */
export const INDEX_LABEL_VERTEX_MARGIN_PX = 6;

function indexLabelTextHalfExtentPx(fontSize: number): number {
  return fontSize * 0.52;
}

/** 頂点からラベル中心までの距離 */
export function indexLabelOrbitRadius(circleR: number, fontSize: number): number {
  return circleR + INDEX_LABEL_VERTEX_MARGIN_PX + indexLabelTextHalfExtentPx(fontSize);
}

/** 袖丈・着丈の赤/紫ポリライン表示用の上限頂点 */
export const MAX_MEASURE_POLYLINE_VERTICES = 24;

/** Apply 後は袖丈ポリラインの頂点が極端に多い。見た目用に間引く（端点は必ず残す） */
export function subsamplePolylineForDisplay(
  pts: [number, number][],
  maxVertices: number
): [number, number][] {
  if (pts.length <= maxVertices) return pts;
  const step = Math.ceil(pts.length / maxVertices);
  const out: [number, number][] = [];
  for (let j = 0; j < pts.length; j += step) out.push(pts[j]!);
  const last = pts[pts.length - 1]!;
  if (out[out.length - 1]![0] !== last[0] || out[out.length - 1]![1] !== last[1]) out.push(last);
  return out;
}

export function vertexHighlightRoles(i: number, h: GenericVertexPlotHighlight | null | undefined): string[] {
  if (!h) return [];
  const roles: string[] = [];
  const pushIf = (label: string, range?: [number, number]) => {
    if (!range) return;
    const lo = Math.min(range[0], range[1]);
    const hi = Math.max(range[0], range[1]);
    if (i >= lo && i <= hi) roles.push(label);
  };
  pushIf("左・外腕", h.seamOuterLeft);
  pushIf("右・外腕", h.seamOuterRight);
  pushIf("左・脇〜袖付け", h.sleeveInnerLeft);
  pushIf("右・脇〜袖付け", h.sleeveInnerRight);
  if (h.sleeveMeasureVertexChain != null && h.sleeveMeasureVertexChain.length > 0) {
    if (h.sleeveMeasureVertexChain.includes(i)) roles.push("袖丈計測");
  } else {
    pushIf("袖丈計測", h.sleeveMeasure);
  }
  pushIf("下袖（追従）", h.lowerSleeve);
  pushIf("ミラー下袖（追従）", h.lowerSleeveMirror);
  if (h.lowerSleeveFollowLinkedGlobals?.includes(i)) roles.push("袖下〜胴つなぎ（旧）");
  return roles;
}

export function mirroredSleeveMeasureRangeForPlot(
  data: CustomGarmentData,
  leftRange: [number, number]
): [number, number] | null {
  const topology = data.genericSymmetricTop?.lockedTopology ?? null;
  if (!topology) return null;
  return mirrorSleeveMeasureRangeToOppositeInner(
    data.pathDs,
    topology.sleeveInnerLeft,
    topology.sleeveInnerRight,
    leftRange
  );
}

/** 左袖丈の連結 # 列を右内袖上の対応点列に写す（順序維持）。 */
export function mirrorSleeveVertexChainForPlot(
  data: CustomGarmentData,
  leftChain: number[]
): number[] | null {
  const topology = data.genericSymmetricTop?.lockedTopology ?? null;
  if (!topology) return null;
  const out: number[] = [];
  for (const g of leftChain) {
    const r = mirrorLeftGlobalVertexToRightInner(
      data.pathDs,
      topology.sleeveInnerLeft,
      topology.sleeveInnerRight,
      g
    );
    if (r == null) return null;
    out.push(r);
  }
  return out;
}

export function getCustomSleeveMeasureIndexRange(data: CustomGarmentData): [number, number] | null {
  const gt = data.genericSymmetricTop;
  if (
    gt?.sleeveMeasureVertexStart != null &&
    gt?.sleeveMeasureVertexEnd != null &&
    Number.isFinite(gt.sleeveMeasureVertexStart) &&
    Number.isFinite(gt.sleeveMeasureVertexEnd)
  ) {
    const eff = resolveEffectiveSleeveGradingGeometry(data.pathDs, data.landmarks, gt);
    if (eff) return [eff.gLo, eff.gHi];
    const a = Math.trunc(gt.sleeveMeasureVertexStart);
    const b = Math.trunc(gt.sleeveMeasureVertexEnd);
    return [Math.min(a, b), Math.max(a, b)];
  }
  const spec =
    data.presetId === "genericSymmetricTop"
      ? resolveGenericScalableSpec(data)
      : getScalableSpec(data.pathDs, data.presetId);
  const show = data.presetId === "genericSymmetricTop" && spec?.sleeveMeasureIndices;
  if (!show || !spec?.sleeveMeasureIndices) return null;
  const [a, b] = spec.sleeveMeasureIndices;
  return [Math.min(a, b), Math.max(a, b)];
}

export function getCustomLengthMeasureIndexRange(data: CustomGarmentData): [number, number] | null {
  const gt = data.genericSymmetricTop;
  if (gt?.lengthMeasureVertexStart != null && gt?.lengthMeasureVertexEnd != null) {
    const a = Math.trunc(gt.lengthMeasureVertexStart);
    const b = Math.trunc(gt.lengthMeasureVertexEnd);
    if (Number.isFinite(a) && Number.isFinite(b) && a !== b) return [Math.min(a, b), Math.max(a, b)];
  }
  return null;
}
