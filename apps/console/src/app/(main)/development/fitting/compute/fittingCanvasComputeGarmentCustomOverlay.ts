"use client";

import { bodyHeight, getBodyParams } from "../lib/bodyUtils";
import { REF_HEIGHT_CM, REF_WEIGHT_KG } from "../lib/constants";
import { getScalableSpec } from "../lib/customGarmentUtils";
import { applyCustomRigAlignInPlace, type CustomRigAlign } from "./fittingCanvasRigAlign";
import {
  indexOfClosest,
  onePointOnGarmentOutline,
  outerCollarPoints,
  shoulderContourFromPath,
  shoulderPointOnLine,
} from "../lib/fittingContourUtils";
import { resolveGenericScalableSpec } from "../generic";
import type {
  CustomGarmentData,
  CustomLandmarks,
  GenericVertexPlotHighlight,
  MeasureOverlayData,
  ScalableGarmentSpec,
  ShoulderDebug,
} from "../lib/types";

function scalableSpecForCustomGarment(data: CustomGarmentData): ScalableGarmentSpec | null {
  if (data.presetId === "genericSymmetricTop") {
    return resolveGenericScalableSpec(data);
  }
  return getScalableSpec(data.pathDs, data.presetId);
}

export type CustomGarmentOverlayAssemblyInput = {
  customGarmentData: CustomGarmentData;
  customPoints: [number, number][];
  customAllOutline: [number, number][];
  bodyShoulderContour: [number, number][];
  c: CustomGarmentData["landmarks"];
  rigLm: CustomLandmarks | null;
  useRigLandmarksForPlacement: boolean;
  hasGarmentRig: boolean;
  rigAlign: CustomRigAlign;
  shoulderSeamY: number;
  usePresetShoulder: boolean;
  presetShoulderIdx: number | null | undefined;
  placeDesignToTemplate: (gx: number, gy: number) => [number, number];
  designToGarmentCanvas: (gx: number, gy: number) => [number, number];
  customGarmentFabricRigViewWarp: (x: number, y: number) => [number, number];
  genericVertexPlotHighlight: GenericVertexPlotHighlight | null;
};

/**
 * カスタム服: path/rig 変換後の頂点列から採寸オーバーレイ・`shoulderDebug` を組み立てる（表示専用、Canon §13）。
 */
export function assembleCustomGarmentOverlayAndShoulderDebug(
  input: CustomGarmentOverlayAssemblyInput
): { garmentOverlay: MeasureOverlayData["garment"]; shoulderDebug: ShoulderDebug } {
  const {
    customGarmentData,
    customPoints,
    customAllOutline,
    bodyShoulderContour,
    c,
    rigLm,
    useRigLandmarksForPlacement,
    hasGarmentRig,
    rigAlign,
    shoulderSeamY,
    usePresetShoulder,
    presetShoulderIdx,
    placeDesignToTemplate,
    designToGarmentCanvas,
    customGarmentFabricRigViewWarp,
    genericVertexPlotHighlight,
  } = input;

  const refShoulderLx = useRigLandmarksForPlacement && rigLm ? rigLm.shoulderLx : c.shoulderLx;
  const refShoulderRx = useRigLandmarksForPlacement && rigLm ? rigLm.shoulderRx : c.shoulderRx;
  const refHemY = useRigLandmarksForPlacement && rigLm ? rigLm.hemY : c.hemY;
  const refHemCx = useRigLandmarksForPlacement && rigLm ? rigLm.hemCx : c.hemCx;
  const customContourBase = [
    placeDesignToTemplate(refShoulderLx, shoulderSeamY),
    placeDesignToTemplate(refShoulderRx, shoulderSeamY),
  ];
  const customContour = hasGarmentRig
    ? (customContourBase.map(([x, y]) => {
        const [qx, qy] = applyCustomRigAlignInPlace(x, y, rigAlign);
        return customGarmentFabricRigViewWarp(qx, qy);
      }) as [number, number][])
    : rigAlign.enabled
      ? (customContourBase.map(([x, y]) => applyCustomRigAlignInPlace(x, y, rigAlign)) as [
          number,
          number,
        ][])
      : customContourBase;
  const customShoulderIdx = usePresetShoulder
    ? presetShoulderIdx!
    : (() => {
        const band = 15;
        const customRaw = shoulderContourFromPath(
          customGarmentData.pathDs,
          shoulderSeamY - band,
          shoulderSeamY + band,
          false
        );
        const customOuter = outerCollarPoints(customRaw, refShoulderLx, refShoulderRx);
        const pt =
          shoulderPointOnLine(
            customAllOutline,
            shoulderSeamY,
            (refShoulderLx + refShoulderRx) / 2
          ) ??
          onePointOnGarmentOutline(customOuter, customRaw, refShoulderLx, refShoulderRx);
        return indexOfClosest(customAllOutline, pt);
      })();
  const centerXGarment = (refShoulderLx + refShoulderRx) / 2;
  const shoulderBandY0 = shoulderSeamY;
  const shoulderBandY1 = shoulderSeamY + 28;
  const shoulderBand = customAllOutline.filter((p) => p[1] >= shoulderBandY0 && p[1] <= shoulderBandY1);
  const visualShoulderLx = shoulderBand.length > 0 ? Math.min(...shoulderBand.map((p) => p[0])) : refShoulderLx;
  const visualShoulderRx = shoulderBand.length > 0 ? Math.max(...shoulderBand.map((p) => p[0])) : refShoulderRx;
  const bandY0 = shoulderSeamY + (refHemY - shoulderSeamY) * 0.35;
  const bandY1 = shoulderSeamY + (refHemY - shoulderSeamY) * 0.65;
  const torsoBand = customAllOutline.filter((p) => p[1] >= bandY0 && p[1] <= bandY1);
  const chestMinX = torsoBand.length > 0 ? Math.min(...torsoBand.map((p) => p[0])) : refShoulderLx;
  const chestMaxX = torsoBand.length > 0 ? Math.max(...torsoBand.map((p) => p[0])) : refShoulderRx;
  const chestMidY = (bandY0 + bandY1) / 2;
  const leftHalfAtShoulder = shoulderBand.filter((p) => p[0] < centerXGarment);
  const sleeveSeamL = leftHalfAtShoulder.length > 0 ? leftHalfAtShoulder.reduce((a, b) => (a[0] > b[0] ? a : b)) : [visualShoulderLx, shoulderSeamY] as [number, number];
  const leftSleeveStrict = customAllOutline.filter(
    (p) => p[0] < visualShoulderLx && p[1] > shoulderSeamY
  );
  const leftSleeve = leftSleeveStrict.length > 0 ? leftSleeveStrict : customAllOutline.filter((p) => p[0] < centerXGarment && p[1] > shoulderSeamY);
  const sleeveEndPt = leftSleeve.length > 0 ? leftSleeve.reduce((a, b) => (a[1] > b[1] ? a : b)) : null;
  /**
   * 着丈・袖の cm 換算は `buildTopPlacement(..., lengthCalibrationHeightCm: REF_HEIGHT_CM)` の
   * `bodyPxPerCm = bodyHeight(yScaleCal)/REF_HEIGHT_CM` と一致させる。
   * 身長スライダーは体型ワープ用で、服の縦グレード分母に載せない（195cm 入力で袖・着丈デバッグが歪むのを防ぐ）。
   */
  const { yScale: yScaleGarmentMeasure } = getBodyParams(REF_HEIGHT_CM, REF_WEIGHT_KG);
  const bodyPxPerCm = bodyHeight(yScaleGarmentMeasure) / REF_HEIGHT_CM;
  // 袖丈: `scaleSleevePathToSpec` と同じく端点の |ΔY|（design で定義）に相当するよう、ボディ上の端点 |ΔY| を bodyPxPerCm で cm 化。赤線は経路の見た目。
  let sleeveStart: [number, number] | undefined;
  let sleeveEnd: [number, number] | undefined;
  let sleeveMeasuredCm: number | undefined;
  let sleevePathPoints: [number, number][] | undefined;
  let sleevePathLengthDebug: { px: number; cm: number } | undefined;
  const scalableSpec = scalableSpecForCustomGarment(customGarmentData);
  const gtSym = customGarmentData.genericSymmetricTop;
  const gtHasSleeveMeasure =
    gtSym?.sleeveMeasureVertexStart != null &&
    gtSym?.sleeveMeasureVertexEnd != null &&
    Number.isFinite(gtSym.sleeveMeasureVertexStart) &&
    Number.isFinite(gtSym.sleeveMeasureVertexEnd);
  let effSleeveFromGtOrHighlight: [number, number] | null = null;
  if (gtHasSleeveMeasure) {
    const a = Math.trunc(gtSym!.sleeveMeasureVertexStart!);
    const b = Math.trunc(gtSym!.sleeveMeasureVertexEnd!);
    effSleeveFromGtOrHighlight = [Math.min(a, b), Math.max(a, b)];
  } else if (
    genericVertexPlotHighlight?.sleeveMeasure &&
    Number.isFinite(genericVertexPlotHighlight.sleeveMeasure[0]) &&
    Number.isFinite(genericVertexPlotHighlight.sleeveMeasure[1])
  ) {
    const [sm0, sm1] = genericVertexPlotHighlight.sleeveMeasure;
    effSleeveFromGtOrHighlight = [Math.min(Math.trunc(sm0), Math.trunc(sm1)), Math.max(Math.trunc(sm0), Math.trunc(sm1))];
  }
  const sleeveIndicesForOverlay = effSleeveFromGtOrHighlight ?? scalableSpec?.sleeveMeasureIndices ?? null;
  if (sleeveIndicesForOverlay) {
    const [startIdx, endIdx] = sleeveIndicesForOverlay;
    const startPt = customPoints[startIdx];
    const endPt = customPoints[endIdx];
    const pathPts: [number, number][] = [];
    for (let i = startIdx; i <= endIdx; i++) {
      const pt = customPoints[i];
      if (pt) pathPts.push(pt);
    }
    if (startPt && endPt) {
      sleeveStart = startPt;
      sleeveEnd = endPt;
      if (pathPts.length >= 2) {
        sleevePathPoints = pathPts;
      }
      const deltaBodyPx = Math.abs(endPt[1] - startPt[1]);
      const measured = deltaBodyPx / bodyPxPerCm;
      sleevePathLengthDebug = { px: Math.round(deltaBodyPx), cm: measured };
      sleeveMeasuredCm = measured;
    }
  } else {
    sleeveStart = designToGarmentCanvas(sleeveSeamL[0], sleeveSeamL[1]);
    sleeveEnd = sleeveEndPt ? designToGarmentCanvas(sleeveEndPt[0], sleeveEndPt[1]) : undefined;
  }

  // 着丈: 既定は肩ライン〜ランドマーク裾。連結 # ありのときは `lengthMeasureDesignSpanAfterBodyScale` と同じ考え方で端点の |ΔY|（弧長ではない）。
  const shoulderYForLength = designToGarmentCanvas(visualShoulderLx, shoulderSeamY)[1];
  let hemCenter: [number, number] = designToGarmentCanvas(refHemCx, refHemY);
  let lengthMeasuredCm = (hemCenter[1] - shoulderYForLength) / bodyPxPerCm;
  let lengthMeasurePlotRange: [number, number] | undefined;
  let lengthPathLengthDebug: { px: number; cm: number } | undefined;
  let lengthMeasureTop: [number, number] | undefined;
  const gtLen = customGarmentData.genericSymmetricTop;
  const lmLenA = gtLen?.lengthMeasureVertexStart;
  const lmLenB = gtLen?.lengthMeasureVertexEnd;
  const hlLen = genericVertexPlotHighlight?.lengthMeasure;
  const tryLengthFromGlobalRange = (a: number, b: number): boolean => {
    if (!Number.isFinite(a) || !Number.isFinite(b) || a === b) return false;
    const lo = Math.min(Math.trunc(a), Math.trunc(b));
    const hi = Math.max(Math.trunc(a), Math.trunc(b));
    const pa = customPoints[lo];
    const pb = customPoints[hi];
    if (!pa || !pb) return false;
    const topPt = pa[1] <= pb[1] ? pa : pb;
    const hemPt = pa[1] >= pb[1] ? pa : pb;
    hemCenter = [hemPt[0], hemPt[1]];
    lengthMeasureTop = [topPt[0], topPt[1]];
    const deltaPx = Math.abs(hemPt[1] - topPt[1]);
    lengthMeasuredCm = deltaPx / bodyPxPerCm;
    lengthMeasurePlotRange = [lo, hi];
    lengthPathLengthDebug = {
      px: Math.round(deltaPx),
      cm: deltaPx / bodyPxPerCm,
    };
    return true;
  };
  if (
    lmLenA != null &&
    lmLenB != null &&
    Number.isFinite(lmLenA) &&
    Number.isFinite(lmLenB) &&
    lmLenA !== lmLenB
  ) {
    tryLengthFromGlobalRange(lmLenA, lmLenB);
  } else if (
    hlLen &&
    Number.isFinite(hlLen[0]) &&
    Number.isFinite(hlLen[1]) &&
    hlLen[0] !== hlLen[1]
  ) {
    tryLengthFromGlobalRange(hlLen[0], hlLen[1]);
  }

  // 汎用トップで服リグ＋脊髄合わせ後の canvas は非線形。端点 |ΔY|÷bodyPxPerCm は入力着丈と一致しない。
  // 紫・袖ガイド付きのとき、表示の実寸はグレード正の size に揃える。
  let lengthCmFromSizeInput = false;
  let sleeveCmFromSizeInput = false;
  if (customGarmentData.presetId === "genericSymmetricTop") {
    const lenSpec = customGarmentData.size.length;
    if (lengthMeasureTop != null && Number.isFinite(lenSpec)) {
      lengthMeasuredCm = lenSpec;
      lengthCmFromSizeInput = true;
    }
    const slSpec = customGarmentData.size.sleeve;
    if (sleeveMeasuredCm != null && slSpec != null && Number.isFinite(slSpec)) {
      sleeveMeasuredCm = slSpec;
      sleeveCmFromSizeInput = true;
    }
  }

  const lengthGeomDebug: { px: number; cm: number } = lengthPathLengthDebug
    ? { px: lengthPathLengthDebug.px, cm: lengthPathLengthDebug.cm }
    : {
        px: Math.round(Math.abs(hemCenter[1] - shoulderYForLength)),
        cm: Math.abs(hemCenter[1] - shoulderYForLength) / bodyPxPerCm,
      };
  const sleeveGeomDebug: { px: number; cm: number } | undefined =
    sleevePathLengthDebug != null
      ? { px: sleevePathLengthDebug.px, cm: sleevePathLengthDebug.cm }
      : sleeveStart != null && sleeveEnd != null
        ? {
            px: Math.round(Math.abs(sleeveEnd[1] - sleeveStart[1])),
            cm: Math.abs(sleeveEnd[1] - sleeveStart[1]) / bodyPxPerCm,
          }
        : undefined;

  let garmentOverlay: MeasureOverlayData["garment"] = {
    shoulderLeft: designToGarmentCanvas(visualShoulderLx, shoulderSeamY),
    shoulderRight: designToGarmentCanvas(visualShoulderRx, shoulderSeamY),
    hemCenter,
    size: customGarmentData.size,
    lengthMeasuredCm,
    ...(lengthMeasureTop ? { lengthMeasureTop } : {}),
    ...(lengthCmFromSizeInput ? { lengthCmFromSizeInput: true } : {}),
    ...(sleeveCmFromSizeInput ? { sleeveCmFromSizeInput: true } : {}),
    sizeLabel: customGarmentData.presetId === "genericSymmetricTop" ? "汎用トップ" : "カスタム服",
    chestLeft: designToGarmentCanvas(chestMinX, chestMidY),
    chestRight: designToGarmentCanvas(chestMaxX, chestMidY),
    sleeveStart,
    sleeveEnd,
    sleeveMeasuredCm,
    sleevePathPoints,
    lengthGeomDebug,
    ...(sleeveGeomDebug ? { sleeveGeomDebug } : {}),
  };

  const debugFittingMeasure =
    typeof sessionStorage !== "undefined" && sessionStorage.getItem("DEBUG_FITTING_MEASURE") === "1";
  if (debugFittingMeasure) {
    const lenIn = customGarmentData.size.length;
    const slIn = customGarmentData.size.sleeve;
    const lenDiff = lengthMeasuredCm != null ? Math.abs(lengthMeasuredCm - lenIn) : 0;
    const slDiff = sleeveMeasuredCm != null ? Math.abs(sleeveMeasuredCm - slIn) : 0;
    if (lenDiff > 0.2 || slDiff > 0.2) {
      console.info("[FITTING_MEASURE] 入力と画面上換算がずれています（採寸オーバーレイの定義差の確認用）", {
        着丈cm: { 入力: lenIn, 画面上: lengthMeasuredCm ?? "—" },
        袖丈cm: { 入力: slIn, 画面上: sleeveMeasuredCm ?? "—" },
        bodyPxPerCm,
      });
    }
  }

  // 服リグあり時は designToGarmentCanvas 内で rigAlign 済み。translate モードのみ末尾で overlay をシフト。
  if (rigAlign.enabled && !hasGarmentRig) {
    const shiftPt = (p: [number, number] | undefined): [number, number] | undefined =>
      p ? applyCustomRigAlignInPlace(p[0], p[1], rigAlign) : p;
    const shiftPts = (ps: [number, number][] | undefined): [number, number][] | undefined =>
      ps ? ps.map(([x, y]) => applyCustomRigAlignInPlace(x, y, rigAlign)) : ps;
    garmentOverlay = {
      ...garmentOverlay,
      shoulderLeft: shiftPt(garmentOverlay.shoulderLeft) as [number, number],
      shoulderRight: shiftPt(garmentOverlay.shoulderRight) as [number, number],
      hemCenter: shiftPt(garmentOverlay.hemCenter) as [number, number],
      chestLeft: shiftPt(garmentOverlay.chestLeft) as [number, number],
      chestRight: shiftPt(garmentOverlay.chestRight) as [number, number],
      sleeveStart: shiftPt(garmentOverlay.sleeveStart),
      sleeveEnd: shiftPt(garmentOverlay.sleeveEnd),
      sleevePathPoints: shiftPts(garmentOverlay.sleevePathPoints),
      ...(garmentOverlay.lengthMeasureTop
        ? { lengthMeasureTop: shiftPt(garmentOverlay.lengthMeasureTop) as [number, number] }
        : {}),
    };
  }

  const shoulderDebug: ShoulderDebug = {
    bodyShoulderContour,
    garmentShoulderContour: customContour,
    garmentShoulderPoints: customPoints,
    shoulderPointIndex: customShoulderIdx,
    garmentType: "custom",
    ...(sleeveIndicesForOverlay ? { sleeveMeasurePlotRange: sleeveIndicesForOverlay } : {}),
    ...(sleevePathLengthDebug && { sleevePathLengthDebug }),
    ...(lengthMeasurePlotRange && { lengthMeasurePlotRange }),
    ...(lengthPathLengthDebug && { lengthPathLengthDebug }),
  };

  return { garmentOverlay, shoulderDebug };
}
