"use client";

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
import { applyYScaleToCanvasPoints } from "./fittingCanvasCustomGarmentGradeLength";
import { polylineArcLengthPx } from "./fittingCanvasPolylineMeasure";
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
  /**
   * 服リグの fabric ワープ直前の頂点（place＋rigAlign＋テンプレ X シフト済み）。
   * 幾何の px はここから取る（ファブリックワープ後は非線形でズレる）。服リグなしでは customPoints と同じ。
   */
  customPointsBeforeFabricWarp?: [number, number][] | null;
  /** `buildTopPlacement` と同一の縦 px/cm（採寸オーバーレイの cm 換算を二重定義しない） */
  bodyPxPerCm: number;
  /** 服リグ: ファブリックワープ後に縦スケールをかけたときのパラメータ（肩コンターと同じ Y 変換を適用） */
  canvasYGradeScale?: { lengthTopY: number; scale: number } | null;
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
    customPointsBeforeFabricWarp,
    bodyPxPerCm,
    canvasYGradeScale,
  } = input;

  /** 幾何数値用。ワープ前＝グレードと同じ線形ボディ座標。ワープなしは customPoints と同一。 */
  const ptsForGeometry = customPointsBeforeFabricWarp ?? customPoints;

  const refShoulderLx = useRigLandmarksForPlacement && rigLm ? rigLm.shoulderLx : c.shoulderLx;
  const refShoulderRx = useRigLandmarksForPlacement && rigLm ? rigLm.shoulderRx : c.shoulderRx;
  const refHemY = useRigLandmarksForPlacement && rigLm ? rigLm.hemY : c.hemY;
  const refHemCx = useRigLandmarksForPlacement && rigLm ? rigLm.hemCx : c.hemCx;
  const customContourBase = [
    placeDesignToTemplate(refShoulderLx, shoulderSeamY),
    placeDesignToTemplate(refShoulderRx, shoulderSeamY),
  ];
  let customContour: [number, number][] = hasGarmentRig
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
  if (canvasYGradeScale) {
    const { lengthTopY, scale } = canvasYGradeScale;
    customContour = applyYScaleToCanvasPoints(customContour, lengthTopY, scale);
  }
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
  /** キャンバス側 `buildTopPlacement` と同一の縦 px/cm */
  // 袖丈: 計測チェーンの弧長（px）を bodyPxPerCm で cm 化。
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
  /** 入力欄のハイライトは即時更新、gt の chain はデバウンス遅れあり。先に hl を採ると非連続列が連続 # 扱いにならない */
  const sleeveVertexChainHl = genericVertexPlotHighlight?.sleeveMeasureVertexChain;
  const sleeveVertexChainGt = gtSym?.sleeveMeasureVertexChain;
  const sleeveVertexChain =
    sleeveVertexChainHl != null && sleeveVertexChainHl.length >= 2
      ? sleeveVertexChainHl
      : sleeveVertexChainGt != null && sleeveVertexChainGt.length >= 2
        ? sleeveVertexChainGt
        : null;
  if (sleeveVertexChain != null && sleeveVertexChain.length >= 2) {
    const pathPts = sleeveVertexChain
      .map((i) => customPoints[i])
      .filter((p): p is [number, number] => p != null);
    const pathPtsGeom = sleeveVertexChain
      .map((i) => ptsForGeometry[i])
      .filter((p): p is [number, number] => p != null);
    if (pathPts.length >= 2 && pathPtsGeom.length >= 2) {
      const startPt = pathPts[0]!;
      const endPt = pathPts[pathPts.length - 1]!;
      sleeveStart = startPt;
      sleeveEnd = endPt;
      sleevePathPoints = pathPts;
      const deltaBodyPx = polylineArcLengthPx(pathPtsGeom);
      const measured = deltaBodyPx / bodyPxPerCm;
      sleevePathLengthDebug = { px: Math.round(deltaBodyPx), cm: measured };
    }
  } else if (sleeveIndicesForOverlay) {
    const [startIdx, endIdx] = sleeveIndicesForOverlay;
    const startPt = customPoints[startIdx];
    const endPt = customPoints[endIdx];
    const pathPts: [number, number][] = [];
    const pathPtsGeom: [number, number][] = [];
    for (let i = startIdx; i <= endIdx; i++) {
      const w = customPoints[i];
      const g = ptsForGeometry[i];
      if (w) pathPts.push(w);
      if (g) pathPtsGeom.push(g);
    }
    if (startPt && endPt) {
      sleeveStart = startPt;
      sleeveEnd = endPt;
      if (pathPts.length >= 2) {
        sleevePathPoints = pathPts;
      }
      const deltaBodyPx =
        pathPtsGeom.length >= 2
          ? polylineArcLengthPx(pathPtsGeom)
          : Math.hypot(
              ptsForGeometry[endIdx]![0] - ptsForGeometry[startIdx]![0],
              ptsForGeometry[endIdx]![1] - ptsForGeometry[startIdx]![1]
            );
      const measured = deltaBodyPx / bodyPxPerCm;
      sleevePathLengthDebug = { px: Math.round(deltaBodyPx), cm: measured };
    }
  } else {
    sleeveStart = designToGarmentCanvas(sleeveSeamL[0], sleeveSeamL[1]);
    sleeveEnd = sleeveEndPt ? designToGarmentCanvas(sleeveEndPt[0], sleeveEndPt[1]) : undefined;
  }

  // 着丈: 既定は肩ライン〜ランドマーク裾の縦差。連結 # ありのときは採寸頂点間の縦差（グレード紫区間と同じ縦スパン定義）。
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
    const paG = ptsForGeometry[lo];
    const pbG = ptsForGeometry[hi];
    if (!pa || !pb || !paG || !pbG) return false;
    const topW = pa[1] <= pb[1] ? pa : pb;
    const hemW = pa[1] >= pb[1] ? pa : pb;
    hemCenter = [hemW[0], hemW[1]];
    lengthMeasureTop = [topW[0], topW[1]];
    const topG = paG[1] <= pbG[1] ? paG : pbG;
    const hemG = paG[1] >= pbG[1] ? paG : pbG;
    const deltaPx = Math.abs(hemG[1] - topG[1]);
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

  /** 着丈: メッシュ（縦グレード後）の縦スパン。袖: 赤線は選択チェーンの頂点をそのまま通す（プロットと一致）。数値はグレード袖丈のみ表示 */
  const shoulderLeft = designToGarmentCanvas(visualShoulderLx, shoulderSeamY);
  const shoulderRight = designToGarmentCanvas(visualShoulderRx, shoulderSeamY);
  const midShoulderY = (shoulderLeft[1] + shoulderRight[1]) / 2;
  const lengthTopY = lengthMeasureTop ? lengthMeasureTop[1] : midShoulderY;
  const lengthPxVert = Math.abs(hemCenter[1] - lengthTopY);
  const lengthGuideHem: [number, number] = [hemCenter[0], hemCenter[1]];
  const lengthGeomDebug = { px: Math.round(lengthPxVert), cm: lengthPxVert / bodyPxPerCm };
  lengthMeasuredCm = lengthGeomDebug.cm;

  const sleevePx = customGarmentData.size.sleeve * bodyPxPerCm;
  let sleeveGeomDebug: { px: number; cm: number } | undefined;
  if (sleeveStart && sleeveEnd) {
    sleeveMeasuredCm = customGarmentData.size.sleeve;
    sleeveGeomDebug = { px: Math.round(sleevePx), cm: customGarmentData.size.sleeve };
  }

  let garmentOverlay: MeasureOverlayData["garment"] = {
    shoulderLeft,
    shoulderRight,
    hemCenter,
    size: customGarmentData.size,
    lengthMeasuredCm,
    lengthGuideHem,
    lengthGeomDebug,
    ...(lengthMeasureTop ? { lengthMeasureTop } : {}),
    sizeLabel: customGarmentData.presetId === "genericSymmetricTop" ? "汎用トップ" : "カスタム服",
    chestLeft: designToGarmentCanvas(chestMinX, chestMidY),
    chestRight: designToGarmentCanvas(chestMaxX, chestMidY),
    sleeveStart,
    sleeveEnd,
    sleeveMeasuredCm,
    sleevePathPoints,
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
      console.info("[FITTING_MEASURE] 入力値と幾何数値がずれています（採寸オーバーレイの定義差の確認用）", {
        着丈cm: { 入力値: lenIn, 幾何数値: lengthMeasuredCm ?? "—" },
        袖丈cm: { 入力値: slIn, 幾何数値: sleeveMeasuredCm ?? "—" },
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
      ...(garmentOverlay.lengthGuideHem
        ? { lengthGuideHem: shiftPt(garmentOverlay.lengthGuideHem) as [number, number] }
        : {}),
      ...(garmentOverlay.lengthMeasureTop
        ? { lengthMeasureTop: shiftPt(garmentOverlay.lengthMeasureTop) as [number, number] }
        : {}),
    };
  }

  const sleevePlotRangeForDebug: [number, number] | null =
    sleeveVertexChain != null && sleeveVertexChain.length >= 2
      ? [
          Math.min(sleeveVertexChain[0]!, sleeveVertexChain[sleeveVertexChain.length - 1]!),
          Math.max(sleeveVertexChain[0]!, sleeveVertexChain[sleeveVertexChain.length - 1]!),
        ]
      : sleeveIndicesForOverlay;

  const shoulderDebug: ShoulderDebug = {
    bodyShoulderContour,
    garmentShoulderContour: customContour,
    garmentShoulderPoints: customPoints,
    shoulderPointIndex: customShoulderIdx,
    garmentType: "custom",
    ...(sleevePlotRangeForDebug ? { sleeveMeasurePlotRange: sleevePlotRangeForDebug } : {}),
    ...(sleevePathLengthDebug && { sleevePathLengthDebug }),
    ...(lengthMeasurePlotRange && { lengthMeasurePlotRange }),
    ...(lengthPathLengthDebug && { lengthPathLengthDebug }),
  };

  return { garmentOverlay, shoulderDebug };
}
