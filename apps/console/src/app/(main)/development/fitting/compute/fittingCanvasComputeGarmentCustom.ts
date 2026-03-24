"use client";

import { REF_HEIGHT_CM } from "../lib/constants";
import { inferLandmarksFromRigPaths } from "../lib/customLandmarkResolve";
import { buildCustomTransformedPathsWithVertexPlots } from "../lib/customGarmentUtils";
import type { FittingCanvasRigLandmarksDebug } from "./fittingCanvasComputeTypes";
import { assembleCustomGarmentOverlayAndShoulderDebug } from "./fittingCanvasComputeGarmentCustomOverlay";
import { smoothStep } from "./fittingCanvasRigArmDebug";
import {
  applyCustomRigAlignInPlace,
  rigidMapFromShoulderSegmentPair,
  type CustomRigAlign,
} from "./fittingCanvasRigAlign";
import {
  getShoulderSeamYForData,
  outerCollarPoints,
  shoulderContourFromPath,
} from "../lib/fittingContourUtils";
import { buildTopPlacement } from "../lib/garmentBase";
import { scaleModelViewToBodyTemplate } from "../lib/modelRigData";
import type { CustomGarmentData, GenericVertexPlotHighlight, MeasureOverlayData, ShoulderDebug } from "../lib/types";
import { getAllPathPoints } from "../lib/fittingContourUtils";
import { getPathPoints, interpolatePath, tPath } from "../lib/pathUtils";

export type CustomGarmentBranchContext = {
  height: number;
  weight: number;
  customGarmentData: CustomGarmentData;
  rigLinePaths: string[] | null;
  rigLineWarpedPathsGarment: string[];
  warpRigLineRefBodyGarment: (x: number, y: number) => [number, number];
  rigSpineAlignFnGarment: ((x: number, y: number) => [number, number]) | null;
  rigSpineTranslateOnlyFnGarment: ((x: number, y: number) => [number, number]) | null;
  rigNeckAnchorTranslateOnlyFnGarment: ((x: number, y: number) => [number, number]) | null;
  rigAlignTemplateToRigViewGarment: (x: number, y: number) => [number, number];
  rigTemplateToRigViewForGarmentPath: (pathIdx: number) => (x: number, y: number) => [number, number];
  fromCustomGarmentData: CustomGarmentData | null;
  toCustomGarmentData: CustomGarmentData | null;
  animProgress: number;
  genericVertexPlotHighlight: GenericVertexPlotHighlight | null;
  bodyShoulderContour: [number, number][];
};

export function computeCustomGarmentBranch(
  ctx: CustomGarmentBranchContext
): {
  customPathDs: string[];
  customRigPathDs: string[];
  shoulderDebug: ShoulderDebug;
  garmentOverlay: MeasureOverlayData["garment"];
  rigLandmarksDebug: FittingCanvasRigLandmarksDebug;
} {
  const {
    height,
    weight,
    customGarmentData,
    rigLinePaths,
    rigLineWarpedPathsGarment,
    warpRigLineRefBodyGarment,
    rigSpineAlignFnGarment,
    rigSpineTranslateOnlyFnGarment,
    rigNeckAnchorTranslateOnlyFnGarment,
    rigAlignTemplateToRigViewGarment,
    rigTemplateToRigViewForGarmentPath,
    fromCustomGarmentData,
    toCustomGarmentData,
    animProgress,
    genericVertexPlotHighlight,
    bodyShoulderContour,
  } = ctx;

  const c = customGarmentData.landmarks;
  /** 服 SVG 内のリグ線あり。重ねリグは `rigTemplateToRigView` でモデルと一致。服 path はロック時、肩線剛体合わせ（スケールなし） */
  const hasGarmentRig = (customGarmentData.debugRigPathDs?.length ?? 0) > 0;
  const rigPathCountMatchesModel =
    hasGarmentRig &&
    rigLinePaths != null &&
    (customGarmentData.debugRigPathDs?.length ?? 0) === rigLinePaths.length &&
    rigLinePaths.length > 0;
  const rigGeometryLockedToModel = rigPathCountMatchesModel;
  const rigLm = customGarmentData.debugRigPathDs?.length
    ? inferLandmarksFromRigPaths(customGarmentData.debugRigPathDs)
    : null;
  /** モデルリグロック時は服もリグから推定した肩・裾で place し、SVG 内で一致した幾何を保つ */
  const useRigLandmarksForPlacement = rigGeometryLockedToModel && rigLm != null;

  const rigLandmarksDebug: FittingCanvasRigLandmarksDebug = customGarmentData.debugRigPathDs?.length
    ? {
        inferredFromRig: rigLm != null,
        rigShoulderY: rigLm?.shoulderY ?? null,
        rigHemY: rigLm?.hemY ?? null,
        usedShoulderY: c.shoulderY ?? null,
        usedHemY: c.hemY ?? null,
        useRigLandmarksForPlacement,
        genericApplied:
          customGarmentData.presetId === "genericSymmetricTop"
            ? !!customGarmentData.genericSymmetricTop?.applied
            : null,
      }
    : {
        inferredFromRig: false,
        rigShoulderY: null,
        rigHemY: null,
        usedShoulderY: c.shoulderY ?? null,
        usedHemY: c.hemY ?? null,
        useRigLandmarksForPlacement: false,
        genericApplied:
          customGarmentData.presetId === "genericSymmetricTop"
            ? !!customGarmentData.genericSymmetricTop?.applied
            : null,
      };

  const customAllOutline = getAllPathPoints(customGarmentData.pathDs);
  const presetShoulderIdx = customGarmentData.shoulderPointIndex;
  const usePresetShoulder =
    presetShoulderIdx != null && customAllOutline.length > presetShoulderIdx;
  // shoulderSeamY: デザイン座標でのどのYをボディ肩ラインに対応させるか。
  // - モデルリグロックかつリグから推定できた場合 → リグ肩Y（服とリグを同じ place で貼る）
  // - preset shoulder index → その頂点Y
  // - それ以外 → 幾何推定（outer collar 最下端）
  const shoulderSeamY = (() => {
    if (useRigLandmarksForPlacement && rigLm) return rigLm.shoulderY;
    if (usePresetShoulder) return customAllOutline[presetShoulderIdx!]![1];
    const band = 15;
    const customRaw = shoulderContourFromPath(
      customGarmentData.pathDs,
      c.shoulderY - band,
      c.shoulderY + band,
      false
    );
    const customOuter = outerCollarPoints(customRaw, c.shoulderLx, c.shoulderRx);
    return customOuter.length > 0
      ? Math.max(c.shoulderY, Math.max(...customOuter.map((p) => p[1])))
      : c.shoulderY;
  })();
  // 裾ランドマーク（着丈計測 # 未指定時は採寸オーバーレイの裾もこれに合わせる）
  const topLandmarks = (() => {
    const base =
      useRigLandmarksForPlacement && rigLm
        ? {
            shoulderY: rigLm.shoulderY,
            shoulderLx: rigLm.shoulderLx,
            shoulderRx: rigLm.shoulderRx,
            pitY: rigLm.shoulderY,
            pitLx: rigLm.shoulderLx,
            pitRx: rigLm.shoulderRx,
            hemY: rigLm.hemY,
            hemCx: rigLm.hemCx,
          }
        : {
            shoulderY: shoulderSeamY,
            shoulderLx: c.shoulderLx,
            shoulderRx: c.shoulderRx,
            pitY: shoulderSeamY,
            pitLx: c.shoulderLx,
            pitRx: c.shoulderRx,
            hemY: c.hemY,
            hemCx: c.hemCx,
          };
    return {
      ...base,
      ...(!useRigLandmarksForPlacement && c.garmentLengthOverride != null
        ? { garmentLengthOverride: c.garmentLengthOverride }
        : {}),
      ...(c.bodyShoulderOffsetY != null ? { bodyShoulderOffsetY: c.bodyShoulderOffsetY } : {}),
      ...(c.totalWidth != null ? { totalWidth: c.totalWidth } : {}),
      ...(c.maxWidthRatio != null ? { maxWidthRatio: c.maxWidthRatio } : {}),
    };
  })();
  const placement = buildTopPlacement(
    height,
    weight,
    customGarmentData.size,
    topLandmarks,
    shoulderSeamY,
    null,
    REF_HEIGHT_CM
  );
  /** リグロック時は赤リグと同じ model+rig ビュー→ボディ等倍スケール（`buildTopPlacement` は着丈ランドマーク用でリグと一致しない） */
  const placeDesignToTemplate = rigGeometryLockedToModel
    ? scaleModelViewToBodyTemplate
    : (gx: number, gy: number): [number, number] => placement.place(gx, gy);

  /** 服リグ本数がモデル `rigLinePaths` と同じなら幾何は同一テンプレ前提で、モデル休止座標をそのまま使う（d 文字列の丸め差で bbox 近似に落とさない） */
  /** 服パス変換の `buildTopPlacement` をキャンバス側 `topLandmarks` と揃える（アニメ from/to は各データで判定） */
  const placementLockToModelRigFor = (cg: { debugRigPathDs?: string[] | null } | null | undefined) =>
    !!cg &&
    rigLinePaths != null &&
    rigLinePaths.length > 0 &&
    (cg.debugRigPathDs?.length ?? 0) === rigLinePaths.length;
  /** 服に重ねる赤リグ線: `rigTemplateToRigViewForGarmentPath(idx)`（体重で横スケールしないリグワープ＋腕回転） */
  const transformHeightCmForCustomPaths = rigGeometryLockedToModel ? REF_HEIGHT_CM : height;

  let customRigPathDs =
    rigGeometryLockedToModel && rigLinePaths
      ? rigLinePaths.slice()
      : customGarmentData.debugRigPathDs?.length
        ? customGarmentData.debugRigPathDs.map((d) => tPath(d, (x, y) => placement.place(x, y)))
        : [];

  // テンプレ空間でリグ同士を平行移動のみ合わせ、その後 rigTemplateToRigView（モデル赤リグと同一パイプライン）。
  // 服リグ本数がモデルと同じ（ロック）時は rigAlign 不要。
  // それ以外: placement 済み服リグ vs rigLinePaths の bbox のみ（nudge なし）。
  // 服リグなし: warp 済みモデルリグ vs placement 済み服リグ（ランドマーク肩時のみ）。
  const rigAlign = ((): CustomRigAlign => {
    if (customRigPathDs.length === 0) return { enabled: false };
    if (rigGeometryLockedToModel) return { enabled: false };

    const bboxOf = (pts: [number, number][]) => {
      let minY = Infinity;
      let minX = Infinity;
      let maxX = -Infinity;
      for (const [x, y] of pts) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
      }
      return { minX, maxX, minY };
    };

    let modelPts: [number, number][];
    let garmentPts: [number, number][];

    if (hasGarmentRig) {
      if (!rigLinePaths?.length) return { enabled: false };
      garmentPts = customRigPathDs.flatMap((d) => getPathPoints(d));
      if (garmentPts.length < 2) return { enabled: false };
      modelPts = rigLinePaths.flatMap((d) => getPathPoints(d));
    } else {
      garmentPts = customRigPathDs.flatMap((d) => getPathPoints(d));
      if (garmentPts.length < 2) return { enabled: false };
      if (!rigLineWarpedPathsGarment?.length) return { enabled: false };
      modelPts = rigLineWarpedPathsGarment.flatMap((d) => getPathPoints(d));
    }
    if (modelPts.length < 2) return { enabled: false };

    const mb = bboxOf(modelPts);
    const gb = bboxOf(garmentPts);
    const modelCenterX = (mb.minX + mb.maxX) / 2;
    const garmentCenterX = (gb.minX + gb.maxX) / 2;
    const dx = modelCenterX - garmentCenterX;
    const dy = mb.minY - gb.minY;
    if (Math.abs(dx) <= 0.1 && Math.abs(dy) <= 0.1) return { enabled: false };
    return { enabled: true, dx, dy };
  })();

  /** 服 path 用: ロック時は肩線の向き・中点を脊髄合わせ後に合わせる剛体のみ（体重由来の横スケールは `*Garment` パイプライン） */
  const fabricShoulderLx = useRigLandmarksForPlacement && rigLm ? rigLm.shoulderLx : c.shoulderLx;
  const fabricShoulderRx = useRigLandmarksForPlacement && rigLm ? rigLm.shoulderRx : c.shoulderRx;
  const customGarmentFabricRigViewWarp: (x: number, y: number) => [number, number] = (() => {
    if (!rigGeometryLockedToModel) return rigAlignTemplateToRigViewGarment;
    const translateOnly = (x: number, y: number): [number, number] => {
      const refW = warpRigLineRefBodyGarment(x, y);
      if (rigNeckAnchorTranslateOnlyFnGarment)
        return rigNeckAnchorTranslateOnlyFnGarment(refW[0], refW[1]);
      if (rigSpineTranslateOnlyFnGarment) return rigSpineTranslateOnlyFnGarment(refW[0], refW[1]);
      return refW;
    };
    if (!rigSpineAlignFnGarment) return translateOnly;
    const [rslx, rsly] = placeDesignToTemplate(fabricShoulderLx, shoulderSeamY);
    const [rsrx, rsry] = placeDesignToTemplate(fabricShoulderRx, shoulderSeamY);
    const [alx, aly] = applyCustomRigAlignInPlace(rslx, rsly, rigAlign);
    const [arx, ary] = applyCustomRigAlignInPlace(rsrx, rsry, rigAlign);
    const p0 = warpRigLineRefBodyGarment(alx, aly) as [number, number];
    const p1 = warpRigLineRefBodyGarment(arx, ary) as [number, number];
    const q0 = rigSpineAlignFnGarment(p0[0], p0[1]);
    const q1 = rigSpineAlignFnGarment(p1[0], p1[1]);
    const rigidMap = rigidMapFromShoulderSegmentPair(p0, p1, q0, q1);
    if (rigidMap == null) return translateOnly;
    return (x: number, y: number) => rigidMap(warpRigLineRefBodyGarment(x, y) as [number, number]);
  })();

  /** デザイン座標 → canvas。服リグあり: place → rigAlign → fabric ワープ。なし: テンプレ配置のみ（服は `warp` で歪ませない） */
  const designToGarmentCanvas = (gx: number, gy: number): [number, number] => {
    const [px, py] = placeDesignToTemplate(gx, gy);
    if (hasGarmentRig) {
      const [qx, qy] = applyCustomRigAlignInPlace(px, py, rigAlign);
      return customGarmentFabricRigViewWarp(qx, qy);
    }
    return [px, py];
  };

  let customPathDs: string[];
  let customPoints: [number, number][];

  if (
    fromCustomGarmentData &&
    toCustomGarmentData &&
    fromCustomGarmentData.pathDs === toCustomGarmentData.pathDs &&
    animProgress < 1
  ) {
    // アニメーション: pathDs が同じでも from/to のリグロック・推定肩はそれぞれ評価
    const fromC = fromCustomGarmentData.landmarks;
    const toC = toCustomGarmentData.landmarks;
    const fromLocked = placementLockToModelRigFor(fromCustomGarmentData);
    const toLocked = placementLockToModelRigFor(toCustomGarmentData);
    const fromRlm = fromCustomGarmentData.debugRigPathDs?.length
      ? inferLandmarksFromRigPaths(fromCustomGarmentData.debugRigPathDs)
      : null;
    const toRlm = toCustomGarmentData.debugRigPathDs?.length
      ? inferLandmarksFromRigPaths(toCustomGarmentData.debugRigPathDs)
      : null;
    const shoulderYFrom =
      fromLocked && fromRlm ? fromRlm.shoulderY : getShoulderSeamYForData(fromCustomGarmentData);
    const shoulderYTo =
      toLocked && toRlm ? toRlm.shoulderY : getShoulderSeamYForData(toCustomGarmentData);
    const fromMerged = {
      ...fromCustomGarmentData,
      landmarks:
        fromLocked && fromRlm
          ? { ...fromC, ...fromRlm, shoulderY: fromRlm.shoulderY, hemY: fromRlm.hemY }
          : { ...fromC, shoulderY: shoulderYFrom, hemY: fromC.hemY },
    };
    const toMerged = {
      ...toCustomGarmentData,
      landmarks:
        toLocked && toRlm
          ? { ...toC, ...toRlm, shoulderY: toRlm.shoulderY, hemY: toRlm.hemY }
          : { ...toC, shoulderY: shoulderYTo, hemY: toC.hemY },
    };
    const fromTransformH = placementLockToModelRigFor(fromCustomGarmentData) ? REF_HEIGHT_CM : height;
    const toTransformH = placementLockToModelRigFor(toCustomGarmentData) ? REF_HEIGHT_CM : height;
    const fromOut = buildCustomTransformedPathsWithVertexPlots(
      fromMerged,
      fromTransformH,
      weight,
      shoulderYFrom,
      {
        placementLockToModelRig: placementLockToModelRigFor(fromCustomGarmentData),
      }
    );
    const toOut = buildCustomTransformedPathsWithVertexPlots(toMerged, toTransformH, weight, shoulderYTo, {
      placementLockToModelRig: placementLockToModelRigFor(toCustomGarmentData),
    });
    const t = smoothStep(animProgress);
    customPathDs = fromOut.pathDs.map((d, i) =>
      interpolatePath(d, toOut.pathDs[i] ?? d, t)
    );
    const n = Math.min(fromOut.vertexPlotsBodySpace.length, toOut.vertexPlotsBodySpace.length);
    customPoints = Array.from({ length: n }, (unused, i) => {
      const a = fromOut.vertexPlotsBodySpace[i]!;
      const b = toOut.vertexPlotsBodySpace[i]!;
      return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])] as [number, number];
    });
  } else {
    // 肩ライン合わせのため shoulderSeamY を渡す（リグロック時はリグ推定肩・裾で服と同一 place）
    const mergedLandmarks =
      useRigLandmarksForPlacement && rigLm
        ? { ...c, ...rigLm, shoulderY: rigLm.shoulderY, hemY: rigLm.hemY }
        : { ...c, shoulderY: shoulderSeamY, hemY: c.hemY };
    const transformed = buildCustomTransformedPathsWithVertexPlots(
      { ...customGarmentData, landmarks: mergedLandmarks },
      transformHeightCmForCustomPaths,
      weight,
      shoulderSeamY,
      { placementLockToModelRig: rigGeometryLockedToModel }
    );
    customPathDs = transformed.pathDs;
    customPoints = transformed.vertexPlotsBodySpace;
  }

  // rigAlign をテンプレ空間で適用後: 服 path は fabric ワープ、重ねリグ線は rigTemplateToRigView（モデル赤リグと一致）
  if (rigAlign.enabled) {
    const alignPlace = (x: number, y: number) => applyCustomRigAlignInPlace(x, y, rigAlign);
    customPathDs = customPathDs.map((d) => tPath(d, alignPlace));
    customRigPathDs = customRigPathDs.map((d) => tPath(d, alignPlace));
    customPoints = customPoints.map(([x, y]) => alignPlace(x, y));
  }
  if (hasGarmentRig) {
    customPathDs = customPathDs.map((d) => tPath(d, customGarmentFabricRigViewWarp));
    customRigPathDs = customRigPathDs.map((d, idx) => tPath(d, rigTemplateToRigViewForGarmentPath(idx)));
    customPoints = customPoints.map(([x, y]) => customGarmentFabricRigViewWarp(x, y));
  }

  const { garmentOverlay, shoulderDebug } = assembleCustomGarmentOverlayAndShoulderDebug({
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
  });

  return {
    customPathDs,
    customRigPathDs,
    shoulderDebug,
    garmentOverlay,
    rigLandmarksDebug,
  };
}
