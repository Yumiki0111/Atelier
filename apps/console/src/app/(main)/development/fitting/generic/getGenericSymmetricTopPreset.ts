import type { CustomGarmentData } from "../lib/types";
import {
  GENERIC_DEV_PLACEHOLDER_LANDMARKS,
  genericTopSizeForKey,
  genericTopSizePresets,
} from "./genericDevDefaults";

export type GenericSymmetricTopSizeKey = "3" | "4" | "5";

/**
 * 汎用トップの初期状態（path 空）。アップロードで pathDs・ランドマークが入る。
 */
export function getGenericSymmetricTopPreset(sizeKey: GenericSymmetricTopSizeKey = "4"): CustomGarmentData {
  return {
    pathDs: [],
    landmarks: { ...GENERIC_DEV_PLACEHOLDER_LANDMARKS },
    size: genericTopSizeForKey(sizeKey),
    photoDerived: false,
    presetId: "genericSymmetricTop",
    genericSymmetricTop: {
      applied: false,
      sizePresets: genericTopSizePresets(),
    },
  };
}
