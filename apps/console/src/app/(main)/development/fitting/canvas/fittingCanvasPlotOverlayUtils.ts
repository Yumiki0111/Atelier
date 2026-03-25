import {
  mirrorLeftGlobalVertexToRightInner,
  mirrorSleeveMeasureRangeToOppositeInner,
} from "../lib/sleeveMeasureBodyExact";
import { getScalableSpec } from "../lib/customGarmentUtils";
import { resolveGenericScalableSpec } from "../generic";
import type { CustomGarmentData, GenericVertexPlotHighlight } from "../lib/types";

/** 連結頂点 # の文字（頂点が密なところで重なりやすいので控えめ） */
export const FONT_INDEX_GARMENT = 30;
export const FONT_INDEX_GARMENT_HIGHLIGHT = 34;
export const FONT_INDEX_GARMENT_SHOULDER = 40;
export const FONT_INDEX_SHOULDER_BADGE = 34;

export function indexLabelStrokeWidth(fontSize: number): number {
  return Math.max(2.5, Math.round(fontSize * 0.12));
}

export type RigIntersectionPlotPoint = {
  label: string;
  point: [number, number];
  plotKind: "bodyFollow" | "warp" | "rigView";
};

export function rigIntersectionPlotStyle(kind: RigIntersectionPlotPoint["plotKind"]): {
  fill: string;
  stroke: string;
  textFill: string;
} {
  switch (kind) {
    case "bodyFollow":
      return { fill: "#14b8a6", stroke: "#0f766e", textFill: "#0d9488" };
    case "warp":
      return { fill: "#3b82f6", stroke: "#1e3a8a", textFill: "#1d4ed8" };
    case "rigView":
      return { fill: "#e879f9", stroke: "#86198f", textFill: "#a21caf" };
    default:
      return { fill: "#64748b", stroke: "#334155", textFill: "#475569" };
  }
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
