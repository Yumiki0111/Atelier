import { BODY_CX, REF_HEIGHT_CM } from "@/app/(main)/development/fitting/lib/constants";
import { inferLandmarksFromRigPaths } from "@/app/(main)/development/fitting/lib/customLandmarkResolve";
import { buildCustomTransformedPathsWithVertexPlots } from "@/app/(main)/development/fitting/lib/customGarmentUtils";
import type { FittingCanvasRigLandmarksDebug } from "./fittingCanvasComputeTypes";
import { assembleCustomGarmentOverlayAndShoulderDebug } from "./fittingCanvasComputeGarmentCustomOverlay";
import { smootherStep } from "./fittingCanvasRigArmDebug";
import { rigidMapFromShoulderSegmentPair, RIG_LINE_SPINE } from "./fittingCanvasRigAlign";
import { getShoulderSeamYForData } from "@/app/(main)/development/fitting/lib/fittingContourUtils";
import { buildTopPlacement } from "@/app/(main)/development/fitting/lib/garmentBase";
import { scaleModelViewToBodyTemplate } from "@/app/(main)/development/fitting/lib/modelRigData";
import { pathDsContentEqual } from "@/app/(main)/development/fitting/lib/fittingStateUtils";
import type {
  CustomGarmentData,
  GenericVertexPlotHighlight,
  MeasureOverlayData,
  ShoulderDebug,
  SizeMeasure,
} from "@/app/(main)/development/fitting/lib/types";
import { getAllPathPoints } from "@/app/(main)/development/fitting/lib/fittingContourUtils";
import { getPathPoints, interpolatePath, tPath } from "@/app/(main)/development/fitting/lib/pathUtils";
import { bboxCenterXFromPathDs, bboxCenterXFromPoints } from "./fittingCanvasComputeGarmentCustomBbox";
import { isDebugFittingLengthPipelineEnabled } from "./fittingCanvasDebugFlags";
import {
  applyGenericTopLengthMeshIfEligible,
  purpleLengthVerticalSpanPxFromVertices,
  runGenericSymmetricTopSleevePipeline,
} from "./fittingCanvasComputeGarmentCustomSymmetricTop";

export type CustomGarmentBranchContext = {
  height: number;
  weight: number;
  customGarmentData: CustomGarmentData;
  rigLinePaths: string[] | null;
  warpRigLineRefBodyGarment: (x: number, y: number) => [number, number];
  rigSpineAlignFnGarment: ((x: number, y: number) => [number, number]) | null;
  rigSpineTranslateOnlyFnGarment: ((x: number, y: number) => [number, number]) | null;
  rigNeckAnchorTranslateOnlyFnGarment: ((x: number, y: number) => [number, number]) | null;
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
  /** `customPathDs` と同じ長さ。元 SVG の破線・線幅・stroke 色 */
  customPathStrokeDasharrays: (string | undefined)[];
  customPathStrokeWidths: (number | undefined)[];
  customPathStrokes: (string | undefined)[];
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
    warpRigLineRefBodyGarment,
    rigSpineAlignFnGarment,
    rigSpineTranslateOnlyFnGarment,
    rigNeckAnchorTranslateOnlyFnGarment,
    rigTemplateToRigViewForGarmentPath,
    fromCustomGarmentData,
    toCustomGarmentData,
    animProgress,
    genericVertexPlotHighlight,
    bodyShoulderContour,
  } = ctx;

  const c = customGarmentData.landmarks;
  const rigN = customGarmentData.debugRigPathDs?.length ?? 0;
  const rigGeometryLockedToModel =
    rigLinePaths != null && rigLinePaths.length > 0 && rigN === rigLinePaths.length && rigN > 0;

  if (!rigGeometryLockedToModel) {
    const w: string[] =
      rigN === 0
        ? ["服SVGにリグ線がありません。モデルと同じリグ付きのSVGをアップロードしてください。"]
        : [`服のリグ本数（${rigN}）がモデル（${rigLinePaths!.length}）と一致しません。`];
    return {
      customPathDs: [],
      customPathStrokeDasharrays: [],
      customPathStrokeWidths: [],
      customPathStrokes: [],
      customRigPathDs: [],
      shoulderDebug: {
        bodyShoulderContour,
        garmentShoulderContour: [],
        garmentShoulderPoints: [],
        garmentType: "custom",
      },
      garmentOverlay: null,
      rigLandmarksDebug: {
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
        rigRequirementWarnings: w,
      },
    };
  }

  const rigDs = customGarmentData.debugRigPathDs!;
  const rigLm = inferLandmarksFromRigPaths(rigDs);
  const useRigLandmarksForPlacement = rigLm != null;

  const rigLandmarksDebug: FittingCanvasRigLandmarksDebug = {
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
  };

  const customAllOutline = getAllPathPoints(customGarmentData.pathDs);
  const shoulderSeamY = rigLm != null ? rigLm.shoulderY : getShoulderSeamYForData(customGarmentData);

  const topLandmarks = (() => {
    const base =
      rigLm != null
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
      ...(c.bodyShoulderOffsetY != null ? { bodyShoulderOffsetY: c.bodyShoulderOffsetY } : {}),
      ...(c.totalWidth != null ? { totalWidth: c.totalWidth } : {}),
      ...(c.maxWidthRatio != null ? { maxWidthRatio: c.maxWidthRatio } : {}),
    };
  })();
  /**
   * 着丈→px/cm は REF 固定（身長スライダーに着丈メッシュを載せない）。
   * 検証ボディで `height` を渡すと紫着丈メッシュが身長で振れて服が大きく上下するため、ここも REF に統一する。
   */
  const placement = buildTopPlacement(
    height,
    weight,
    customGarmentData.size,
    topLandmarks,
    shoulderSeamY,
    null,
    REF_HEIGHT_CM
  );
  const placeDesignToTemplate = scaleModelViewToBodyTemplate;
  const placementLockToModelRigFor = (cg: { debugRigPathDs?: string[] | null } | null | undefined) =>
    !!cg &&
    rigLinePaths != null &&
    rigLinePaths.length > 0 &&
    (cg.debugRigPathDs?.length ?? 0) === rigLinePaths.length;
  const transformHeightCmForCustomPaths = REF_HEIGHT_CM;

  let customRigPathDs = rigLinePaths.slice();

  const fabricShoulderLx = rigLm ? rigLm.shoulderLx : c.shoulderLx;
  const fabricShoulderRx = rigLm ? rigLm.shoulderRx : c.shoulderRx;

  let customPathDs: string[];
  let customPoints: [number, number][];
  let customPathStrokeDasharrays: (string | undefined)[] = [];
  let customPathStrokeWidths: (number | undefined)[] = [];
  let customPathStrokes: (string | undefined)[] = [];

  if (
    fromCustomGarmentData &&
    toCustomGarmentData &&
    pathDsContentEqual(fromCustomGarmentData.pathDs, toCustomGarmentData.pathDs) &&
    animProgress < 1 &&
    placementLockToModelRigFor(fromCustomGarmentData) &&
    placementLockToModelRigFor(toCustomGarmentData)
  ) {
    const fromC = fromCustomGarmentData.landmarks;
    const toC = toCustomGarmentData.landmarks;
    const fromRlm = inferLandmarksFromRigPaths(fromCustomGarmentData.debugRigPathDs!)!;
    const toRlm = inferLandmarksFromRigPaths(toCustomGarmentData.debugRigPathDs!)!;
    const shoulderYFrom = fromRlm.shoulderY;
    const shoulderYTo = toRlm.shoulderY;
    const fromMerged = {
      ...fromCustomGarmentData,
      landmarks: { ...fromC, ...fromRlm, shoulderY: fromRlm.shoulderY, hemY: fromRlm.hemY },
    };
    const toMerged = {
      ...toCustomGarmentData,
      landmarks: { ...toC, ...toRlm, shoulderY: toRlm.shoulderY, hemY: toRlm.hemY },
    };
    const fromOut = buildCustomTransformedPathsWithVertexPlots(
      fromMerged,
      REF_HEIGHT_CM,
      weight,
      shoulderYFrom,
      { placementLockToModelRig: true }
    );
    const toOut = buildCustomTransformedPathsWithVertexPlots(toMerged, REF_HEIGHT_CM, weight, shoulderYTo, {
      placementLockToModelRig: true,
    });
    const t = smootherStep(animProgress);
    customPathDs = fromOut.pathDs.map((d, i) =>
      interpolatePath(d, toOut.pathDs[i] ?? d, t)
    );
    customPathStrokeDasharrays = fromOut.pathDs.map((_, i) =>
      t < 0.5 ? fromOut.pathStrokeDasharrays[i] : toOut.pathStrokeDasharrays[i]
    );
    customPathStrokeWidths = fromOut.pathDs.map((_, i) =>
      t < 0.5 ? fromOut.pathStrokeWidths[i] : toOut.pathStrokeWidths[i]
    );
    customPathStrokes = fromOut.pathDs.map((_, i) =>
      t < 0.5 ? fromOut.pathStrokes[i] : toOut.pathStrokes[i]
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
      { placementLockToModelRig: true }
    );
    customPathDs = transformed.pathDs;
    customPoints = transformed.vertexPlotsBodySpace;
    customPathStrokeDasharrays = transformed.pathStrokeDasharrays;
    customPathStrokeWidths = transformed.pathStrokeWidths;
    customPathStrokes = transformed.pathStrokes;
  }

  /**
   * リグロック時: ワープ前にテンプレ X をシフトして体の中心に寄せる。
   * 頂点「平均」X は片側に点が密だと寄り、右（左）に寄せ過ぎるため、服は bbox 中心、脊髄は path0 の bbox 中心。
   * 脊髄が取れないときは BODY_CX をターゲットにする。
   * 着丈連結など measure-only 胴グレードはリグ線を変えないが服 path の bbox は変わり得るため、
   * シフト量の garment 側は `debugRigPathDs` を place した bbox 中心に固定し、右左への寄せ過ぎを防ぐ。
   */
  let templateShiftXLocked = 0;
  if (rigLinePaths.length > RIG_LINE_SPINE) {
    const spineD = rigLinePaths[RIG_LINE_SPINE];
    const garmentCx = (() => {
      const rigDs = customGarmentData.debugRigPathDs;
      if (rigDs != null && rigDs.length > 0) {
        const placedRig = rigDs.map((d) => tPath(d, placeDesignToTemplate));
        const cx = bboxCenterXFromPathDs(placedRig);
        if (cx != null && Number.isFinite(cx)) return cx;
      }
      return bboxCenterXFromPathDs(customPathDs);
    })();
    const spinePts = spineD ? getPathPoints(spineD) : [];
    const rigSpineCx = spinePts.length
      ? bboxCenterXFromPoints(spinePts)
      : null;
    const targetCx = rigSpineCx ?? BODY_CX;
    if (garmentCx != null) {
      templateShiftXLocked = targetCx - garmentCx;
    }
  }
  if (Math.abs(templateShiftXLocked) > 0.01) {
    const sh = templateShiftXLocked;
    customPathDs = customPathDs.map((d) => tPath(d, (x, y) => [x + sh, y]));
    customPoints = customPoints.map(([x, y]) => [x + sh, y] as [number, number]);
  }

  const customGarmentFabricRigViewWarp: (x: number, y: number) => [number, number] = (() => {
    const translateOnly = (x: number, y: number): [number, number] => {
      const refW = warpRigLineRefBodyGarment(x, y);
      if (rigNeckAnchorTranslateOnlyFnGarment) {
        return rigNeckAnchorTranslateOnlyFnGarment(refW[0], refW[1]);
      }
      if (rigSpineTranslateOnlyFnGarment) {
        return rigSpineTranslateOnlyFnGarment(refW[0], refW[1]);
      }
      return refW;
    };
    /** 既定ボディも検証ボディも同一: ref ワープ → 肩2点の脊髄合わせ後位置で剛体マップ（浮き制御はここで行う） */
    if (!rigSpineAlignFnGarment) return translateOnly;
    const [rslx, rsly] = placeDesignToTemplate(fabricShoulderLx, shoulderSeamY);
    const [rsrx, rsry] = placeDesignToTemplate(fabricShoulderRx, shoulderSeamY);
    const alx = rslx;
    const aly = rsly;
    const arx = rsrx;
    const ary = rsry;
    const sx = templateShiftXLocked;
    const p0 = warpRigLineRefBodyGarment(alx + sx, aly) as [number, number];
    const p1 = warpRigLineRefBodyGarment(arx + sx, ary) as [number, number];
    const q0 = rigSpineAlignFnGarment(p0[0], p0[1]);
    const q1 = rigSpineAlignFnGarment(p1[0], p1[1]);
    const rigidMap = rigidMapFromShoulderSegmentPair(p0, p1, q0, q1);
    if (rigidMap == null) return translateOnly;
    return (x: number, y: number) =>
      rigidMap(warpRigLineRefBodyGarment(x, y) as [number, number]);
  })();

  /** デザイン座標 → canvas。place → テンプレ X シフト → fabric ワープ */
  const designToGarmentCanvas = (gx: number, gy: number): [number, number] => {
    const [px, py] = placeDesignToTemplate(gx, gy);
    return customGarmentFabricRigViewWarp(px + templateShiftXLocked, py);
  };

  let customPointsBeforeFabricWarp: [number, number][] | null = customPoints.map(
    ([x, y]) => [x, y] as [number, number]
  );

  customPathDs = customPathDs.map((d) => tPath(d, customGarmentFabricRigViewWarp));
  customRigPathDs = customRigPathDs.map((d, idx) => tPath(d, rigTemplateToRigViewForGarmentPath(idx)));
  customPoints = customPoints.map(([x, y]) => customGarmentFabricRigViewWarp(x, y));

  /**
   * path 補間中は `animatingCustomSizeBlend` が true。着丈 Y メッシュはオフにせず、
   * from/to の `SizeMeasure` を補間した `lengthMeshSizeForGrade` で目標着丈だけを中間値に合わせる。
   * 袖スナップも `lengthMeshSizeForGrade`（from→to 補間）で目標袖丈を中間値に合わせて適用。
   */
  const animatingCustomSizeBlend =
    fromCustomGarmentData != null &&
    toCustomGarmentData != null &&
    pathDsContentEqual(fromCustomGarmentData.pathDs, toCustomGarmentData.pathDs) &&
    animProgress < 1;

  const gtSym = customGarmentData.genericSymmetricTop;
  const genericTopPurpleLengthRange =
    customGarmentData.presetId === "genericSymmetricTop" &&
    gtSym != null &&
    gtSym.lengthMeasureVertexStart != null &&
    gtSym.lengthMeasureVertexEnd != null &&
    Number.isFinite(gtSym.lengthMeasureVertexStart) &&
    Number.isFinite(gtSym.lengthMeasureVertexEnd) &&
    gtSym.lengthMeasureVertexStart !== gtSym.lengthMeasureVertexEnd;

  const lengthGradingBaselineOk =
    gtSym != null &&
    gtSym.gradingBaselineLengthCm != null &&
    Number.isFinite(gtSym.gradingBaselineLengthCm) &&
    gtSym.gradingBaselineLengthCm > 0;

  const canApplyLengthMeshGrade = genericTopPurpleLengthRange && lengthGradingBaselineOk;

  const lengthMeshSizeForGrade: SizeMeasure | undefined =
    animatingCustomSizeBlend &&
    fromCustomGarmentData != null &&
    toCustomGarmentData != null &&
    pathDsContentEqual(fromCustomGarmentData.pathDs, toCustomGarmentData.pathDs)
      ? (() => {
          const t = smootherStep(animProgress);
          const a = fromCustomGarmentData.size;
          const b = toCustomGarmentData.size;
          return {
            shoulder: a.shoulder + (b.shoulder - a.shoulder) * t,
            chest: a.chest + (b.chest - a.chest) * t,
            length: a.length + (b.length - a.length) * t,
            sleeve: a.sleeve + (b.sleeve - a.sleeve) * t,
          };
        })()
      : undefined;

  const spanBeforeLengthMesh =
    customGarmentData.presetId === "genericSymmetricTop"
      ? purpleLengthVerticalSpanPxFromVertices(customPoints, customGarmentData, genericVertexPlotHighlight)
      : null;

  const lengthMesh = applyGenericTopLengthMeshIfEligible({
    canApplyLengthMeshGrade,
    animatingCustomSizeBlend,
    lengthMeshSizeForGrade,
    customGarmentData,
    customPathDs,
    customPoints,
    customAllOutline,
    c,
    rigLm,
    useRigLandmarksForPlacement,
    shoulderSeamY,
    designToGarmentCanvas,
    bodyPxPerCm: placement.bodyPxPerCm,
    genericVertexPlotHighlight,
    customPointsBeforeFabricWarp,
  });

  customPathDs = lengthMesh.customPathDs;
  customPoints = lengthMesh.customPoints;
  const designToGarmentCanvasForOverlay = lengthMesh.designToGarmentCanvasForOverlay;
  const canvasYGradeScale = lengthMesh.canvasYGradeScale;
  const lengthGeomBeforeLengthMeshDebug = lengthMesh.lengthGeomBeforeLengthMeshDebug;
  customPointsBeforeFabricWarp = lengthMesh.customPointsBeforeFabricWarpOut;
  const lengthMeshSkipReason = lengthMesh.lengthMeshSkipReason;

  const spanAfterLengthMesh =
    customGarmentData.presetId === "genericSymmetricTop"
      ? purpleLengthVerticalSpanPxFromVertices(customPoints, customGarmentData, genericVertexPlotHighlight)
      : null;

  /** 裾スナップは廃止。着丈 Y メッシュが既に `targetLengthPx / span` で紫区間を目標に揃えており、その後に 1 頂点だけ動かすと二重補正でチラつく。 */

  const sleevePhase = runGenericSymmetricTopSleevePipeline({
    customGarmentData,
    customPathDs,
    customPoints,
    c,
    animatingCustomSizeBlend,
    sleeveSizeForSnap: lengthMeshSizeForGrade,
    bodyPxPerCm: placement.bodyPxPerCm,
  });
  customPathDs = sleevePhase.customPathDs;
  customPoints = sleevePhase.customPoints;
  const sleeveGeomBeforeSleeveFixDebug = sleevePhase.sleeveGeomBeforeSleeveFixDebug;
  const sleeveGeomBeforeSleeveFixDebugRight = sleevePhase.sleeveGeomBeforeSleeveFixDebugRight;
  const sleevePxPerCmForMeasure = sleevePhase.sleevePxPerCmForMeasure;
  const sleevePipelineGeom = sleevePhase.sleevePipelineGeom;
  const sleevePipelineGeomMirror = sleevePhase.sleevePipelineGeomMirror;
  const sleeveMeasureDefinitionDebug = sleevePhase.sleeveMeasureDefinitionDebug;

  const spanAfterSleeve =
    customGarmentData.presetId === "genericSymmetricTop"
      ? purpleLengthVerticalSpanPxFromVertices(customPoints, customGarmentData, genericVertexPlotHighlight)
      : null;

  if (isDebugFittingLengthPipelineEnabled() && customGarmentData.presetId === "genericSymmetricTop") {
    const lenIn = customGarmentData.size.length;
    const bppc = placement.bodyPxPerCm;
    const nominalTargetPx =
      Number.isFinite(lenIn) && lenIn > 0.5 ? lenIn * bppc : null;
    const target = lengthMesh.appliedTargetLengthPx;
    const deltaMeshVsTarget =
      target != null && spanAfterLengthMesh != null ? spanAfterLengthMesh - target : null;
    console.groupCollapsed("[FITTING_LENGTH_PIPELINE] 順序と数値（汎用トップ着丈）");
    console.log("① 入力", {
      sizeLengthCm: lenIn,
      bodyPxPerCm: bppc,
      nominalTargetPxFromSize: nominalTargetPx,
      canApplyLengthMeshGrade,
      lengthMeshSkipReason: lengthMesh.lengthMeshSkipReason ?? null,
    });
    console.log("② 着丈 Y メッシュ（ワープ後 path）", {
      applied: lengthMesh.canvasYGradeScale != null,
      canvasYGradeScale: lengthMesh.canvasYGradeScale,
      appliedTargetLengthPx: lengthMesh.appliedTargetLengthPx ?? null,
      lengthGeomBeforeLengthMeshDebug: lengthMesh.lengthGeomBeforeLengthMeshDebug ?? null,
    });
    console.log("③ 紫スパン px（各段階の customPoints）", {
      beforeLengthMesh: spanBeforeLengthMesh,
      afterLengthMesh: spanAfterLengthMesh,
      afterSleeve: spanAfterSleeve,
    });
    console.log("④ 着丈メッシュ後の紫スパン − 目標 px（裾スナップは行わない）", {
      targetLengthPx: target ?? null,
      spanAfterMeshMinusTargetPx: deltaMeshVsTarget,
    });
    console.log("⑤ 袖パイプライン（最終）", {
      animatingCustomSizeBlend,
      sleeveTargetBlended: lengthMeshSizeForGrade != null,
    });
    console.log("⑥ オーバーレイ: 着丈は紫区間の実測 px÷bodyPxPerCm", {
      appliedTargetLengthPx: lengthMesh.appliedTargetLengthPx ?? null,
    });
    console.groupEnd();
  }

  const { garmentOverlay, shoulderDebug } = assembleCustomGarmentOverlayAndShoulderDebug({
    customGarmentData,
    resolvedPathDsForSleeveMeasure: customPathDs,
    customPoints,
    customAllOutline,
    bodyShoulderContour,
    c,
    rigLm,
    useRigLandmarksForPlacement,
    hasGarmentRig: true,
    shoulderSeamY,
    placeDesignToTemplate,
    designToGarmentCanvas: designToGarmentCanvasForOverlay,
    customGarmentFabricRigViewWarp,
    genericVertexPlotHighlight,
    customPointsBeforeFabricWarp,
    bodyPxPerCm: placement.bodyPxPerCm,
    sleevePxPerCmForMeasure,
    sleevePipelineGeom,
    sleevePipelineGeomMirror,
    sleeveGeomBeforeSleeveFixDebug,
    sleeveGeomBeforeSleeveFixDebugRight,
    canvasYGradeScale,
    lengthGeomBeforeLengthMeshDebug,
    lengthMeshSkipReason,
    animatingCustomSizeBlend,
    sleeveMeasureDefinitionDebug,
  });

  return {
    customPathDs,
    customPathStrokeDasharrays,
    customPathStrokeWidths,
    customPathStrokes,
    customRigPathDs,
    shoulderDebug,
    garmentOverlay,
    rigLandmarksDebug,
  };
}
