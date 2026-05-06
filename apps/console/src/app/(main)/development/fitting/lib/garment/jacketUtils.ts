import type { PointTransform } from "../types";
import type { TopLandmarks } from "./garmentBase";
import { JACKET_SIZES } from "../constants";
import { buildTopPlacement } from "./garmentBase";
import { jacketLandmarks } from "./jacketConfig";
import { tPath, pathToPoints } from "../pathUtils";
import {
  JACKET_LEFT_SP1,
  JACKET_LEFT_SP2,
  JACKET_RIGHT_SP1,
  JACKET_RIGHT_SP2,
  JACKET_FRONT_L,
  JACKET_FRONT_R,
  JACKET_CENTER,
} from "../pathData";

function round10(v: number): number {
  return Math.round(v * 10) / 10;
}

/**
 * ジャケットの fill 用閉路: 左外輪郭 → 前左(脇→裾) → 前右(裾→脇) → 右外輪郭(逆順) → Z
 */
/**
 * 現在の身長で `buildTopPlacement` のみ（`warp` なし）。ジャケット SVG のシルエットを保つ。体重・脊髄リグは服に連動しない。
 * @param rigLinePaths 後方互換のため残すが無視する
 */
export function buildJacketPath(
  sizeName: string,
  h: number,
  w: number,
  landmarksOverride?: Partial<TopLandmarks>,
  shoulderOriginY?: number,
  rigLinePaths?: string[] | null
): { fill: string; detail: string; place: (x: number, y: number) => [number, number] } {
  void rigLinePaths;
  const size = JACKET_SIZES[sizeName] ?? JACKET_SIZES["5"];
  const landmarks = { ...jacketLandmarks, ...landmarksOverride };
  const placeCur = buildTopPlacement(h, w, size, landmarks, shoulderOriginY, null);
  const fn: PointTransform = (x, y) => placeCur.place(x, y);

  const lPts = pathToPoints(JACKET_LEFT_SP2);
  const rPts = pathToPoints(JACKET_RIGHT_SP2);
  const flPts = pathToPoints(JACKET_FRONT_L);
  const frPts = pathToPoints(JACKET_FRONT_R);

  const flPitIdx = flPts.findIndex(([, y]) => y >= 700);
  const frPitIdx = frPts.findIndex(([, y]) => y >= 700);

  const segs = [
    ...lPts,
    ...flPts.slice(flPitIdx),
    ...[...frPts.slice(frPitIdx)].reverse(),
    ...[...rPts].reverse(),
  ];

  let fill = "";
  segs.forEach((p, i) => {
    const [nx, ny] = fn(p[0], p[1]);
    fill += (i === 0 ? "M" : "L") + round10(nx) + " " + round10(ny);
  });
  fill += "Z";

  const lSP1 = tPath(JACKET_LEFT_SP1, fn);
  const rSP1 = tPath(JACKET_RIGHT_SP1, fn);
  const frontL = tPath(JACKET_FRONT_L, fn);
  const frontR = tPath(JACKET_FRONT_R, fn);
  const centers = JACKET_CENTER.map((d) => tPath(d, fn)).join(" ");
  const detail = lSP1 + " " + rSP1 + " " + frontL + " " + frontR + " " + centers;

  /** 服座標 → 表示座標（プレースのみ）。オーバーレイの計測点にも使用 */
  return { fill, detail, place: fn };
}
