import { getPathPoints } from "../lib/pathUtils";
import { MODEL_RIG_LINE_PATH_DS } from "../lib/rig/modelRigData";
import { GRID_RIG_NINE_PATH_DS_SVG } from "../lib/rig/gridSvgRigData";

export type RigPathEndpoints = { min: [number, number]; max: [number, number] };

function endpointsByModelD(d: string): RigPathEndpoints | null {
  const pts = getPathPoints(d);
  if (pts.length < 2) return null;
  const p0 = pts[0];
  const p1 = pts[pts.length - 1];
  return p0[1] <= p1[1]
    ? { min: [p0[0], p0[1]], max: [p1[0], p1[1]] }
    : { min: [p1[0], p1[1]], max: [p0[0], p0[1]] };
}

/** モデル rig 各線の端点（幾何マッチング用） */
export const MODEL_RIG_ENDPOINTS: RigPathEndpoints[] = MODEL_RIG_LINE_PATH_DS.map((d) =>
  endpointsByModelD(d)
).filter(Boolean) as RigPathEndpoints[];

/** 格子 Vector(9) 分解後の 9 本（389×518）の端点。直線リグ推定で `MODEL_RIG_ENDPOINTS` より優先する */
export const GRID_MODEL_RIG_ENDPOINTS: RigPathEndpoints[] = GRID_RIG_NINE_PATH_DS_SVG.map((d) =>
  endpointsByModelD(d)
).filter(Boolean) as RigPathEndpoints[];

export function normalizePathDForMatch(d: string): string {
  return d
    .trim()
    .replace(/\s+/g, " ")
    .replace(/-?\d*\.?\d+(?:e[+-]?\d+)?/gi, (raw) => {
      const n = Number(raw);
      if (!Number.isFinite(n)) return raw;
      const r = Math.round(n * 1000) / 1000;
      return String(r);
    });
}

export function findPathIndexByExpectedD(pathDs: string[], expectedD: string): number | null {
  const ndExpected = normalizePathDForMatch(expectedD);
  for (let i = 0; i < pathDs.length; i++) {
    if (normalizePathDForMatch(pathDs[i]!) === ndExpected) return i;
  }
  return null;
}

/**
 * アップロードの服リグ path が、読み込んだモデル `rigLinePaths`（body 座標系）と順序・形状が一致するか。
 * 一致時は `placement.place` を通さずモデルと同じ休止座標を使える（赤リグが完全に重なる）。
 */
export function garmentDebugRigMatchesLoadedRig(
  debugRigPathDs: string[],
  rigLinePaths: string[] | null
): boolean {
  if (!rigLinePaths || debugRigPathDs.length !== rigLinePaths.length) return false;
  for (let i = 0; i < debugRigPathDs.length; i++) {
    if (normalizePathDForMatch(debugRigPathDs[i]!) !== normalizePathDForMatch(rigLinePaths[i]!))
      return false;
  }
  return true;
}
