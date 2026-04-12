import type { CustomGarmentData } from "../lib/types";
import { GENERIC_DEV_PLACEHOLDER_LANDMARKS, GENERIC_EMPTY_SIZE } from "./genericDevDefaults";

export type GenericSymmetricTopSizeKey = "3" | "4" | "5";

/**
 * 汎用トップの初期状態（path 空・採寸は未入力）。アップロードで pathDs・ランドマークが入る。
 * 参照寸法のテンプレは `genericTopSizeForKey`（`GENERIC_TOP_SIZE_BY_KEY`）。
 */
export function getGenericSymmetricTopPreset(): CustomGarmentData {
  return {
    pathDs: [],
    landmarks: { ...GENERIC_DEV_PLACEHOLDER_LANDMARKS },
    size: { ...GENERIC_EMPTY_SIZE },
    photoDerived: false,
    presetId: "genericSymmetricTop",
    genericSymmetricTop: {
      applied: false,
      /** 行の追加はパネルで行う。旧ブローゾン表相当の 3/4/5 行は `genericTopSizePresets()` で生成可能 */
      sizePresets: [],
    },
  };
}
