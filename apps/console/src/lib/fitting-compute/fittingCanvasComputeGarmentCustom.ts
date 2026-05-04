import type { BodyModelVariant } from "@/app/(main)/development/fitting/lib/bodyModelVariant";
import { BODY_CX, REF_HEIGHT_CM } from "@/app/(main)/development/fitting/lib/constants";
import { gridRigVectorPointToBodyTemplate } from "@/app/(main)/development/fitting/lib/gridModelRigExtract";
import { lineArtVerificationSvgPointToBodyTemplate } from "@/app/(main)/development/fitting/lib/modelDataVerification";
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
  MeasureOverlayData,
  ShoulderDebug,
} from "@/app/(main)/development/fitting/lib/types";
import { getAllPathPoints } from "@/app/(main)/development/fitting/lib/fittingContourUtils";
import { getPathPoints, interpolatePath, tPath } from "@/app/(main)/development/fitting/lib/pathUtils";
import { bboxCenterXFromPathDs, bboxCenterXFromPoints } from "./fittingCanvasComputeGarmentCustomBbox";

function mergeGradingV4PathLayersForCompute(data: CustomGarmentData): {
  merged: CustomGarmentData;
  gradingV4BehindBodyPathCount: number;
} {
  const bb = data.gradingV4BehindBody;
  const nb = bb?.pathDs.length ?? 0;
  if (nb === 0 || bb == null) {
    return { merged: data, gradingV4BehindBodyPathCount: 0 };
  }
  const nf = data.pathDs.length;
  const take = <T>(arr: (T | undefined)[] | undefined, len: number): (T | undefined)[] =>
    Array.from({ length: len }, (_, i) => arr?.[i]);
  return {
    gradingV4BehindBodyPathCount: nb,
    merged: {
      ...data,
      pathDs: [...bb.pathDs, ...data.pathDs],
      pathStrokeDasharrays: [...take(bb.pathStrokeDasharrays, nb), ...take(data.pathStrokeDasharrays, nf)],
      pathStrokeWidths: [...take(bb.pathStrokeWidths, nb), ...take(data.pathStrokeWidths, nf)],
      pathStrokes: [...take(bb.pathStrokes, nb), ...take(data.pathStrokes, nf)],
      pathFills: [...take(bb.pathFills, nb), ...take(data.pathFills, nf)],
    },
  };
}

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
  bodyShoulderContour: [number, number][];
  /** `lineArtVerification` / `gridSvgBody` ではアップロード SVG が 391/389×518。リグロック写像は mv_model 3391×6431 と別 */
  bodyModelVariant?: BodyModelVariant;
};

export function computeCustomGarmentBranch(
  ctx: CustomGarmentBranchContext
): {
  customPathDs: string[];
  /** `customPathDs` と同じ長さ。元 SVG の破線・線幅・stroke 色 */
  customPathStrokeDasharrays: (string | undefined)[];
  customPathStrokeWidths: (number | undefined)[];
  customPathStrokes: (string | undefined)[];
  customPathFills: (string | undefined)[];
  customRigPathDs: string[];
  shoulderDebug: ShoulderDebug;
  garmentOverlay: MeasureOverlayData["garment"];
  rigLandmarksDebug: FittingCanvasRigLandmarksDebug;
  /** Grading v4: 背面 path 本数（`customPathDs` の先頭からこの数） */
  gradingV4BehindBodyPathCount: number;
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
    bodyShoulderContour,
    bodyModelVariant,
  } = ctx;

  const placeDesignToTemplate =
    bodyModelVariant === "lineArtVerification"
      ? lineArtVerificationSvgPointToBodyTemplate
      : bodyModelVariant === "gridSvgBody"
        ? gridRigVectorPointToBodyTemplate
        : scaleModelViewToBodyTemplate;

  const rigLockTransformOpts = {
    placementLockToModelRig: true as const,
    placeDesignToBodyWhenRigLocked: placeDesignToTemplate,
  };

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
      customPathFills: [],
      customRigPathDs: [],
      gradingV4BehindBodyPathCount: 0,
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
  };

  const { merged: cgPaths, gradingV4BehindBodyPathCount } = mergeGradingV4PathLayersForCompute(customGarmentData);
  // #region agent log
  if (typeof fetch !== "undefined" && customGarmentData.presetId === "gradingV4") {
    fetch("http://127.0.0.1:7468/ingest/8ae11b2e-0353-49f9-add8-94485bd038d3", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "47077e" },
      body: JSON.stringify({
        sessionId: "47077e",
        runId: "pre",
        hypothesisId: "H2-layer",
        location: "fittingCanvasComputeGarmentCustom.ts:afterMergeGradingLayers",
        message: "merge grading layers",
        data: {
          behindBodyPathCount: gradingV4BehindBodyPathCount,
          mergedPathDsN: cgPaths.pathDs.length,
          rawBehindN: customGarmentData.gradingV4BehindBody?.pathDs?.length ?? 0,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }
  // #endregion
  const customAllOutline = getAllPathPoints(cgPaths.pathDs);
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
  let customPathFills: (string | undefined)[] = [];

  if (
    fromCustomGarmentData &&
    toCustomGarmentData &&
    (() => {
      const a = mergeGradingV4PathLayersForCompute(fromCustomGarmentData);
      const b = mergeGradingV4PathLayersForCompute(toCustomGarmentData);
      if (a.gradingV4BehindBodyPathCount !== b.gradingV4BehindBodyPathCount) return false;
      if (a.merged.pathDs.length !== b.merged.pathDs.length) return false;
      if (
        fromCustomGarmentData.presetId === "gradingV4" &&
        toCustomGarmentData.presetId === "gradingV4"
      ) {
        return true;
      }
      return pathDsContentEqual(a.merged.pathDs, b.merged.pathDs);
    })() &&
    animProgress < 1 &&
    placementLockToModelRigFor(fromCustomGarmentData) &&
    placementLockToModelRigFor(toCustomGarmentData)
  ) {
    const fromLayers = mergeGradingV4PathLayersForCompute(fromCustomGarmentData);
    const toLayers = mergeGradingV4PathLayersForCompute(toCustomGarmentData);
    const fromC = fromCustomGarmentData.landmarks;
    const toC = toCustomGarmentData.landmarks;
    const fromRlm = inferLandmarksFromRigPaths(fromCustomGarmentData.debugRigPathDs!)!;
    const toRlm = inferLandmarksFromRigPaths(toCustomGarmentData.debugRigPathDs!)!;
    const shoulderYFrom = fromRlm.shoulderY;
    const shoulderYTo = toRlm.shoulderY;
    const fromMerged = {
      ...fromLayers.merged,
      landmarks: { ...fromC, ...fromRlm, shoulderY: fromRlm.shoulderY, hemY: fromRlm.hemY },
    };
    const toMerged = {
      ...toLayers.merged,
      landmarks: { ...toC, ...toRlm, shoulderY: toRlm.shoulderY, hemY: toRlm.hemY },
    };
    const fromOut = buildCustomTransformedPathsWithVertexPlots(
      fromMerged,
      REF_HEIGHT_CM,
      weight,
      shoulderYFrom,
      rigLockTransformOpts
    );
    const toOut = buildCustomTransformedPathsWithVertexPlots(toMerged, REF_HEIGHT_CM, weight, shoulderYTo, rigLockTransformOpts);
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
    customPathFills = fromOut.pathDs.map((_, i) =>
      t < 0.5 ? fromOut.pathFills[i] : toOut.pathFills[i]
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
      { ...cgPaths, landmarks: mergedLandmarks },
      transformHeightCmForCustomPaths,
      weight,
      shoulderSeamY,
      rigLockTransformOpts
    );
    customPathDs = transformed.pathDs;
    customPoints = transformed.vertexPlotsBodySpace;
    customPathStrokeDasharrays = transformed.pathStrokeDasharrays;
    customPathStrokeWidths = transformed.pathStrokeWidths;
    customPathStrokes = transformed.pathStrokes;
    customPathFills = transformed.pathFills;
  }

  /**
   * リグロック時: ワープ前にテンプレ X をシフトして体の中心に寄せる。
   * 頂点「平均」X は片側に点が密だと寄り、右（左）に寄せ過ぎるため、服は bbox 中心、脊髄は path0 の bbox 中心。
   * 脊髄が取れないときは BODY_CX をターゲットにする。
   * シフト量の garment 側は `debugRigPathDs` を place した bbox 中心（無ければ服 path）に固定し、右左への寄せ過ぎを防ぐ。
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

  customPathDs = customPathDs.map((d) => tPath(d, customGarmentFabricRigViewWarp));
  customRigPathDs = customRigPathDs.map((d, idx) => tPath(d, rigTemplateToRigViewForGarmentPath(idx)));
  customPoints = customPoints.map(([x, y]) => customGarmentFabricRigViewWarp(x, y));

  /**
   * 同一 path のサイズのみ補間するとき true（オーバーレイデバッグ用）。
   */
  const animatingCustomSizeBlend =
    fromCustomGarmentData != null &&
    toCustomGarmentData != null &&
    pathDsContentEqual(fromCustomGarmentData.pathDs, toCustomGarmentData.pathDs) &&
    animProgress < 1;

  const { garmentOverlay, shoulderDebug } = assembleCustomGarmentOverlayAndShoulderDebug({
    customGarmentData,
    customPoints,
    customAllOutline,
    bodyShoulderContour,
    c,
    rigLm,
    useRigLandmarksForPlacement,
    hasGarmentRig: true,
    shoulderSeamY,
    placeDesignToTemplate,
    designToGarmentCanvas,
    customGarmentFabricRigViewWarp,
    bodyPxPerCm: placement.bodyPxPerCm,
    animatingCustomSizeBlend,
  });

  return {
    customPathDs,
    customPathStrokeDasharrays,
    customPathStrokeWidths,
    customPathStrokes,
    customPathFills,
    customRigPathDs,
    gradingV4BehindBodyPathCount,
    shoulderDebug,
    garmentOverlay,
    rigLandmarksDebug,
  };
}
