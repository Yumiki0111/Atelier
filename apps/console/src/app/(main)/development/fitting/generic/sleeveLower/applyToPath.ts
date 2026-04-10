import { tPathWithPointIndex } from "../../lib/pathUtils";

/**
 * `updates` に含まれるローカル頂点だけを上書きする。
 */
export function applyLocalVertexUpdatesToPathD(
  pathD: string,
  updates: ReadonlyMap<number, [number, number]>
): string {
  if (updates.size === 0) return pathD;
  return tPathWithPointIndex(pathD, (pointIndex, x, y) => {
    const np = updates.get(pointIndex);
    return np ?? [x, y];
  });
}
