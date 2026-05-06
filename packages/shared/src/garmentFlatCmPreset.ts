/** 平置き cm グレード用プリセット ID（商品 garmentSpec・試着計算で共通） */
export const GARMENT_FLAT_CM_PRESET_ID = "garmentFlatCmGrading" as const;

export type GarmentFlatCmPresetId = typeof GARMENT_FLAT_CM_PRESET_ID;

export function isGarmentFlatCmPresetId(id: unknown): id is GarmentFlatCmPresetId {
  return id === GARMENT_FLAT_CM_PRESET_ID;
}
