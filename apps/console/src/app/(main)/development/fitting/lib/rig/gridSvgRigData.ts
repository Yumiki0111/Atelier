import { tPath } from "../pathUtils";
import {
  gridModelRigCompoundToNineBodyTemplatePaths,
  gridModelRigCompoundToNineSvgPathDs,
  GRID_MODEL_RIG_STROKE_COMPOUND_D,
} from "./gridModelRigExtract";

/**
 * 格子モデル用 9 本リグ: `Vector (9)` 型 stroke compound（`GRID_MODEL_RIG_STROKE_COMPOUND_D`）を
 * `gridModelRigExtract` で分解し、テンプレ座標へ写像。
 */
const GRID_SVG_RIG_PATHS_TEMPLATE = gridModelRigCompoundToNineBodyTemplatePaths(GRID_MODEL_RIG_STROKE_COMPOUND_D);

export const BPATHS_RIG_LINES_GRID_SVG: string[] = GRID_SVG_RIG_PATHS_TEMPLATE.map((d) => tPath(d, (x, y) => [x, y]));

/** 画像矩形へ貼る用（リグ viewBox 389×519 座標の 9 本） */
export const GRID_RIG_NINE_PATH_DS_SVG = gridModelRigCompoundToNineSvgPathDs(GRID_MODEL_RIG_STROKE_COMPOUND_D);

/** 現行の 9 本は `grid-body-rig.svg` の全リグ線を使うため、可視化 omit はなし。 */
export const GRID_RIG_OVERLAY_OMIT_INDICES: ReadonlySet<number> = new Set();
