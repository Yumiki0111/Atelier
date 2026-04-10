import { BZ, REF_WEIGHT_KG } from "@/app/(main)/development/fitting/lib/constants";
import { calcFitFromSize } from "@/app/(main)/development/fitting/lib/fitCalc";
import type { FittingCanvasSnapshot } from "@/lib/fitting-compute/fittingCanvasComputeTypes";

/** 基準体型（170/60）相当の参考肩幅 cm。`constants` のボディ肩 px と整合 */
const REF_BODY_SHOULDER_WIDTH_CM = 47;

const BODY_TEMPLATE_SPAN = BZ.foot - BZ.head_top;
const CROTCH_Y_FRAC = (BZ.crotch - BZ.head_top) / BODY_TEMPLATE_SPAN;

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function fmtSignedCm(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const r = round1(n);
  const abs = Math.abs(r);
  const s = abs % 1 === 0 ? String(abs) : abs.toFixed(1);
  return (r > 0 ? "+" : r < 0 ? "-" : "") + s + "cm";
}

export type WidgetFitEaseSummaryJson = {
  shoulderEaseCm: number | null;
  chestEaseCm: number | null;
  sleeveFromWristCm: number | null;
  hemFromCrotchCm: number | null;
  /** 短い総評（日本語） */
  fitToneJa: string;
  /** 4 行程度の箇条書き用 */
  linesJa: string[];
};

/**
 * 開発キャンバスと同じ `FittingCanvasSnapshot` から、ウィジェット向けの「ゆとり目安」を組み立てる。
 * 身長・体重のみの体型は推定のため、文言に「目安」を含める。
 */
export function buildWidgetFitEaseSummaryFromSnapshot(
  snap: FittingCanvasSnapshot,
  heightCm: number,
  weightKg: number
): WidgetFitEaseSummaryJson {
  const g = snap.measureOverlay.garment;
  if (!g?.size) {
    return {
      shoulderEaseCm: null,
      chestEaseCm: null,
      sleeveFromWristCm: null,
      hemFromCrotchCm: null,
      fitToneJa: "",
      linesJa: [],
    };
  }

  const { chestDiff } = calcFitFromSize(heightCm, weightKg, g.size);
  const chestEaseCm = round1(chestDiff);

  const wClamp = Math.max(35, Math.min(120, weightKg));
  const estShoulderCm = REF_BODY_SHOULDER_WIDTH_CM * Math.sqrt(Math.max(wClamp, 40) / REF_WEIGHT_KG);
  const shoulderEaseCm = round1(g.size.shoulder - estShoulderCm);

  const pxPerCm = g.bodyPxPerCm;
  let sleeveFromWristCm: number | null = null;
  if (pxPerCm != null && pxPerCm > 0 && snap.rigRedLineArmDiagram) {
    const { shoulderL, wristL } = snap.rigRedLineArmDiagram;
    const armPx = Math.hypot(wristL[0] - shoulderL[0], wristL[1] - shoulderL[1]);
    const armCm = armPx / pxPerCm;
    const sleeveGarmentCm = g.sleeveMeasuredCm ?? g.sleeveGeomDebug?.cm ?? g.size.sleeve;
    if (Number.isFinite(sleeveGarmentCm) && Number.isFinite(armCm) && sleeveGarmentCm > 0) {
      sleeveFromWristCm = round1(sleeveGarmentCm - armCm);
    }
  }

  let hemFromCrotchCm: number | null = null;
  const { top, bottom } = snap.measureOverlay.bodyHeight;
  if (g.hemCenter && pxPerCm != null && pxPerCm > 0) {
    const bodySpanPx = bottom[1] - top[1];
    if (bodySpanPx > 1) {
      const crotchY = top[1] + bodySpanPx * CROTCH_Y_FRAC;
      hemFromCrotchCm = round1((g.hemCenter[1] - crotchY) / pxPerCm);
    }
  }

  let fitToneJa = "バランス（目安）は標準寄り";
  if (chestEaseCm < -4 || shoulderEaseCm < -3) {
    fitToneJa = "ややきつめ（目安）";
  } else if (chestEaseCm > 10 || shoulderEaseCm > 3) {
    fitToneJa = "ややゆったり（目安）";
  } else if (chestEaseCm >= -1 && chestEaseCm <= 6 && shoulderEaseCm >= -1 && shoulderEaseCm <= 2) {
    fitToneJa = "バランス良い（目安）";
  }

  const linesJa = [
    `肩のゆとり（目安） ${fmtSignedCm(shoulderEaseCm)}`,
    `胸まわりのゆとり（目安） ${fmtSignedCm(chestEaseCm)}`,
    `袖 手首から約 ${fmtSignedCm(sleeveFromWristCm)}`,
    `裾 股から約 ${fmtSignedCm(hemFromCrotchCm)}`,
  ];

  return {
    shoulderEaseCm,
    chestEaseCm,
    sleeveFromWristCm,
    hemFromCrotchCm,
    fitToneJa,
    linesJa,
  };
}
