/** S サイズ基準座標・グレードルール（HTML プロトタイプ相当） */

import { BPATHS_GRADING_V4_GRID_SVG_BODY_TEMPLATE } from "./gradingV4GridBodyTemplate.generated";

export const GRADING_V4_GARMENT_VIEWBOX = "0 0 389 518";

export const CX = 194.375;
export const SH_Y = 103.5;
export const BODY_TOP = 145.5;
export const BODY_BOT = 293.5;

export const SH_L_X = 125.875;
export const SH_R_X = 262.875;
export const BDY_L_X = 136.375;
export const BDY_R_X = 252.375;
export const TIP_L_X = 11.375;
export const TIP_R_X = 377.375;
export const TIP_Y = 234.5;

/** 着丈計測線（measure_body_length）の座標。オーバーレイ px 表示はこの実長と揃える */
export const MEASURE_BODY_LENGTH_Y1 = 294.012;
export const MEASURE_BODY_LENGTH_Y2 = 86.99;
export const MEASURE_BODY_LENGTH_BASE_PX = MEASURE_BODY_LENGTH_Y1 - MEASURE_BODY_LENGTH_Y2;

/** 袖計測パス（デザイン measures と同一・肩付け付近〜袖口の折れ線） */
export const MEASURE_SLEEVE_L_PATH_D =
  "M124.387 102.291L82.8871 144.791L52.3871 177.791L9.87405 233.285";
export const MEASURE_SLEEVE_R_PATH_D =
  "M264.582 102.291L306.082 144.791L336.582 177.791L379.095 233.285";

export const MEASURE_SLEEVE_L_VERTS: ReadonlyArray<readonly [number, number]> = [
  [124.387, 102.291],
  [82.8871, 144.791],
  [52.3871, 177.791],
  [9.87405, 233.285],
] as const;

export const MEASURE_SLEEVE_R_VERTS: ReadonlyArray<readonly [number, number]> = [
  [264.582, 102.291],
  [306.082, 144.791],
  [336.582, 177.791],
  [379.095, 233.285],
] as const;

/** 1 step あたりのグレード */
export const G = { sh: 5, bw: 6, bl: 8, sl: 4, slY: 3 } as const;

export const SIZE_STEPS = {
  XS: -1,
  S: 0,
  M: 1,
  L: 2,
  XL: 3,
  XXL: 4,
} as const;

export type GradingV4SizeKey = keyof typeof SIZE_STEPS;

/**
 * Group 126 (5) 系: 試着表示でボディより下（背面）にだけ描く線。マスクは使わず積み順のみ。
 */
export const GRADING_V4_GARMENT_BACK_LAYER_IDS = [
  "back-stroke",
  "back-stroke_2",
  "back-stroke_3",
  "back-stroke_4",
  "back-stroke_5",
] as const;

/** Group 126 (5) ガーメント export の path id → グレードゾーン */
export const GRADING_V4_PATH_ZONES: Record<string, GradingV4GarmentZone> = {
  "Vector 240": "collar",
  "Vector 241": "collar",
  "back-stroke": "sleeve_L",
  "Vector 227": "sleeve_L",
  "Vector 227_2": "sleeve_L",
  "Vector 227_3": "sleeve_L",
  "Vector 235": "sleeve_L",
  "Vector 228": "sleeve_L",
  "Vector 228_2": "sleeve_L",
  "Vector 228_3": "sleeve_L",
  "Vector 230": "sleeve_L",
  "Vector 230_2": "sleeve_L",
  "Vector 236": "sleeve_L",
  "Vector 233": "sleeve_L",
  "Vector 234": "sleeve_L",
  "Vector 230_3": "sleeve_L",
  "Vector 232": "button_L",
  "Vector 231": "button_L",
  "Vector 247": "button_L",
  "Vector 227_4": "body",
  "Vector 246": "body",
  "Vector 227_5": "body",
  "Vector 227_6": "body",
  "Vector 246_2": "body",
  "Vector 237": "body",
  "Vector 228_4": "body",
  "Vector 228_5": "body",
  "Vector 228_6": "body",
  "Vector 245": "body",
  "Vector 244": "body",
  "Vector 243": "body",
  "Vector 242": "body",
  "Vector 239": "body",
  "Vector 238": "body",
  "Vector 229": "body",
  "Vector 227_7": "body",
  "Vector 237_2": "body",
  "Vector 228_7": "body",
  "back-stroke_2": "body",
  "back-stroke_3": "body",
  "Vector 228_8": "body",
  "Vector 228_9": "body",
  "Vector 228_10": "body",
  "back-stroke_4": "body",
  "Vector 245_2": "body",
  "Vector 244_2": "body",
  "Vector 243_2": "body",
  "Vector 242_2": "body",
  "Vector 239_2": "body",
  "Vector 238_2": "body",
  "Vector 229_2": "body",
  "Vector 232_2": "button_R",
  "Vector 231_2": "button_R",
  "Vector 247_2": "button_R",
  "Vector 227_8": "sleeve_R",
  "back-stroke_5": "sleeve_R",
  "Vector 227_9": "sleeve_R",
  "Vector 227_10": "sleeve_R",
  "Vector 235_2": "sleeve_R",
  "Vector 228_11": "sleeve_R",
  "Vector 228_12": "sleeve_R",
  "Vector 228_13": "sleeve_R",
  "Vector 230_4": "sleeve_R",
  "Vector 230_5": "sleeve_R",
  "Vector 236_2": "sleeve_R",
  "Vector 233_2": "sleeve_R",
  "Vector 234_2": "sleeve_R",
  "Vector 230_6": "sleeve_R",
  "Vector 232_3": "button_R",
  "Vector 231_3": "button_R",
  "Vector 247_3": "button_R",
};

/** 標準 grading-v4-garment（前面アウトライン）と同じ順序の outline path id（base 無しレガシー規格での対応に使用） */
export const GRADING_V4_STANDARD_REGISTERED_OUTLINE_PATH_IDS: readonly string[] = (() => {
  const omit = new Set<string>(GRADING_V4_GARMENT_BACK_LAYER_IDS);
  return Object.freeze(Object.keys(GRADING_V4_PATH_ZONES).filter((id) => !omit.has(id)));
})();

export type GradingV4GarmentZone =
  | "sleeve_L"
  | "sleeve_R"
  | "body"
  | "collar"
  | "button_L"
  | "button_R";

/** 格子リグ側の landmark（design／ガーメント計測用） */
export const M = {
  cx: 195.504,
  headY: 0,
  neckY: 94.04,
  shY: 117.12,
  shLx: 139.498,
  shRx: 251.496,
  hipY: 287.16,
  hipCY: 274.72,
  footY: 517,
  armTipLx: 1.504,
  armTipLy: 272,
  armTipRx: 389.504,
  armTipRy: 272,
} as const;

export const M_UPPER_H = M.hipY - M.shY;
export const M_LOWER_H = M.footY - M.hipY;
export const ARM_LEN = 207.44;
export const ARM_NY_L = 0.7466;
export const ARM_NX_L = -0.6652;

export const BASE_WEIGHT = 64;
export const CHEST_PX_PER_KG = 0.15;
export const WAIST_PX_PER_KG = 0.25;
export const HIP_PX_PER_KG = 0.2;
export const BODY_HALF_W = 44;

/** Grading v4 開発キャンバス用の下地（商品プレビューでは敷かない） */
export const GRADING_V4_PREVIEW_BG = "#F5F3EF";

/** 格子試着ボディの輪郭 stroke（ウィジェット・コンソール共通） */
export const GRADING_V4_GRID_BODY_SILHOUETTE_STROKE = "#b4b1ac";

/** fragment 由来テンプレの path 本数と一致するときのみ、塗り／線を分けて shoulder 二重線を抑える */
export const GRADING_V4_GRID_BODY_TEMPLATE_PATH_COUNT = BPATHS_GRADING_V4_GRID_SVG_BODY_TEMPLATE.length;

export function gradingV4UsesLayeredGridBodySilhouette(bodyPathCount: number): boolean {
  return bodyPathCount === GRADING_V4_GRID_BODY_TEMPLATE_PATH_COUNT && bodyPathCount > 0;
}

/** 閉路のみ塗り、開いた path は線で形を出す（袖パッチ 1,2 は線を付けず塗りのみ） */
export function gradingV4GridBodyPathEndsClosed(pathD: string): boolean {
  return /[zZ]\s*$/.test(pathD.trim());
}

/** プレビュー・開発ツール・ウィジェット埋め込みでの服アウトライン stroke の下限（meet 縮小後も極細に見えないよう） */
export const GRADING_V4_PREVIEW_GARMENT_MIN_STROKE_WIDTH = 4.35;
