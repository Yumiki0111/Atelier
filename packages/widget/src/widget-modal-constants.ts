import { WIDGET_DESIGN_INTERFACE_BG_DEFAULT } from "@Atelier/shared";

/** コンソール `WidgetPreviewChrome` の `PREVIEW_SURFACE_BG` と同じ（グレー帯で上下が透けないようにする） */
export const SURFACE_BG = WIDGET_DESIGN_INTERFACE_BG_DEFAULT;

/** 体型スライダー初期（`weightKgFromBodyVal` と @Atelier/shared のプレビューと同じ） */
export const DEFAULT_FIT_BODY_VAL = 25;

/** アプリ `BPATHS_GRADING_V4_GRID_SVG_BODY_TEMPLATE.length` と同期（格子ボディ塗り／線レイヤーの切替に使用） */
export const GRADING_V4_GRID_BODY_TEMPLATE_PATH_COUNT = 16;

/** アプリ `gradingV4Constants.gradingV4GridBodyPathEndsClosed` と同一 */
export function gradingV4GridBodyPathEndsClosed(pathD: string): boolean {
  return /[zZ]\s*$/.test(pathD.trim());
}
