import { isDebugFittingSleevePipelineEnabled } from "@/lib/fitting-compute/fittingCanvasDebugFlags";
import { getPathPoints } from "../../lib/pathUtils";

const MIN_EDGE_PX = 1e-4;

export type LowerSleeveInvariantFailure =
  | { kind: "nan_vertex"; local: number }
  | { kind: "short_edge"; a: number; b: number; len: number };

/**
 * 開発時: チェーン上の辺長が極小／NaN でないことを検査。
 */
export function assertLowerSleeveChainInvariantsDev(
  pathD: string,
  chainLocal: readonly number[],
  label: string
): LowerSleeveInvariantFailure | null {
  if (!isDebugFittingSleevePipelineEnabled()) return null;
  const pts = getPathPoints(pathD);
  for (const li of chainLocal) {
    const p = pts[li];
    if (p == null || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) {
      const f: LowerSleeveInvariantFailure = { kind: "nan_vertex", local: li };
      console.warn(`[FITTING_SLEEVE_LOWER_INVARIANT] ${label}`, f);
      return f;
    }
  }
  for (let i = 0; i < chainLocal.length - 1; i++) {
    const a = pts[chainLocal[i]!]!;
    const b = pts[chainLocal[i + 1]!]!;
    const len = Math.hypot(b[0]! - a[0]!, b[1]! - a[1]!);
    if (len < MIN_EDGE_PX) {
      const f: LowerSleeveInvariantFailure = {
        kind: "short_edge",
        a: chainLocal[i]!,
        b: chainLocal[i + 1]!,
        len,
      };
      console.warn(`[FITTING_SLEEVE_LOWER_INVARIANT] ${label}`, f);
      return f;
    }
  }
  return null;
}
