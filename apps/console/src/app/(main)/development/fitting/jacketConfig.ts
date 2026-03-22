/**
 * ジャケット用のランドマーク定義（元SVG: viewBox 0 0 1420 1091）
 *
 * 現状の jacket SVG は「絵の比率」がサイズ表と違うため totalWidth / maxWidthRatio は暫定。
 *
 * 肩ライン: path の 73.5 はラペル付根で、見た目の袖付け肩はもう少し下。
 * ここをモデル肩(zones.shoulder)に一致させるため shoulderY を袖付けに見合う値に。
 */

import type { TopLandmarks } from "./garmentBase";
import { JK } from "./constants";

/** 袖付け肩のY（path 上で袖が胴に付くライン）。この線をモデル肩に一致させる */
const JACKET_SHOULDER_Y = 105;

/** 暫定: 体の 88% 幅にキャップ。肩はモデル肩に一致（オフセットなし） */
export const jacketLandmarks: TopLandmarks = {
  shoulderY: JACKET_SHOULDER_Y,
  shoulderLx: JK.sh_lx,
  shoulderRx: JK.sh_rx,
  pitY: JK.pit_y,
  pitLx: JK.pit_lx,
  pitRx: JK.pit_rx,
  hemY: JK.hem_y,
  hemCx: JK.cx,
  totalWidth: JK.width,
  maxWidthRatio: 0.88,
};
