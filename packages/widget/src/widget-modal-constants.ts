import { WIDGET_DESIGN_INTERFACE_BG_DEFAULT } from "@Atelier/shared";

/** コンソール `WidgetPreviewChrome` の `PREVIEW_SURFACE_BG` と同じ（グレー帯で上下が透けないようにする） */
export const SURFACE_BG = WIDGET_DESIGN_INTERFACE_BG_DEFAULT;

/** 体型スライダー初期（`weightKgFromBodyVal` と @Atelier/shared のプレビューと同じ・~53kg 相当） */
export const DEFAULT_FIT_BODY_VAL = 9;

/** アプリ側 `BPATHS_GARMENT_FLAT_CM_GRID_SVG_BODY_TEMPLATE.length` と同期（格子ボディ塗り／線レイヤーの切替に使用） */
export const GARMENT_FLAT_CM_GRID_BODY_TEMPLATE_PATH_COUNT = 22;

/** アプリ側 `BPATHS_GARMENT_FLAT_CM_GRID_SVG_BODY_BACK_TEMPLATE.length` と同期 */
export const GARMENT_FLAT_CM_GRID_BODY_BACK_TEMPLATE_PATH_COUNT = 21;

/** アプリ側 `garmentFlatCmGradingConstants` と同期（前面イラスト＋末尾リグ線） */
export const GARMENT_FLAT_CM_GRID_BODY_ILLUSTRATED_FRONT_PATH_TOTAL = 22;
export const GARMENT_FLAT_CM_GRID_BODY_ILLUSTRATED_BACK_PATH_TOTAL = 21;
export const GARMENT_FLAT_CM_GRID_BODY_ILLUSTRATED_FRONT_RIG_TAIL_PATHS = 9;
export const GARMENT_FLAT_CM_GRID_BODY_ILLUSTRATED_SKIN_FILL = "#FFFAF7";

/** アプリ側 `garmentFlatCmGridBodyFillLayerPaint` と同一ロジック */
export function garmentFlatCmGridBodyFillLayerPaint(
  pathD: string,
  pathIdx: number,
  pathTotal: number,
  canvasBg: string
): string {
  const closed = /[zZ]\s*$/.test(pathD.trim());
  const illustrated =
    (pathTotal === GARMENT_FLAT_CM_GRID_BODY_ILLUSTRATED_FRONT_PATH_TOTAL ||
      pathTotal === GARMENT_FLAT_CM_GRID_BODY_ILLUSTRATED_BACK_PATH_TOTAL) &&
    pathIdx < pathTotal - GARMENT_FLAT_CM_GRID_BODY_ILLUSTRATED_FRONT_RIG_TAIL_PATHS &&
    closed;
  if (illustrated) {
    return GARMENT_FLAT_CM_GRID_BODY_ILLUSTRATED_SKIN_FILL;
  }
  return closed ? canvasBg : "none";
}

/** アプリ側 `garmentFlatCmGridBodyLayeredOutlinePathAfterFirst` と同一 */
export function garmentFlatCmGridBodyLayeredOutlinePathAfterFirst(
  pathD: string,
  pathIdx: number,
  pathTotal: number
): boolean {
  if (pathIdx < 1) return false;
  const closed = /[zZ]\s*$/.test(pathD.trim());
  const illustrated =
    pathTotal === GARMENT_FLAT_CM_GRID_BODY_ILLUSTRATED_FRONT_PATH_TOTAL ||
    pathTotal === GARMENT_FLAT_CM_GRID_BODY_ILLUSTRATED_BACK_PATH_TOTAL;
  if (illustrated && pathIdx >= pathTotal - GARMENT_FLAT_CM_GRID_BODY_ILLUSTRATED_FRONT_RIG_TAIL_PATHS) {
    return false;
  }
  if (!closed) return true;
  return illustrated && pathIdx < pathTotal - GARMENT_FLAT_CM_GRID_BODY_ILLUSTRATED_FRONT_RIG_TAIL_PATHS;
}

/** アプリ側 `garmentFlatCmGradingConstants.ts` の `GARMENT_FLAT_CM_GRID_BODY_SILHOUETTE_STROKE` と同値 */
export const GARMENT_FLAT_CM_GRID_BODY_SILHOUETTE_STROKE = "#b4b1ac";

/** アプリ `garmentFlatCmGradingConstants.ts` の `garmentFlatCmGridBodyPathEndsClosed` と同一 */
export function garmentFlatCmGridBodyPathEndsClosed(pathD: string): boolean {
  return /[zZ]\s*$/.test(pathD.trim());
}
