import {
  BDY_L_X,
  BDY_R_X,
  BODY_BOT,
  BODY_TOP,
  SH_L_X,
  SH_R_X,
  type GradingV4SizeKey,
} from "./gradingV4Constants";

/** 平置き採寸（cm）。肩幅・身幅は衣類の標準的な平置き値。 */
export type GradingV4GarmentFlatCm = {
  shoulder: number;
  bodyWidth: number;
  bodyLength: number;
  sleeve: number;
};

/** SVG 基準（S）に合わせた目安平置き cm。袖丈は肩〜袖口の実寸オーダー（旧プリとは別スケール → ストレージ移行あり）。 */
export const GRADING_V4_BASE_FLAT_CM: GradingV4GarmentFlatCm = {
  shoulder: 44,
  bodyWidth: 48,
  bodyLength: 68,
  sleeve: 62,
};

/** 旧 v1 で S 基準に使っていた袖丈（cm）。保存済みプリセットの加算移行に使用 */
const GRADING_V4_LEGACY_BASE_SLEEVE_CM_V1 = 21;

/** 旧プリ（袖〜30cm 台）→ 実寸スケールへの加算 */
export const GRADING_V4_LEGACY_SLEEVE_CM_OFFSET =
  GRADING_V4_BASE_FLAT_CM.sleeve - GRADING_V4_LEGACY_BASE_SLEEVE_CM_V1;

/**
 * 肩幅・身幅: 平置き数値をそのまま px 換算すると試着見えで横に伸び過ぎるため、
 * 差分に対してこの係数を掛けてcanvas上の広がりを抑える。
 */
export const GRADING_V4_WEAR_DISPLAY_SHOULDER = 0.72;
export const GRADING_V4_WEAR_DISPLAY_BODY = 0.72;
/** 袖は弧のため着丈と同じ軸で換算すると図上で胴に対して長く出やすいので差分を抑える */
export const GRADING_V4_WEAR_DISPLAY_SLEEVE = 0.55;

export const GRADING_V4_GARMENT_CM_STORAGE_KEY = "grading-v4-garment-flat-cm-v1";

const REF_SHOULDER_PX = SH_R_X - SH_L_X;
const REF_BODY_PX = BDY_R_X - BDY_L_X;
const REF_LENGTH_PX = BODY_BOT - BODY_TOP;

/** 袖丈: S・着丈68cm 時の目安（実効値は着丈入力で変わる → gradingV4SleeveEffectivePxPerCm） */
export const GRADING_V4_SLEEVE_PX_PER_CM =
  (REF_LENGTH_PX / GRADING_V4_BASE_FLAT_CM.bodyLength) * GRADING_V4_WEAR_DISPLAY_SLEEVE;

/** 着丈（cm）に応じた袖→弧長の実効 px/cm（試着見え込み） */
export function gradingV4SleeveEffectivePxPerCm(bodyLengthCm: number): number {
  const bl = Math.max(bodyLengthCm, 1e-6);
  return (REF_LENGTH_PX / bl) * GRADING_V4_WEAR_DISPLAY_SLEEVE;
}

/** ウィジェット・プレビューのサイズチップ順（小→大） */
export const GRADING_V4_ORDERED_SIZE_LABELS: readonly GradingV4SizeKey[] = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
] as const;

/** 各サイズの固定平置き（登録・プリセット用） */
export const GRADING_V4_SIZE_FLAT_CM: Record<GradingV4SizeKey, GradingV4GarmentFlatCm> = {
  XS: { shoulder: 42, bodyWidth: 46, bodyLength: 64, sleeve: 59 },
  S: { ...GRADING_V4_BASE_FLAT_CM },
  M: { shoulder: 46, bodyWidth: 50, bodyLength: 71, sleeve: 65 },
  L: { shoulder: 48, bodyWidth: 52, bodyLength: 74, sleeve: 68 },
  XL: { shoulder: 50, bodyWidth: 54, bodyLength: 77, sleeve: 71 },
  XXL: { shoulder: 52, bodyWidth: 56, bodyLength: 80, sleeve: 74 },
};

/**
 * 平置きcm → グレーディングエンジンの d*（基準はSVGのSサイズ形状 = BASE_FLAT_CM）。
 * px 換算: 参照スパン / 基準cm（肩・身幅・袖は着用見え補正あり、着丈は補正なし）。
 * 袖: Δpx = (input.sleeve − base.sleeve) × (REF_LENGTH÷着丈入力cm) × wearSleeve。base.sleeve は S 形状の絶対目標寸法（cm の二重加算なし）。
 */
export function garmentFlatCmToGradeDeltas(
  input: GradingV4GarmentFlatCm,
  base: GradingV4GarmentFlatCm = GRADING_V4_BASE_FLAT_CM,
  wearShoulder: number = GRADING_V4_WEAR_DISPLAY_SHOULDER,
  wearBody: number = GRADING_V4_WEAR_DISPLAY_BODY,
  wearSleeve: number = GRADING_V4_WEAR_DISPLAY_SLEEVE
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

/** 計測線から概算平置きcm（参考表示。肩・身幅は逆補正しない素の換算） */
export function gradeDeltasToApproxFlatCm(params: {
  dSh: number;
  dBw: number;
  dBl: number;
  dSleeveLengthPx: number;
  base?: GradingV4GarmentFlatCm;
  wearShoulder?: number;
  wearBody?: number;
  wearSleeve?: number;
}): GradingV4GarmentFlatCm {
  const base = params.base ?? GRADING_V4_BASE_FLAT_CM;
  const wearS = params.wearShoulder ?? GRADING_V4_WEAR_DISPLAY_SHOULDER;
  const wearB = params.wearBody ?? GRADING_V4_WEAR_DISPLAY_BODY;
  const wearSl = params.wearSleeve ?? GRADING_V4_WEAR_DISPLAY_SLEEVE;

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

const SIZE_KEYS: GradingV4SizeKey[] = ["XS", "S", "M", "L", "XL", "XXL"];

export function matchGarmentFlatCmToPreset(
  cm: GradingV4GarmentFlatCm,
  eps = 0.08
): GradingV4SizeKey | null {
  for (const k of SIZE_KEYS) {
    const p = GRADING_V4_SIZE_FLAT_CM[k];
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
