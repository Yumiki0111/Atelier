import type { CustomGarmentData, CustomLandmarks, ScalableGarmentSpec } from "../types";
import type { TopLandmarks } from "../garmentBase";
import type { ArmLogicConfig } from "../coatArmLogic";

/** 旧ブローゾン経路は廃止。汎用トップは `resolveGenericScalableSpec` を使用 */
export function getScalableSpec(
  _pathDs: string[],
  _presetId?: CustomGarmentData["presetId"]
): ScalableGarmentSpec | null {
  return null;
}

export function shouldApplyScaleScaling(_data: CustomGarmentData): boolean {
  return false;
}

export function getArmLogicConfig(_data: CustomGarmentData): ArmLogicConfig | null {
  return null;
}

/** sessionStorage['DEBUG_ARM_LOGIC']=1 で有効。コンソールに腕ロジックの分岐を出す */
export function debugArmLogic(label: string, data: Record<string, unknown>): void {
  if (typeof sessionStorage !== "undefined" && sessionStorage.getItem("DEBUG_ARM_LOGIC") === "1") {
    console.log(`[ARM_LOGIC] ${label}`, data);
  }
}

/** CustomLandmarks を garmentBase の TopLandmarks に変換（pit は肩と同じでよい） */
export function toTopLandmarks(c: CustomLandmarks): TopLandmarks {
  return {
    shoulderY: c.shoulderY,
    shoulderLx: c.shoulderLx,
    shoulderRx: c.shoulderRx,
    pitY: c.shoulderY,
    pitLx: c.shoulderLx,
    pitRx: c.shoulderRx,
    hemY: c.hemY,
    hemCx: c.hemCx,
    ...(c.garmentLengthOverride != null ? { garmentLengthOverride: c.garmentLengthOverride } : {}),
    ...(c.bodyShoulderOffsetY != null ? { bodyShoulderOffsetY: c.bodyShoulderOffsetY } : {}),
    ...(c.totalWidth != null ? { totalWidth: c.totalWidth } : {}),
    ...(c.maxWidthRatio != null ? { maxWidthRatio: c.maxWidthRatio } : {}),
  };
}
