import { tPath } from "../pathUtils";
import { GARMENT_FLAT_CM_DOM_RIG_PATH_INDICES_FOR_BPATHS_ORDER } from "../../garmentFlatCmGrading/garmentFlatCmGradingConstants";
import { gridNineSvgPathDsToBodyTemplatePaths } from "./gridModelRigExtract";

/**
 * `model_front (3).svg` の `<g id="rig">` 内 path（**DOM 順**）。
 * 並べ替えは `GARMENT_FLAT_CM_DOM_RIG_PATH_INDICES_FOR_BPATHS_ORDER`（= fitting 9 本 index 契約）。
 *
 * 正本: `apps/console/public/fitting-models/model-front-rig-nine.svg`
 */
export const GRID_MODEL_FRONT_RIG_PATH_DS_DOM_ORDER: readonly string[] = [
  "M194.375 0V294",
  "M165.829 287.16L159.793 517",
  "M165.828 287.16L194.407 274.72",
  "M222.906 287.16L228.942 517",
  "M222.907 287.16L194.328 274.72",
  "M250.367 117.12L388.375 272",
  "M138.371 117.12L194.37 94.04",
  "M250.366 117.12L194.367 94.04",
  "M138.369 117.12L0.375 272",
] as const;

/** 画像矩形へ貼る用（リグ viewBox 389×525 座標の 9 本・model_front と同一） */
export const GRID_RIG_NINE_PATH_DS_SVG: string[] =
  GARMENT_FLAT_CM_DOM_RIG_PATH_INDICES_FOR_BPATHS_ORDER.map(
    (domIdx) => GRID_MODEL_FRONT_RIG_PATH_DS_DOM_ORDER[domIdx]!
  );

/**
 * 格子モデル用 9 本リグ（ボディテンプレ座標）。`GRID_RIG_NINE_PATH_DS_SVG` を等方写像。
 * compound 分解は hip の向きが model_front と逆になるため使わない。
 */
const GRID_SVG_RIG_PATHS_TEMPLATE = gridNineSvgPathDsToBodyTemplatePaths(GRID_RIG_NINE_PATH_DS_SVG);

export const BPATHS_RIG_LINES_GRID_SVG: string[] = GRID_SVG_RIG_PATHS_TEMPLATE.map((d) => tPath(d, (x, y) => [x, y]));

/** 現行の 9 本は `model-front-rig-nine.svg` の全リグ線を使うため、可視化 omit はなし。 */
export const GRID_RIG_OVERLAY_OMIT_INDICES: ReadonlySet<number> = new Set();
