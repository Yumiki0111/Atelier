import type { SizeMeasure } from "./types";

export const BODY_CX = 752.5;
export const BODY_H = 2852;

/** 腕と袖の最適位置の基準体型（この位置を保ったまま服を warp で伸縮する） */
export const REF_HEIGHT_CM = 170;
export const REF_WEIGHT_KG = 60;

export const BZ = {
  head_top: 2.5,
  head_bot: 400,
  neck_top: 400,
  neck_bot: 490,
  shoulder: 510,
  armpit: 750,
  chest: 780,
  /** 胸〜腰の中間（腹周り）。くびれだけが強いシルエットを和らげる */
  belly: 980,
  waist: 1130,
  hip: 1400,
  crotch: 1590,
  knee: 2100,
  ankle: 2690,
  foot: 2852,
} as const;

export const BODY_LEFT_OUTLINE: [number, number][] = [
  [752, 290], [756, 293], [761, 295], [773, 300], [785, 304], [794, 306],
  [809, 308], [822, 308], [836, 311], [913, 253], [930, 253], [952, 251],
  [983, 247], [1013, 245], [1038, 242], [1064, 242], [1090, 247], [1113, 253],
  [1128, 257], [1139, 259], [1200, 266], [1269, 274], [1310, 283], [1351, 290],
  [1400, 295], [1457, 300], [1501, 300], [1578, 300],
];

export const SH = {
  cx: 490.5,
  neck_lx: 370, neck_rx: 611, neck_y: 0,
  sh_lx: 141, sh_rx: 839, sh_y: 98,
  tip_lx: 0.6, tip_rx: 980, tip_y: 409,
  fold_lx: 173, fold_rx: 808, fold_y: 483,
  pit_lx: 206, pit_rx: 774, pit_y: 495,
  bod_lx: 174, bod_rx: 807, bod_y: 946,
  hem_lx: 347, hem_rx: 633, hem_y: 1047,
  width: 981, height: 1049,
} as const;

export const SIZES: Record<string, SizeMeasure> = {
  "44": { shoulder: 43, chest: 55, length: 67.5, sleeve: 21 },
  "46": { shoulder: 45, chest: 57, length: 68.5, sleeve: 22 },
  "48": { shoulder: 47, chest: 59, length: 69.5, sleeve: 23 },
  "50": { shoulder: 49, chest: 61, length: 70.5, sleeve: 24 },
  "52": { shoulder: 51, chest: 63, length: 71.5, sleeve: 25 },
  "54": { shoulder: 53, chest: 65, length: 72.5, sleeve: 26 },
};

export const JK = {
  cx: 710,
  neck_lx: 600, neck_rx: 820, neck_y: 0,
  sh_lx: 528, sh_rx: 892, sh_y: 74,
  tip_lx: 8, tip_rx: 1412, tip_y: 946,
  pit_lx: 377, pit_rx: 1043, pit_y: 704,
  hem_lx: 413, hem_rx: 1007, hem_y: 1080,
  width: 1420, height: 1091,
} as const;

/** ジャケット サイズ 3,4,5（着丈A, 肩幅B, 身幅C, 袖丈D cm） */
export const JACKET_SIZES: Record<string, SizeMeasure> = {
  "3": { length: 62.5, shoulder: 53.5, chest: 62.0, sleeve: 58.0 },
  "4": { length: 64.0, shoulder: 55.0, chest: 65.0, sleeve: 59.5 },
  "5": { length: 65.5, shoulder: 56.5, chest: 67.0, sleeve: 61.0 },
};

export const BASE_SHOULDER_HALF = 325.5;
/** ボディ輪郭の肩幅（px）。服がこれを超えないように scaleX をキャップするのに使う */
export const BODY_SHOULDER_WIDTH = BASE_SHOULDER_HALF * 2;
export const JK_B = (BASE_SHOULDER_HALF * 2) / 47;
export const BASE_BODY_SH_OUTLINE_HALF = BODY_CX - 419;

/** 基準（170cm）の左腕アウトライン [肩, 上腕, 山, 肘付近, 袖先] */
export const BODY_ARM_OUTLINE_L: [number, number][] = [
  [419, 510], [369, 563], [331, 664], [316, 750], [243, 938],
];

/** 腕の上側の線の山の頂点（袖の膨らみで服の輪郭を合わせる基準）。左腕アウトラインのインデックス。 */
export const BODY_ARM_PEAK_INDEX = 2;

/** 右腕アウトライン（左を BODY_CX で反転） */
export const BODY_ARM_OUTLINE_R: [number, number][] = BODY_ARM_OUTLINE_L.map(
  ([x, y]) => [2 * BODY_CX - x, y] as [number, number]
);

/** 身長別腕モーフ：肩を固定して腕方向にスケールしたアウトライン。貫通を防ぐため補間で使用。 */
function armOutlineScaledFromShoulder(
  left: [number, number][],
  heightRatio: number
): [number, number][] {
  const [sx, sy] = left[0];
  return left.map(([px, py]) => [
    sx + (px - sx) * heightRatio,
    sy + (py - sy) * heightRatio,
  ]);
}

/** 身長キー（cm）→ 左腕アウトライン。170 が基準。160/180 は肩基準でスケールした仮データ（要差し替え可）。 */
export const ARM_OUTLINE_BY_HEIGHT_CM: Record<
  number,
  { left: [number, number][]; right: [number, number][] }
> = {
  160: {
    left: armOutlineScaledFromShoulder(BODY_ARM_OUTLINE_L, 160 / 170),
    right: armOutlineScaledFromShoulder(BODY_ARM_OUTLINE_L, 160 / 170).map(
      ([x, y]) => [2 * BODY_CX - x, y] as [number, number]
    ),
  },
  170: {
    left: BODY_ARM_OUTLINE_L,
    right: BODY_ARM_OUTLINE_R,
  },
  180: {
    left: armOutlineScaledFromShoulder(BODY_ARM_OUTLINE_L, 180 / 170),
    right: armOutlineScaledFromShoulder(BODY_ARM_OUTLINE_L, 180 / 170).map(
      ([x, y]) => [2 * BODY_CX - x, y] as [number, number]
    ),
  },
};

export const ARM_OUTLINE_HEIGHT_KEYS = [160, 170, 180] as const;
