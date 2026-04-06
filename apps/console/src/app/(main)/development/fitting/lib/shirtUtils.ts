import type { TopLandmarks } from "./garmentBase";
import { SIZES } from "./constants";
import type { SizeMeasure } from "./types";
import { buildTopPlacement } from "./garmentBase";
import { shirtLandmarks } from "./shirtConfig";
import { extractPoints } from "./pathUtils";
import { SHIRT_LEFT, SHIRT_RIGHT } from "./pathData";

function round10(v: number): number {
  return Math.round(v * 10) / 10;
}

/**
 * サイズ名ではなく **cm 値** からシャツ輪郭を生成。サイズ変更アニメではここへ補間後の `SizeMeasure` を渡す。
 */
export function buildShirtPathFromSizeMeasure(
  size: SizeMeasure,
  h: number,
  w: number,
  landmarksOverride?: Partial<TopLandmarks>
): string {
  const landmarks = { ...shirtLandmarks, ...landmarksOverride };
  const placeCur = buildTopPlacement(h, w, size, landmarks);

  const fn = (x: number, y: number) => placeCur.place(x, y);

  const leftPts = extractPoints(SHIRT_LEFT, fn);
  const rightPts = extractPoints(SHIRT_RIGHT, fn);

  let d = "M" + round10(leftPts[0][0]) + " " + round10(leftPts[0][1]);
  for (let i = 1; i < leftPts.length; i++)
    d += "L" + round10(leftPts[i][0]) + " " + round10(leftPts[i][1]);
  for (let i = rightPts.length - 2; i >= 1; i--)
    d += "L" + round10(rightPts[i][0]) + " " + round10(rightPts[i][1]);
  d += "Z";
  return d;
}

/**
 * 身長・体重は `buildTopPlacement` のみ（着丈・肩幅キャップ）。`warp` も腕角合わせも掛けない。
 * 以前の `getWarpedArmAngles` ベースの袖回転は、体重 xScale で袖が大きく開き「体型で服が変わる」主因だったため廃止。
 */
export function buildShirtPath(
  sizeName: string,
  h: number,
  w: number,
  landmarksOverride?: Partial<TopLandmarks>
): string {
  const size = SIZES[sizeName] ?? SIZES["48"];
  return buildShirtPathFromSizeMeasure(size, h, w, landmarksOverride);
}
