import {
  BDY_L_X,
  BDY_R_X,
  BODY_BOT,
  BODY_TOP,
  SH_L_X,
  SH_R_X,
  type FlatCmSizeKey,
} from "./garmentFlatCmGradingConstants";

/** 平置き採寸（cm）。肩幅・身幅は衣類の標準的な平置き値。 */
export type GarmentFlatCm = {
  shoulder: number;
  bodyWidth: number;
  bodyLength: number;
  sleeve: number;
};

/** SVG 基準（S）に合わせた目安平置き cm。袖丈は肩〜袖口の実寸オーダー（旧プリとは別スケール → ストレージ移行あり）。 */
export const GARMENT_FLAT_CM_BASE: GarmentFlatCm = {
  shoulder: 44,
  bodyWidth: 48,
  bodyLength: 68,
  sleeve: 62,
};

/** 旧 v1 で S 基準に使っていた袖丈（cm）。保存済みプリセットの加算移行に使用 */
const GARMENT_FLAT_CM_LEGACY_BASE_SLEEVE_CM_V1 = 21;

/** 旧プリ（袖〜30cm 台）→ 実寸スケールへの加算 */
export const GARMENT_FLAT_CM_LEGACY_SLEEVE_CM_OFFSET =
  GARMENT_FLAT_CM_BASE.sleeve - GARMENT_FLAT_CM_LEGACY_BASE_SLEEVE_CM_V1;

/**
 * 肩幅・身幅: 平置き数値をそのまま px 換算すると試着見えで横に伸び過ぎるため、
 * 差分に対してこの係数を掛けてcanvas上の広がりを抑える。
 */
export const GARMENT_FLAT_CM_WEAR_DISPLAY_SHOULDER = 0.72;
export const GARMENT_FLAT_CM_WEAR_DISPLAY_BODY = 0.56;
/** 袖は弧のため着丈と同じ軸で換算すると図上で胴に対して長く出やすいので差分を抑える */
export const GARMENT_FLAT_CM_WEAR_DISPLAY_SLEEVE = 0.55;

const REF_SHOULDER_PX = SH_R_X - SH_L_X;
const REF_BODY_PX = BDY_R_X - BDY_L_X;
const REF_LENGTH_PX = BODY_BOT - BODY_TOP;

/** 袖丈: S・着丈68cm 時の目安（実効値は着丈入力で変わる → garmentFlatCmSleeveEffectivePxPerCm） */
export const GARMENT_FLAT_CM_SLEEVE_PX_PER_CM =
  (REF_LENGTH_PX / GARMENT_FLAT_CM_BASE.bodyLength) * GARMENT_FLAT_CM_WEAR_DISPLAY_SLEEVE;

/** 着丈（cm）に応じた袖→弧長の実効 px/cm（試着見え込み） */
export function garmentFlatCmSleeveEffectivePxPerCm(bodyLengthCm: number): number {
  const bl = Math.max(bodyLengthCm, 1e-6);
  return (REF_LENGTH_PX / bl) * GARMENT_FLAT_CM_WEAR_DISPLAY_SLEEVE;
}

/** ウィジェット・プレビューのサイズチップ順（小→大） */
export const GARMENT_FLAT_CM_ORDERED_SIZE_LABELS: readonly FlatCmSizeKey[] = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
] as const;

/** 各サイズの固定平置き（登録・プリセット用） */
export const GARMENT_FLAT_CM_SIZE_TABLE: Record<FlatCmSizeKey, GarmentFlatCm> = {
  XS: { shoulder: 42, bodyWidth: 46, bodyLength: 64, sleeve: 59 },
  S: { ...GARMENT_FLAT_CM_BASE },
  M: { shoulder: 46, bodyWidth: 50, bodyLength: 71, sleeve: 65 },
  L: { shoulder: 48, bodyWidth: 52, bodyLength: 74, sleeve: 68 },
  XL: { shoulder: 50, bodyWidth: 54, bodyLength: 77, sleeve: 71 },
  XXL: { shoulder: 52, bodyWidth: 56, bodyLength: 80, sleeve: 74 },
};

/**
 * 平置き cm → path 変形用の d*（基準は SVG の S サイズ形状 = BASE）。
 * px 換算: 参照スパン / 基準 cm（肩・身幅・袖は着用見え補正あり、着丈は補正なし）。
 * 袖: Δpx = (input.sleeve − base.sleeve) × (REF_LENGTH÷着丈入力 cm) × wearSleeve。
 */
export function garmentFlatCmToShapeDeltas(
  input: GarmentFlatCm,
  base: GarmentFlatCm = GARMENT_FLAT_CM_BASE,
  wearShoulder: number = GARMENT_FLAT_CM_WEAR_DISPLAY_SHOULDER,
  wearBody: number = GARMENT_FLAT_CM_WEAR_DISPLAY_BODY,
  wearSleeve: number = GARMENT_FLAT_CM_WEAR_DISPLAY_SLEEVE
): { dSh: number; dBw: number; dBl: number; dSleeveLengthPx: number } {
  const pxPerCmShoulder = REF_SHOULDER_PX / base.shoulder;
  const pxPerCmBody = REF_BODY_PX / base.bodyWidth;
  const pxPerCmLength = REF_LENGTH_PX / base.bodyLength;
  const pxPerCmSleeveAxis = REF_LENGTH_PX / Math.max(input.bodyLength, 1e-6);

  const dShoulderFullPx = (input.shoulder - base.shoulder) * pxPerCmShoulder * wearShoulder;
  const dSh = dShoulderFullPx / 2;

  const dBodyFullPx = (input.bodyWidth - base.bodyWidth) * pxPerCmBody * wearBody;
  const dBw = dBodyFullPx / 2;

  const dBl = (input.bodyLength - base.bodyLength) * pxPerCmLength;

  const dSleeveLengthPx = (input.sleeve - base.sleeve) * pxPerCmSleeveAxis * wearSleeve;

  return { dSh, dBw, dBl, dSleeveLengthPx };
}

/** 未グレード SVG（S）基準 → 目標 cm（開発・プレビュー・登録で共通） */
export function garmentFlatCmShapeDeltasFromBase(targetCm: GarmentFlatCm) {
  return garmentFlatCmToShapeDeltas(targetCm, GARMENT_FLAT_CM_BASE);
}

/** `size`（DB / spec）→ 平置き cm */
export function garmentFlatCmFromCustomGarmentSize(data: {
  size: { shoulder: number; chest: number; length: number; sleeve: number };
}): GarmentFlatCm {
  return {
    shoulder: data.size.shoulder,
    bodyWidth: data.size.chest,
    bodyLength: data.size.length,
    sleeve: data.size.sleeve,
  };
}

/** 計測線から概算平置き cm（参考表示。肩・身幅は逆補正しない素の換算） */
export function shapeDeltasToApproxGarmentFlatCm(params: {
  dSh: number;
  dBw: number;
  dBl: number;
  dSleeveLengthPx: number;
  base?: GarmentFlatCm;
  wearShoulder?: number;
  wearBody?: number;
  wearSleeve?: number;
}): GarmentFlatCm {
  const base = params.base ?? GARMENT_FLAT_CM_BASE;
  const wearS = params.wearShoulder ?? GARMENT_FLAT_CM_WEAR_DISPLAY_SHOULDER;
  const wearB = params.wearBody ?? GARMENT_FLAT_CM_WEAR_DISPLAY_BODY;
  const wearSl = params.wearSleeve ?? GARMENT_FLAT_CM_WEAR_DISPLAY_SLEEVE;

  const pxPerCmShoulder = REF_SHOULDER_PX / base.shoulder;
  const pxPerCmBody = REF_BODY_PX / base.bodyWidth;
  const pxPerCmLength = REF_LENGTH_PX / base.bodyLength;

  const dFullShPx = params.dSh * 2;
  const dFullBwPx = params.dBw * 2;

  const shoulder =
    wearS > 0 ? base.shoulder + dFullShPx / (pxPerCmShoulder * wearS) : base.shoulder;
  const bodyWidth =
    wearB > 0 ? base.bodyWidth + dFullBwPx / (pxPerCmBody * wearB) : base.bodyWidth;
  const bodyLength = base.bodyLength + params.dBl / pxPerCmLength;
  const pxPerCmSleeveAxis = REF_LENGTH_PX / Math.max(bodyLength, 1e-6);
  const sleeve =
    wearSl > 0
      ? base.sleeve + params.dSleeveLengthPx / (pxPerCmSleeveAxis * wearSl)
      : base.sleeve;

  return {
    shoulder: Math.round(shoulder * 10) / 10,
    bodyWidth: Math.round(bodyWidth * 10) / 10,
    bodyLength: Math.round(bodyLength * 10) / 10,
    sleeve: Math.round(sleeve * 10) / 10,
  };
}

const SIZE_KEYS: FlatCmSizeKey[] = ["XS", "S", "M", "L", "XL", "XXL"];

export function matchGarmentFlatCmToPreset(cm: GarmentFlatCm, eps = 0.08): FlatCmSizeKey | null {
  for (const k of SIZE_KEYS) {
    const p = GARMENT_FLAT_CM_SIZE_TABLE[k];
    if (
      Math.abs(cm.shoulder - p.shoulder) < eps &&
      Math.abs(cm.bodyWidth - p.bodyWidth) < eps &&
      Math.abs(cm.bodyLength - p.bodyLength) < eps &&
      Math.abs(cm.sleeve - p.sleeve) < eps
    ) {
      return k;
    }
  }
  return null;
}
