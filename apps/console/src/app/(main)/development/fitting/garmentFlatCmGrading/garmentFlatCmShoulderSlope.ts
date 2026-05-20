type ShoulderSlopeUnit = {
  ux: number;
  uy: number;
};

const SHOULDER_SLOPE_UY = 0.38;
const SHOULDER_SLOPE_UX = Math.sqrt(1 - SHOULDER_SLOPE_UY ** 2);

/**
 * 左右肩スロープ方向の単位ベクトル。
 * +Y は下方向、左右で X の符号のみ反転する。
 */
export const GARMENT_FLAT_CM_SHOULDER_SLOPE_UNIT_L: ShoulderSlopeUnit = {
  ux: -SHOULDER_SLOPE_UX,
  uy: SHOULDER_SLOPE_UY,
};

export const GARMENT_FLAT_CM_SHOULDER_SLOPE_UNIT_R: ShoulderSlopeUnit = {
  ux: SHOULDER_SLOPE_UX,
  uy: SHOULDER_SLOPE_UY,
};
