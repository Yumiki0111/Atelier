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

/** 身幅（脇〜胴側縫）: 肩より水平寄り。真横だけだと体輪郭から離れて見えるため弱い下向き成分を付ける */
const BODY_WIDTH_SLOPE_UY = 0.14;
const BODY_WIDTH_SLOPE_UX = Math.sqrt(1 - BODY_WIDTH_SLOPE_UY ** 2);

export const GARMENT_FLAT_CM_BODY_WIDTH_SLOPE_UNIT_L: ShoulderSlopeUnit = {
  ux: -BODY_WIDTH_SLOPE_UX,
  uy: BODY_WIDTH_SLOPE_UY,
};

export const GARMENT_FLAT_CM_BODY_WIDTH_SLOPE_UNIT_R: ShoulderSlopeUnit = {
  ux: BODY_WIDTH_SLOPE_UX,
  uy: BODY_WIDTH_SLOPE_UY,
};
