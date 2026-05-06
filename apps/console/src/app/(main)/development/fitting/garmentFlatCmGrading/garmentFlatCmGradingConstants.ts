/** S サイズ基準座標・グレードルール（HTML プロトタイプ相当） */

import type { BodyModelVariant } from "../lib/bodyModelVariant";
import {
  BPATHS_GARMENT_FLAT_CM_GRID_SVG_BODY_TEMPLATE,
  BPATHS_GARMENT_FLAT_CM_GRID_SVG_BODY_BACK_TEMPLATE,
} from "./garmentFlatCmGradingGridBodyTemplate.generated";

export const GARMENT_FLAT_CM_VIEWBOX = "0 0 389 525";

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

export type FlatCmSizeKey = keyof typeof SIZE_STEPS;

/**
 * Group 126 (5) 系: 試着表示でボディより下（背面）にだけ描く線。マスクは使わず積み順のみ。
 */
export const GARMENT_FLAT_CM_BACK_LAYER_IDS = [
  "back-stroke",
  "back-stroke_2",
  "back-stroke_3",
  "back-stroke_4",
  "back-stroke_5",
] as const;

export type GarmentFlatCmZone =
  | "sleeve_L"
  | "sleeve_R"
  | "body"
  | "collar"
  | "button_L"
  | "button_R";

/**
 * 背面 `back-stroke*` だけ path id フォールバックが必要なケース（前面から切り取りシリアライズすると祖先 `<g>` を失う）。
 * それ以外のゾーンは SVG の `<g id="sleeve_L"|"sleeve_R"|"body"|"collar"|"button_L"|"button_R"|"button_R_detail">` と
 * `flatCmOutlinePathZones` / `extractFlatCmBaseGarmentSlicesFromMarkup` に委ねる。
 */
export const GARMENT_FLAT_CM_PATH_ZONES: Record<string, GarmentFlatCmZone> = {
  "back-stroke": "sleeve_L",
  "back-stroke_2": "body",
  "back-stroke_3": "body",
  "back-stroke_4": "body",
  "back-stroke_5": "sleeve_R",
};

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

/** 平置き cm グレード開発キャンバス用の下地（商品プレビューでは敷かない） */
export const GARMENT_FLAT_CM_PREVIEW_BG = "#F5F3EF";

/** Fitting 開発ツール UI の共通カラーパレット */
export const GARMENT_FLAT_CM_FITTING_COLORS = {
  ink: "#1A1A18",
  rule: "#D8D4CC",
  accent: "#C8432A",
  muted: "#9A9590",
  panel: "#EDEAE4",
} as const;

/** 格子試着ボディの輪郭 stroke（ウィジェット・コンソール共通） */
export const GARMENT_FLAT_CM_GRID_BODY_SILHOUETTE_STROKE = "#b4b1ac";

/** fragment 由来テンプレの path 本数と一致するときのみ、塗り／線を分けて shoulder 二重線を抑える */
export const GARMENT_FLAT_CM_GRID_BODY_TEMPLATE_PATH_COUNT = BPATHS_GARMENT_FLAT_CM_GRID_SVG_BODY_TEMPLATE.length;
export const GARMENT_FLAT_CM_GRID_BODY_BACK_TEMPLATE_PATH_COUNT = BPATHS_GARMENT_FLAT_CM_GRID_SVG_BODY_BACK_TEMPLATE.length;

/**
 * 背面テンプレで stroke を描かない path index（専用シルエット SVG では未使用）。
 * 前面ミラー生成時はガイド線 index をここに追加する。
 */
export const GARMENT_FLAT_CM_GRID_BODY_BACK_GUIDE_ONLY_STROKE_PATH_INDICES: ReadonlySet<number> =
  new Set();

/** 格子ボディシルエットの stroke 描画を省略する path index（背面ガイド線） */
export function garmentFlatCmOmitGridBodySilhouetteStroke(
  pathIndex: number,
  bodyModelVariant: BodyModelVariant | null | undefined
): boolean {
  if (bodyModelVariant !== "gridSvgBodyBack") return false;
  return GARMENT_FLAT_CM_GRID_BODY_BACK_GUIDE_ONLY_STROKE_PATH_INDICES.has(pathIndex);
}

export function garmentFlatCmUsesLayeredGridBodySilhouette(bodyPathCount: number): boolean {
  if (bodyPathCount <= 0) return false;
  return (
    bodyPathCount === GARMENT_FLAT_CM_GRID_BODY_TEMPLATE_PATH_COUNT ||
    bodyPathCount === GARMENT_FLAT_CM_GRID_BODY_BACK_TEMPLATE_PATH_COUNT
  );
}

/**
 * 背面ビューの `back-stroke*` を格子ボディと同じ見た目にする（下地＝`canvasSurfaceBg`・線＝輪郭色）。
 * 開いた path は塗りが効かず線色のみが視認される。
 */
export function garmentFlatCmPaintBehindStrokeMatchGridBody(
  paint: { fill: string; stroke: string; strokeWidth: number },
  canvasSurfaceBg: string,
  silhouetteStroke: string
): { fill: string; stroke: string; strokeWidth: number } {
  const stroked =
    Number.isFinite(paint.strokeWidth) &&
    paint.strokeWidth > 0 &&
    paint.stroke !== "none" &&
    paint.stroke.trim() !== "";
  return {
    fill: canvasSurfaceBg,
    stroke: stroked ? silhouetteStroke : "none",
    strokeWidth: stroked ? paint.strokeWidth : 0,
  };
}

/** 閉路のみ塗り、開いた path は線で形を出す（袖パッチ 1,2 は線を付けず塗りのみ） */
export function garmentFlatCmGridBodyPathEndsClosed(pathD: string): boolean {
  return /[zZ]\s*$/.test(pathD.trim());
}

/**
 * イラスト系前面テンプレ（`grid-body-silhouette-path-source.svg` / model_front）契約。
 * `<path>` 出現順の先頭が肌塗り、末尾が黒構築線。
 */
export const GARMENT_FLAT_CM_GRID_BODY_ILLUSTRATED_FRONT_PATH_TOTAL = 22;
/**
 * イラスト系背面テンプレ（`grid-body-back-silhouette-path-source.svg` / model_back）契約。
 * 前面よりイラスト 1 本少なく、末尾 9 本の構築線は共通。
 */
export const GARMENT_FLAT_CM_GRID_BODY_ILLUSTRATED_BACK_PATH_TOTAL = 21;
/** 末尾 N 本は構築線（線画レイヤー・肌レイヤーでは `none`／キャンバス同色パッチしない） */
export const GARMENT_FLAT_CM_GRID_BODY_ILLUSTRATED_FRONT_RIG_TAIL_PATHS = 9;
export const GARMENT_FLAT_CM_GRID_BODY_ILLUSTRATED_SKIN_FILL = "#FFFAF7";

/** レイヤ「塗り」で使う solid。既定テンプレは閉路＝キャンバス同色、イラスト系は閉路の一部を肌色にする */
export function garmentFlatCmGridBodyFillLayerPaint(
  pathD: string,
  pathIdx: number,
  pathTotal: number,
  canvasBg: string
): string {
  const illustrated =
    (pathTotal === GARMENT_FLAT_CM_GRID_BODY_ILLUSTRATED_FRONT_PATH_TOTAL ||
      pathTotal === GARMENT_FLAT_CM_GRID_BODY_ILLUSTRATED_BACK_PATH_TOTAL) &&
    pathIdx < pathTotal - GARMENT_FLAT_CM_GRID_BODY_ILLUSTRATED_FRONT_RIG_TAIL_PATHS &&
    garmentFlatCmGridBodyPathEndsClosed(pathD);
  if (illustrated) {
    return GARMENT_FLAT_CM_GRID_BODY_ILLUSTRATED_SKIN_FILL;
  }
  return garmentFlatCmGridBodyPathEndsClosed(pathD) ? canvasBg : "none";
}

/**
 * レイヤード格子ボディの線レイヤーに載せる path か（index 1 以降。0 は呼び出し側で別描画）。
 * 開路は従来どおり載せる。閉路はイラスト先頭ブロックのみ載せる（塗り分割で消えていた区切り線を復元）。
 */
export function garmentFlatCmGridBodyLayeredOutlinePathAfterFirst(
  pathD: string,
  pathIdx: number,
  pathTotal: number,
  bodyModelVariant?: BodyModelVariant | null
): boolean {
  if (pathIdx < 1) return false;
  if (garmentFlatCmOmitGridBodySilhouetteStroke(pathIdx, bodyModelVariant)) return false;
  const illustrated =
    pathTotal === GARMENT_FLAT_CM_GRID_BODY_ILLUSTRATED_FRONT_PATH_TOTAL ||
    pathTotal === GARMENT_FLAT_CM_GRID_BODY_ILLUSTRATED_BACK_PATH_TOTAL;
  if (illustrated && pathIdx >= pathTotal - GARMENT_FLAT_CM_GRID_BODY_ILLUSTRATED_FRONT_RIG_TAIL_PATHS) {
    return false;
  }
  if (!garmentFlatCmGridBodyPathEndsClosed(pathD)) return true;
  return illustrated && pathIdx < pathTotal - GARMENT_FLAT_CM_GRID_BODY_ILLUSTRATED_FRONT_RIG_TAIL_PATHS;
}

/** 明示 stroke-width がない平置き cm ガーメント path 向け既定（ユーザー単位） */
export const GARMENT_FLAT_CM_PREVIEW_GARMENT_DEFAULT_STROKE_WIDTH = 1.25;

/**
 * meet 縮小や淡いキャンバスでも輪郭が潰れにくいよう、フォールバック線色をやや濃く。
 * （`previewGarmentStrokeFallback` とウィジェット embed の defaultStroke と連動）
 */
export const GARMENT_FLAT_CM_PREVIEW_GARMENT_STROKE_FALLBACK = "rgba(26,26,26,0.97)";

/** プレビュー・開発ツール・ウィジェット埋め込みでの服アウトライン stroke の下限（meet 縮小後も極細に見えないよう） */
export const GARMENT_FLAT_CM_PREVIEW_GARMENT_MIN_STROKE_WIDTH = 5.05;
