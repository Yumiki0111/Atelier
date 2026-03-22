import type { CustomGarmentData, SizeMeasure } from "./types";
import type { GenericSymmetricTopSizeKey } from "./generic/getGenericSymmetricTopPreset";
import { parseLineRangeInput, formatLineRangeInput } from "./generic";
import { getPathPoints, globalVertexBoundsForPath, totalPathVertices } from "./pathUtils";
import { pathBBoxFeatures } from "./generic";
import type { ScalableGarmentSpec } from "./types";

export type GenericDraft = {
  /** 「42」または「8-120」形式（連結頂点インデックスの包含範囲） */
  seamOuterLeft: string;
  seamOuterRight: string;
  sleeveInnerLeft: string;
  sleeveInnerRight: string;
  /** 袖丈計測区間（連結 #）。`parseLineRangeInput` と同じ記法 */
  sleeveMeasureRange: string;
  /** 着丈計測区間（連結 #） */
  lengthMeasureRange: string;
  sleeveMeasureVertexStart?: number;
  sleeveMeasureVertexEnd?: number;
  lengthMeasureVertexStart?: number;
  lengthMeasureVertexEnd?: number;
};

export type PathCatalogRow = {
  i: number;
  n: number;
  f: { width: number; height: number } | null;
  g0: number | null;
  g1: number | null;
};

export function emptyGenericDraft(): GenericDraft {
  return {
    seamOuterLeft: "",
    seamOuterRight: "",
    sleeveInnerLeft: "",
    sleeveInnerRight: "",
    sleeveMeasureRange: "",
    lengthMeasureRange: "",
  };
}

export function isLineTupleStored(v: unknown): v is [number, number] {
  return (
    Array.isArray(v) &&
    v.length === 2 &&
    typeof v[0] === "number" &&
    typeof v[1] === "number" &&
    Number.isFinite(v[0]) &&
    Number.isFinite(v[1])
  );
}

export function parseIndex(raw: string): number | undefined {
  const t = raw.trim();
  if (t === "") return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
}

export function parseCm(raw: string): number | undefined {
  const t = raw.trim();
  if (t === "") return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

export function getParsedSeamSleeveRanges(draft: GenericDraft): {
  seamOuterLeft?: [number, number];
  seamOuterRight?: [number, number];
  sleeveInnerLeft?: [number, number];
  sleeveInnerRight?: [number, number];
} {
  const seamOuterLeft = parseLineRangeInput(draft.seamOuterLeft) ?? undefined;
  const seamOuterRight = parseLineRangeInput(draft.seamOuterRight) ?? undefined;
  const sleeveInnerLeft = parseLineRangeInput(draft.sleeveInnerLeft) ?? undefined;
  const sleeveInnerRight = parseLineRangeInput(draft.sleeveInnerRight) ?? undefined;
  return { seamOuterLeft, seamOuterRight, sleeveInnerLeft, sleeveInnerRight };
}

export function computeGenericReady(ranges: {
  seamOuterLeft?: [number, number];
  seamOuterRight?: [number, number];
  sleeveInnerLeft?: [number, number];
  sleeveInnerRight?: [number, number];
}): boolean {
  return !!(ranges.seamOuterLeft && ranges.seamOuterRight && ranges.sleeveInnerLeft && ranges.sleeveInnerRight);
}

export function computeInnerSleeveVertexSpan(ds: string[] | undefined, draft: GenericDraft): { gStart: number; gEnd: number } | null {
  if (!ds?.length) return null;
  const inner = parseLineRangeInput(draft.sleeveInnerLeft);
  if (!inner) return null;
  const lo = Math.min(inner[0], inner[1]);
  const hi = Math.max(inner[0], inner[1]);
  const tot = totalPathVertices(ds);
  if (tot === 0 || lo < 0 || hi >= tot) return null;
  return { gStart: lo, gEnd: hi };
}

export function computePathCatalogRows(ds: string[] | undefined): PathCatalogRow[] | null {
  if (!ds?.length) return null;
  return ds.map((d, i) => {
    const pts = getPathPoints(d);
    const f = pathBBoxFeatures(ds, i);
    const gb = globalVertexBoundsForPath(ds, i);
    return { i, n: pts.length, f, g0: gb?.[0] ?? null, g1: gb?.[1] ?? null };
  });
}

export function pathOverlapsVertexDraft(
  args: {
    pathIdx: number;
    field: keyof Pick<GenericDraft, "seamOuterLeft" | "seamOuterRight" | "sleeveInnerLeft" | "sleeveInnerRight">;
    genericDraft: GenericDraft;
    pathDs: string[];
  }
): boolean {
  const t = parseLineRangeInput(args.genericDraft[args.field]);
  if (!t) return false;
  const a = Math.min(t[0], t[1]);
  const b = Math.max(t[0], t[1]);
  const span = globalVertexBoundsForPath(args.pathDs, args.pathIdx);
  if (!span) return false;
  const p0 = Math.min(span[0], span[1]);
  const p1 = Math.max(span[0], span[1]);
  return !(p1 < a || p0 > b);
}

export function computeGenericLineHints(
  args: {
    ds: string[] | undefined;
    presetSizeKey: GenericSymmetricTopSizeKey;
    customGenericSymmetricTop: CustomGarmentData["genericSymmetricTop"];
  }
): { ol: string; or: string; il: string; ir: string } {
  const unknown = { ol: "連結 #", or: "連結 #", il: "連結 #", ir: "連結 #" };
  const ds = args.ds;
  if (!ds?.length) return unknown;
  const gt = args.customGenericSymmetricTop;
  if (
    isLineTupleStored(gt?.seamOuterLeft) &&
    isLineTupleStored(gt?.seamOuterRight) &&
    isLineTupleStored(gt?.sleeveInnerLeft) &&
    isLineTupleStored(gt?.sleeveInnerRight)
  ) {
    return {
      ol: formatLineRangeInput(gt.seamOuterLeft),
      or: formatLineRangeInput(gt.seamOuterRight),
      il: formatLineRangeInput(gt.sleeveInnerLeft),
      ir: formatLineRangeInput(gt.sleeveInnerRight),
    };
  }
  return unknown;
}

