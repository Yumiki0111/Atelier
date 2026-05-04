import { getPathPoints } from "../lib/pathUtils";

/** プレースメントのみ: 入力 path の連結頂点を placeFn でボディ座標へ */
export function vertexPlotsPlaceOnly(
  pathDs: string[],
  placeFn: (x: number, y: number) => [number, number]
): [number, number][] {
  return pathDs.flatMap((d) => getPathPoints(d).map(([x, y]) => placeFn(x, y)));
}
