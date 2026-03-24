/**
 * シャツ用ランドマーク（SH の viewBox 座標系）
 * ジャケットと同様に garmentBase でボディに合わせて配置する。
 */

import type { TopLandmarks } from "./garmentBase";
import { SH } from "./constants";

/** シャツは totalWidth を指定しない＝縦横同一スケールのまま（体にフィットして見えるため） */
export const shirtLandmarks: TopLandmarks = {
  shoulderY: SH.sh_y,
  shoulderLx: SH.sh_lx,
  shoulderRx: SH.sh_rx,
  pitY: SH.pit_y,
  pitLx: SH.pit_lx,
  pitRx: SH.pit_rx,
  hemY: SH.hem_y,
  hemCx: SH.cx,
};
