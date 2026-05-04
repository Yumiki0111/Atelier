import { BZ, REF_WEIGHT_KG } from "@/app/(main)/development/fitting/lib/constants";
import type { CustomGarmentData } from "@/app/(main)/development/fitting/lib/types";
import { widgetFitChestBandJaFromDiff } from "@/app/(main)/development/fitting/lib/fitCalc";
import type { FittingCanvasSnapshot } from "@/lib/fitting-compute/fittingCanvasComputeTypes";
import {
  bodyArmPeakSpanCm,
  bodyIndentReferenceChordLengthCm,
} from "@/lib/widget-fit/bodyPlotReferenceMeasures";
import { resolveWidgetFitChestBandJaFromBodyHeuristic } from "@/lib/widget-fit/widgetFitChestBandOrdinal";

/** 基準体型（170/60）相当の参考肩幅 cm。`constants` のボディ肩 px と整合 */
const REF_BODY_SHOULDER_WIDTH_CM = 47;

const BODY_TEMPLATE_SPAN = BZ.foot - BZ.head_top;
const CROTCH_Y_FRAC = (BZ.crotch - BZ.head_top) / BODY_TEMPLATE_SPAN;

/** 採寸表の列ズレ等で明らかに壊れた値は数値表示から除外 */
const MAX_ABS_CHEST_EASE_CM = 34;
const MAX_ABS_SHOULDER_EASE_CM = 22;

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

/** 半袖など：袖丈が肩〜手首の腕長に比べて短すぎるときは「手首から」比較をしない */
function isLongSleeveStyleSleeveMeasure(sleeveGarmentCm: number, armCm: number): boolean {
  if (!Number.isFinite(sleeveGarmentCm) || !Number.isFinite(armCm) || armCm <= 1) return false;
  return sleeveGarmentCm >= armCm * 0.62;
}

export type WidgetFitEaseSummaryJson = {
  shoulderEaseCm: number | null;
  chestEaseCm: number | null;
  sleeveFromWristCm: number | null;
  hemFromCrotchCm: number | null;
  /** Chest ease band: garment 2-vertex chord vs model reference chord (or fallbacks). */
  fitChestBandJa: string;
  /** 短い総評（日本語） */
  fitToneJa: string;
  /** 箇条書き用（有効な行だけ） */
  linesJa: string[];
};

/**
 * `computeFittingCanvasSnapshot` の `FittingCanvasSnapshot`（プレビュー／ウィジェット共通）から、ウィジェット向け「ゆとり目安」を組み立てる。
 */
export function buildWidgetFitEaseSummaryFromSnapshot(
  snap: FittingCanvasSnapshot,
  weightKg: number,
  opts?: {
    fitChestBandMode?: "shirt" | "jacket";
    customGarmentData?: CustomGarmentData | null;
    /** 身長（cm）。`orderedSizeKeys` + `currentSize` と併用して一般論の推奨段を出す */
    heightCm?: number;
    /** 小→大 */
    orderedSizeKeys?: string[];
    currentSize?: string;
  }
): WidgetFitEaseSummaryJson {
  const g = snap.measureOverlay.garment;
  if (!g?.size) {
    return {
      shoulderEaseCm: null,
      chestEaseCm: null,
      sleeveFromWristCm: null,
      hemFromCrotchCm: null,
      fitChestBandJa: "",
      fitToneJa: "",
      linesJa: [],
    };
  }

  const mode = opts?.fitChestBandMode ?? "jacket";

  const bppc = g.bodyPxPerCm;
  let chestRaw: number;
  /** 胸バンド用の幾何ゆとり（cm）。2 頂点間の服スパン − 胴体参照弦、または身幅比フォールバック。 */
  let chestEaseForBand: number | null = null;
  const chordCm =
    bppc != null && bppc > 0 ? bodyIndentReferenceChordLengthCm(snap, bppc) : null;
  const garmentChestProxyCm = g.size.chest * 2;
  if (
    chordCm != null &&
    Number.isFinite(chordCm) &&
    Number.isFinite(garmentChestProxyCm) &&
    chordCm > 8 &&
    chordCm < 200
  ) {
    const fb = garmentChestProxyCm - chordCm;
    chestRaw = round1(fb);
    chestEaseForBand = fb;
  } else {
    chestRaw = Number.NaN;
    chestEaseForBand = null;
  }

  /** バッジ: 身長＋体重の推奨段 vs 現在段（一般論）を優先。列が揃わないときだけ幾何。検証用ボディは推奨の出し方のみ別。 */
  let fitChestBandJa = "";
  const hBand = opts?.heightCm;
  const ordKeys = opts?.orderedSizeKeys;
  const cur = opts?.currentSize?.trim();
  if (
    hBand != null &&
    Number.isFinite(hBand) &&
    ordKeys != null &&
    ordKeys.length > 0 &&
    cur != null &&
    cur.length > 0 &&
    ordKeys.includes(cur)
  ) {
    fitChestBandJa = resolveWidgetFitChestBandJaFromBodyHeuristic({
      heightCm: hBand,
      weightKg,
      orderedSizeKeys: ordKeys,
      currentSize: cur,
      bodyModelVariant: opts?.customGarmentData?.bodyModelVariant,
    }).bandJa;
  } else if (chestEaseForBand != null && Number.isFinite(chestEaseForBand)) {
    fitChestBandJa = widgetFitChestBandJaFromDiff(chestEaseForBand, mode);
  }

  let chestEaseCm: number | null = chestRaw;
  if (!Number.isFinite(chestEaseCm) || Math.abs(chestEaseCm) > MAX_ABS_CHEST_EASE_CM) {
    chestEaseCm = null;
  }

  const wClamp = Math.max(35, Math.min(120, weightKg));
  const estShoulderCm = REF_BODY_SHOULDER_WIDTH_CM * Math.sqrt(Math.max(wClamp, 40) / REF_WEIGHT_KG);
  const shoulderRawFormula = round1(g.size.shoulder - estShoulderCm);

  let shoulderRaw = shoulderRawFormula;
  const armPeakCm = bppc != null && bppc > 0 ? bodyArmPeakSpanCm(snap, bppc) : null;
  if (
    armPeakCm != null &&
    Number.isFinite(armPeakCm) &&
    armPeakCm > 8 &&
    armPeakCm < 200 &&
    Number.isFinite(g.size.shoulder)
  ) {
    shoulderRaw = round1(g.size.shoulder - armPeakCm);
  }

  let shoulderEaseCm: number | null = shoulderRaw;
  if (!Number.isFinite(shoulderEaseCm) || Math.abs(shoulderEaseCm) > MAX_ABS_SHOULDER_EASE_CM) {
    shoulderEaseCm = null;
  }

  const pxPerCm = g.bodyPxPerCm;
  let sleeveFromWristCm: number | null = null;
  if (pxPerCm != null && pxPerCm > 0 && snap.rigRedLineArmDiagram) {
    const { shoulderL, wristL } = snap.rigRedLineArmDiagram;
    const armPx = Math.hypot(wristL[0] - shoulderL[0], wristL[1] - shoulderL[1]);
    const armCm = armPx / pxPerCm;
    const sleeveGarmentCm = g.sleeveMeasuredCm ?? g.sleeveGeomDebug?.cm ?? g.size.sleeve;
    if (
      Number.isFinite(sleeveGarmentCm) &&
      Number.isFinite(armCm) &&
      sleeveGarmentCm > 0 &&
      isLongSleeveStyleSleeveMeasure(sleeveGarmentCm, armCm)
    ) {
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

  const linesJa: string[] = [];
  if (shoulderEaseCm != null) {
    linesJa.push(`肩のゆとり（目安） ${fmtSignedCm(shoulderEaseCm)}`);
  }
  if (chestEaseCm != null) {
    linesJa.push(`胸まわりのゆとり（目安） ${fmtSignedCm(chestEaseCm)}`);
  }
  if (sleeveFromWristCm != null) {
    linesJa.push(`手首から約 ${fmtSignedCm(sleeveFromWristCm)}`);
  }
  if (hemFromCrotchCm != null) {
    linesJa.push(`またから約 ${fmtSignedCm(hemFromCrotchCm)}`);
  }

  return {
    shoulderEaseCm,
    chestEaseCm,
    sleeveFromWristCm,
    hemFromCrotchCm,
    fitChestBandJa,
    fitToneJa: "",
    linesJa,
  };
}
